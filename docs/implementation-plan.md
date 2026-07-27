# Implementierungsplan — MVP

> Der verbindliche, sequenzierte Plan für die Umsetzung. Jedes Arbeitspaket (WP)
> hat einen Branch-Namen, konkrete Schritte und **Abnahmekriterien** („Fertig, wenn …").
> Reihenfolge einhalten: WP-1 → WP-6. Scope-Definition: [`mvp-scope.md`](mvp-scope.md).

**Konventionen:** Conventional Commits mit Scopes `gaeb · lv · positions · db · api ·
classify · frontend`. Trunk-based, kurzlebige Feature-Branches. Vor jedem WP prüfen,
ob der passende Branch aktiv ist; auf `main` nur hinweisen, keinen Branch selbst anlegen.

---

## WP-1 · DB quellen-agnostisch machen  · `feat(db)`

**Ziel:** Der Schreibweg in die DB ist nicht mehr GAEB-geformt. Der Parser produziert
ein neutrales `LVDraft`; eine einzige `persist_lv(project_id, draft)` schreibt es weg.

Schritte:
1. `SourceType`-Enum (`GAEB | MANUAL | EXCEL`) + Feld `source_type` und `source_metadata`
   (JSONB) auf `LV`. `gaeb_version` nach `source_metadata` verschieben.
2. Feld `attributes` (JSONB, Default `{}`) auf `Position`.
3. Neutrales Schreibmodell `LVDraft / LotDraft / SectionDraft / PositionDraft`
   (Pydantic, in `app/schemas/lv_draft.py`) — **ohne** GAEB-Begriffe.
4. `LVRepository.persist_lv` nimmt künftig `LVDraft` statt `ParsedLV`; das Repository
   importiert **nichts** aus `app.adapters` oder `pyGAEB` mehr.
5. Mapper `ParsedLV → LVDraft` im `GAEBImportService` (oder `app/services/mapping.py`).
6. Alembic-Migration für die neuen Spalten.
7. Tests anpassen: bestehende GAEB-Unit-/Integrationstests laufen über den neuen Pfad.

**Fertig, wenn:**
- `pytest` grün, Coverage ≥ 80 %.
- Import eines Fixtures schreibt `source_type='GAEB'` und `source_metadata.gaeb_version`.
- Re-Import ist idempotent (OZ), gesetzte `assignee_id` bleibt erhalten.
- `grep -R "pygaeb\|Parsed" app/repositories/` liefert nichts.

---

## WP-2 · Klassifizierung hinter austauschbarer Schnittstelle  · `feat(classify)`

**Ziel:** Merkmale aus Kurz-/Langtext **mehrstufig** erzeugen und in `attributes`
ablegen — hinter `ClassifierProtocol` (Signatur bleibt stabil, WP-7/LLM bleibt ohne
Umbau einhängbar). Neu gegenüber der ursprünglichen Fassung: die Klassifizierung
entscheidet zuerst, ob eine Position überhaupt ein physisches Bauteil beschreibt,
erkennt danach Bauteiltyp und Gewerk/Material getrennt, und delegiert die eigentliche
Eigenschafts-Extraktion an ein **Ruleset pro (Bauteiltyp, Gewerk)-Kombination** — neue
Gewerke kommen als neues Ruleset hinzu, ohne den Klassifizierer selbst umzubauen.
Design: [`architecture/backend.md`](architecture/backend.md#klassifizierung-wp-2--austauschbar-regel--llm-mehrstufig-erweiterbar).

Schritte:
1. Paket `app/services/classification/` mit `base.py`: `ClassifierProtocol`,
   `ClassifierInput`, `ClassificationResult` (`attributes` + `meta`) — Protocol-Signatur
   unverändert gegenüber der ursprünglichen Planung.
2. **Stufe 0 (Positionsart):** Bauteil vs. Nicht-Bauteil (`personal`, `planung`,
   `baustelleneinrichtung`, `nebenleistung`, `sonstige`) anhand Stichworten/Einheit
   (z. B. `Std`, `psch`, „Baustelleneinrichtung", „Bauleitung"). Ergebnis:
   `attributes.positionsart`. Nicht-Bauteil-Positionen bekommen ein eigenes,
   kleineres Eigenschaftsschema (kein `beton`/`tragend`) über eigene Rulesets
   (`PersonalRuleset`, `PlanungRuleset`, `BaustelleneinrichtungRuleset`, …).
3. **Stufe 1 (nur `positionsart="bauteil"`):** Bauteiltyp-Erkennung (`Wand`, `Decke`,
   `Fundament`, … — kleines, erweiterbares Vokabular) → `attributes.bauteiltyp`.
4. **Stufe 2 (nur Bauteil):** Gewerk-/Material-Erkennung (`Ortbeton`, `Fertigteil`,
   `Mauerwerk`, `Holzbau`, `Stahlbau`, …) → `attributes.gewerk`. Ausrichtung an
   STLB-Bau-Leistungsbereichen ist das Ziel; die LB-Nummern-Zuordnung ist **offen und
   vor Umsetzung zu verifizieren** (nicht erfinden, siehe
   [`domain/README.md`](domain/README.md)) — MVP startet mit Freitext-Gewerk-Label,
   LB-Code als optionales Zusatzfeld sobald verifiziert.
5. **Ruleset-Registry** (`app/services/classification/rulesets/`): `PropertyRuleset`-
   Protocol, ein Ruleset je (Bauteiltyp, Gewerk) extrahiert die für diese Kombination
   relevanten Eigenschaften (z. B. Ortbeton-Wand: Betongüte `C\d\d/\d\d`,
   Expositionsklassen `X[CDFSA]\d`, tragend/nichttragend, Maße, Stichworte). Eine
   Registry löst `(bauteiltyp, gewerk) → Ruleset` auf; fehlt ein Ruleset für die
   Kombination, greift ein generischer Fallback-Extraktor (nur Maße/Stichworte,
   **kein Fehler**) — der Mechanismus, über den neue Gewerke inkrementell
   nachgezogen werden, ohne bestehende Ergebnisse zu verändern.
6. `llm.py`-Platzhalter (`NotImplementedError`, Slot für WP-7) unverändert.
7. Factory `get_classifier()` + `settings.CLASSIFIER` (`rule | llm`, Default `rule`)
   unverändert.
8. Klassifizierung weiterhin als Schritt über `LVDraft` **vor** `persist_lv`;
   `_meta` (`classifier`, `ruleset`, `version`, `confidence`, `at`) in `attributes`.
9. `ReclassifyService.reclassify(lv_id)`: persistierte Positionen → `ClassifierInput`
   → aktiver Classifier → nur `attributes` aktualisieren (kein Neu-Import, Vertrag
   unverändert).
10. Unit-Tests: je Stufe, je registriertem Ruleset, Fallback-Pfad (Bauteiltyp/Gewerk
    ohne Ruleset liefert Basis-Attribute statt Fehler), Nicht-Bauteil-Pfad.

**Fertig, wenn:**
- `02.010` (Ortbeton-Wand) → `positionsart:"bauteil"`, `bauteiltyp:"Wand"`,
  `gewerk:"Ortbeton"`, `beton:"C30/37"`, `expo:["XC2","XD1"]`, `tragend:true`,
  `_meta.classifier="rule"`, `_meta.ruleset="ortbeton_wand"`.
- Eine Personal-/Baustelleneinrichtungs-Position → `positionsart` entsprechend gesetzt,
  **keine** `beton`/`tragend`-Keys.
- Eine Bauteil-Position mit (noch) unbekannter Bauteiltyp/Gewerk-Kombination erhält
  Basis-Attribute über den Fallback-Extraktor, **kein** Fehler.
- Positionen ohne erkennbare Merkmale: leere Facetten ohne Fehler.
- Der Aufrufer importiert nur `ClassifierProtocol`/`get_classifier` — nie
  `RuleBasedClassifier` oder ein konkretes Ruleset direkt.
- `ReclassifyService` aktualisiert `attributes` ohne LV-Struktur oder `assignee_id`
  anzufassen.
- `pytest` grün, Coverage ≥ 80 %.

Für die MVP-Abnahme genügt ein initiales Ruleset-Set (z. B. Ortbeton + Fertigteil für
Wand/Decke/Fundament, plus die Nicht-Bauteil-Rulesets); weitere Gewerke/Bauteiltypen
werden inkrementell nachgezogen, siehe [`mvp-scope.md`](mvp-scope.md).

---

## WP-3 · Read-API für den Viewer  · `feat(api)`

**Ziel:** Endpunkte, die Tree, Bubble-Graph, Tabelle und Eigenschaften speisen.
Response-Contracts: siehe [`architecture/backend.md`](architecture/backend.md).

Endpunkte:
- `POST /api/projects/{project_id}/lv:import` — Multipart-GAEB-Upload (vorhanden, anpassen).
- `GET  /api/projects/{project_id}/tree` — **rekursiver** Knotenbaum (`LVNode`) für Tree
  **und** Graph; enthält pro Knoten `kind`, `code`, `label`, Aggregatwerte
  (Positions-Anzahl, Gesamtpreis) und auf Positionsebene die Positionsdaten inkl. `attributes`.
- `GET  /api/positions/{position_id}` — Detail (Kurz-/Langtext, `attributes`, Zuständigkeit).
- `PATCH /api/positions/{position_id}` — nur `assignee_id` setzen (Status bleibt read-only).

**Fertig, wenn:**
- `httpx`-API-Tests grün.
- `/tree` liefert verschachtelte Knoten; Aggregatwerte stimmen mit den Positionen überein.
- `PATCH …/assignee` persistiert und ist nach erneutem `GET` sichtbar.

---

## WP-4 · Frontend-Gerüst + Datenschicht  · `feat(frontend)`

**Ziel:** Vite-App in `frontend/`, die eine **real importierte** LV lädt und Tree +
Tabelle + Suche + Filter rendert (noch ohne Graph). Struktur: siehe
[`architecture/frontend.md`](architecture/frontend.md).

Schritte:
1. Vite + React + TypeScript + Tailwind in `frontend/`; `vite.config.ts` proxyt
   `/api` → FastAPI.
2. `src/types/lv.ts`, `src/api/client.ts`, `src/api/lv.ts` (typed fetch).
3. Port aus `lv-main.jsx`: `Tree`, `PositionsTable`, `TopBar`, `FilterStrip`,
   `FacetButton`/`RangeButton`, `Highlighted`, `Status`, `Member`.
4. `src/lib/matchPos.ts` — Filter-/Suchlogik 1:1 aus dem Design (single source of truth).
5. Fixture-Daten und `localStorage` für Fachdaten entfernen; Daten kommen aus der API.

**Fertig, wenn:**
- App lädt eine importierte LV und zeigt Tree + Tabelle.
- Suche und alle Facetten-Filter (inkl. Hervorheben/Ausblenden) funktionieren.
- `grep -R "window.LV\|localStorage" frontend/src` liefert nichts für Fachdaten.

---

## WP-5 · Bubble-Graph portieren  · `feat(frontend)`  · **Kern**

**Ziel:** Die Graph-Engine aus `lv-graph.jsx` als Mitte-Modus, gespeist aus demselben
`/tree`. Vergabepaket-Kanten entfallen (out of scope).

Schritte:
1. Engine nach `src/lib/graph/` (Baumaufbau, `layoutRadial`, Walk, Klassifizierung der
   Kinder) und Komponenten nach `src/components/graph/`.
2. An `LVNode` aus der API binden (kein Fixture, kein Demo-Lot im MVP-Default).
3. Größenmodi (Anzahl / Gesamtpreis / Einheitlich), Zoom + LOD, Culling, Cluster übernehmen.
4. Drill-in: Klick auf Abschnittsknoten → Tabelle des Abschnitts; Umschalter Graph ⇄ Tabelle.
5. `nodeVpIds`/Vergabepaket-Overlays entfernen oder hinter Feature-Flag stummschalten.

**Fertig, wenn:**
- Graph rendert die importierte LV; Zoom/LOD/Culling funktionieren.
- Größenmodi schalten korrekt um; Klick drillt in Abschnitt → Tabelle.
- Keine Referenzen mehr auf Vergabe/`positionPakete` im aktiven Pfad.

---

## WP-6 · Zuständigkeit + Feinschliff  · `feat(positions)` / `feat(frontend)`

**Ziel:** Bearbeiter-Zuweisung end-to-end, Eigenschaften-Panel, letzter Schliff.

Schritte:
1. `AssigneePicker` schreibt via `PATCH …/assignee`; optimistisches UI-Update.
2. Eigenschaften-Panel rechts: Langtext mit `Highlighted`, Attribute, Zuständigkeit.
3. Zuständigkeit als Filter-Facette an die echten Daten binden.

**Fertig, wenn:**
- Zuweisung überlebt Reload (kommt aus dem Backend).
- Panel zeigt klassifizierte Merkmale der gewählten Position.

---

## Abhängigkeiten

```
WP-1 ─► WP-2 ─► WP-3 ─► WP-4 ─► WP-5
                    └─────────► WP-6
```

WP-1 ist Fundament für alles. WP-4 und WP-6 hängen an WP-3. WP-5 baut auf WP-4 auf.

---

## Post-MVP (vorbereitet, nicht Teil des Release)

### WP-7 · LLM-Klassifizierer  · `feat(classify)`
Der Slot ist durch WP-2 vorhanden. Anbindung, wenn das MVP validiert ist:
`LLMClassifier` implementiert `ClassifierProtocol`, batched, `meta.confidence` je Ergebnis;
Aktivierung über `settings.CLASSIFIER=llm`; bestehende LVs über `ReclassifyService` neu
klassifizieren — kein GAEB-Neu-Import nötig. Command: `.claude/commands/future-llm-classifier.md`.
Vor der Umsetzung offen: Modellwahl, Prompt-/Schema-Design, Kosten-/Latenz-Budget,
Umgang mit niedriger Confidence (Regel-Fallback).
