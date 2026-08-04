# Implementierungsplan — MVP (Frontend-only)

> Der verbindliche, sequenzierte Plan für die Umsetzung. Jedes Arbeitspaket (WP)
> hat einen Branch-Namen, konkrete Schritte und **Abnahmekriterien** („Fertig, wenn …").
> Reihenfolge einhalten: WP-A → WP-G. Scope-Definition: [`mvp-scope.md`](mvp-scope.md).

**Konventionen:** Conventional Commits mit Scopes `gaeb · classify · tree · viewer ·
graph · frontend`. Trunk-based, kurzlebige Feature-Branches. Vor jedem WP prüfen, ob
der passende Branch aktiv ist; auf `main` nur hinweisen, keinen Branch selbst anlegen.

> **Hinweis:** Die frühere Backend-Planung (WP-1…6, WBSNode, LLM-Klassifizierer) ist
> auf dem Branch `archive/backend-mvp` gesichert. Dieser Plan ersetzt sie vollständig
> für das frontend-only MVP.

## Stand

| WP | Status |
|---|---|
| WP-A · Frontend-Gerüst | ✅ umgesetzt |
| WP-B · GAEB-Parser | ✅ umgesetzt |
| WP-C · Klassifizierung | ✅ umgesetzt (`src/lib/classify/`) |
| WP-D · In-Memory-Baum | ✅ umgesetzt (`src/lib/tree/`, `src/state/`) |
| WP-E · Viewer: Tree + Tabelle + Suche + Filter | ✅ umgesetzt (`src/components/`, `src/lib/matchPos.ts`) |
| WP-F · Bubble-Graph | ✅ umgesetzt (`src/lib/graph/`, `src/components/graph/`) |
| WP-G · Eigenschaften-Panel + Static-Deploy | ✅ umgesetzt |

Offen bleibt bewusst die inhaltliche Pflege der `keywords`-Spalte in
[`domain/reference/stlb-bau-leistungsbereiche.csv`](domain/reference/stlb-bau-leistungsbereiche.csv)
— ohne sie greift Stufe 0 nur selten und die Positionen laufen über den
Heuristik-Fallback (kein Fehler, siehe
[`domain/README.md`](domain/README.md#stlb-bau-leistungsbereiche-als-primäre-klassifizierungsquelle-wp-2)).

---

## WP-A · Frontend-Gerüst  · `feat(frontend)`

**Ziel:** Vite + React + TypeScript + Tailwind in `frontend/`, lauffähig, ohne
Fachlogik. Grundlage für alle folgenden WPs.

Schritte:
1. `frontend/` mit Vite (React-TS-Template) + Tailwind aufsetzen.
2. `src/types/lvDraft.ts`, `src/types/lvNode.ts` — TS-Äquivalente der bisherigen
   Pydantic-Modelle (`LVDraft`/`LotDraft`/`SectionDraft`/`PositionDraft`, `LVNode`),
   siehe [`architecture/data-model.md`](architecture/data-model.md).
3. `src/pages/ViewerPage.tsx` — 3-Spalten-Layout (leer/Platzhalter), `src/App.tsx`,
   `src/main.tsx`.
4. `vitest` + `@testing-library/react` als Dev-Dependencies, ein Smoke-Test.
5. ESLint + Prettier-Konfiguration (wird vom Claude-Code-Hook genutzt).

**Fertig, wenn:**
- `npm run dev` startet die App lokal.
- `npm test` läuft grün (Smoke-Test).
- `npm run build` erzeugt ein statisches Bundle ohne Fehler.

---

## WP-B · GAEB-Parser (TS)  · `feat(gaeb)`

**Ziel:** GAEB DA XML (2.0–3.3) im Browser parsen, ohne Server. Ersetzt den
`PyGAEBAdapter` funktional, portiert dessen Feldabdeckung.

Schritte:
1. `src/lib/gaeb/parser.ts`: `GaebParser`-Interface + `XmlGaebParser`-Implementierung
   (DOMParser, kein zusätzliches XML-Package nötig für den Kernpfad; bei Bedarf
   `fast-xml-parser` als Fallback für Edge Cases).
2. Mapping GAEB-Item-Typen → `PositionType` (`Normal`, `LumpSum`, `Alternative`,
   `Eventual`, `BaseSurcharge`, `Supplement`, `Markup`, …) — Referenz: die Mapping-
   Tabelle aus dem archivierten `app/adapters/gaeb_adapter.py`.
3. Exceptions: `GAEBParseError`, `GAEBValidationError`, `GAEBVersionError` — geworfen,
   nicht stillschweigend verschluckt; UI zeigt sie als Fehlermeldung.
4. `mapToLvDraft()`: geparste GAEB-Struktur → `LVDraft` (kein GAEB-Vokabular mehr
   danach).
5. `frontend/tests/fixtures/` mit den bestehenden echten GAEB-XML-Dateien (aus
   `tests/fixtures/` im Repo-Root übernehmen) — Parser-Tests laufen dagegen.

**Fertig, wenn:**
- Alle Fixtures unter `frontend/tests/fixtures/` parsen fehlerfrei zu `LVDraft`.
- Eine Datei mit nicht unterstützter Version wirft `GAEBVersionError`.
- `grep -R "GaebParser\|LVDraft" src/lib/classify src/lib/tree` liefert nichts — der
  Parser bleibt die einzige Stelle mit GAEB-Kenntnis.

---

## WP-C · Klassifizierung (TS)  · `feat(classify)`

**Ziel:** Merkmale aus Kurz-/Langtext **mehrstufig** erzeugen und in `attributes`
ablegen — hinter einem stabilen TS-Interface, analog zum bisherigen
`ClassifierProtocol`. Design: [`architecture/pipeline.md`](architecture/pipeline.md#klassifizierung).

Schritte:
1. `src/lib/classify/types.ts`: `Classifier`-Interface, `ClassifierInput`,
   `ClassificationResult` (`attributes` + `meta`).
2. **Stufe 0 (StlbMatch):** Kurz-/Langtext gegen die Referenztabelle
   [`domain/reference/stlb-bau-leistungsbereiche.csv`](domain/reference/stlb-bau-leistungsbereiche.csv)
   matchen (als statisches Asset geladen, z. B. via `fetch('/stlb-bau.csv')` oder
   Build-Time-Import) → `attributes.gewerk_lb`, `attributes.gewerk`, ggf.
   `attributes.positionsart`. Kein Treffer → Fallback auf Stichwort-/Einheiten-
   Heuristik, kein Fehler.
3. **Stufe 1 (nur `positionsart="bauteil"`):** Bauteiltyp-Erkennung.
4. **Ruleset-Registry** (`src/lib/classify/rulesets/`): ein Modul je (Bauteiltyp,
   `gewerk_lb`), `resolve()` fällt auf `FallbackRuleset` zurück statt zu werfen.
5. `getClassifier()`-Factory; Aufrufer importieren nur das Interface, nie eine
   konkrete Implementierung.
6. Läuft synchron direkt nach dem Parsen, vor `buildTree()`; bei großen LVs im
   Web Worker (siehe WP-E).
7. Unit-Tests: je Stufe, STLB-Match-Treffer **und** Kein-Treffer-Fallback, je
   registriertem Ruleset, Ruleset-Fallback-Pfad, Nicht-Bauteil-Pfad.

**Fertig, wenn:**
- Eine Wand-Position mit Beton-/Stahlbetonarbeiten-LB im Referenzkatalog →
  `positionsart:"bauteil"`, `gewerk_lb`, `gewerk`, `bauteiltyp:"Wand"`, `beton`,
  `expo`, `tragend`, `_meta.classifier="rule"`.
- Solange die Referenz-CSV leer ist: alle Positionen laufen über den
  Heuristik-Fallback, kein Fehler.
- `npm test` grün.

---

## WP-D · In-Memory-Baum  · `feat(tree)`

**Ziel:** `buildTree(draft): LVNode` — reine Funktion, ersetzt den früher geplanten
`/tree`-Endpunkt. Ein Contract, zwei Konsumenten (Tree-Spalte, Bubble-Graph).

Schritte:
1. `src/types/lvNode.ts`: `LVNode` (`id`, `kind`, `code`, `label`, `position_count`,
   `total_price`, `children`, optional `position`).
2. `src/lib/tree/buildTree.ts`: `LVDraft` (nach Klassifizierung) → `LVNode`-Baum,
   Aggregate (`position_count`, `total_price`) bottom-up berechnet.
3. `src/state/viewer.ts` (Context/Reducer): hält den aktuellen `LVNode`-Baum,
   Auswahl, Zoom, aktive Filter — reiner UI-/Session-State, kein `localStorage`.

**Was der Parser aus WP-B liefert** (Annahmen für `buildTree`, verifiziert gegen die
Fixtures in `frontend/tests/fixtures/`):
- `SectionDraft.number` und `PositionDraft.oz` sind bereits **vollständige Pfade**
  (`"001.002"`, `"001.002.0050"`), keine lokalen Teilnummern. Indexpositionen tragen
  den Index als letztes Segment (`"001.001.0010.A"`), damit die OZ eindeutig bleibt —
  `oz` ist deshalb als Knoten-ID brauchbar, muss aber nach `kind` präfixiert werden
  (`section:001.002` vs. `position:001.002.0050`), weil ein namenloser Wrapper-
  Abschnitt dieselbe Nummer tragen kann wie sein Los.
- `LotDraft.number` ist **leer**, wenn die Datei keine Los-Ebene hat (häufigster Fall,
  z. B. die BVBS-Musterdatei). Dann trägt das Los nur ein Label → `LVNode.code` darf
  leer sein, die Tree-Spalte muss auf das Label ausweichen.
- Positionen ohne eigenen LV-Bereich hängen in einem Wrapper-Abschnitt mit
  `label: null` — der Baum bekommt also nie Positionen direkt unter einem Los.
- `unitPrice` ist in x83-Dateien (Angebotsaufforderung) meist `null`; Preise stehen
  erst in x84. `totalPrice` = Σ `quantity × unitPrice` mit `null` als 0 ⇒ der
  Größenmodus „Gesamtpreis" kann für ein ganzes LV 0 sein. Der Graph (WP-F) braucht
  dafür einen Fallback auf „Anzahl" statt Bubbles mit Radius 0.

**Fertig, wenn:**
- Eine geparste + klassifizierte Fixture ergibt einen `LVNode`-Baum mit korrekten
  Aggregatwerten (Stichprobe manuell verifiziert).
- Ein LV ohne Los-Ebene und ein LV mit Los-Ebene (`sample.X83`) ergeben beide einen
  vollständigen Baum ohne verlorene Positionen.

---

## WP-E · Viewer: Tree + Tabelle + Suche + Filter  · `feat(viewer)`

**Ziel:** Tree, Tabelle, Suche, Facetten-Filter rendern eine geladene LV (noch ohne
Graph).

Schritte:
1. Port aus `design/claude-design/lv-main.jsx`: `Tree`, `PositionsTable`, `TopBar`,
   `FilterStrip`, `FacetButton`/`RangeButton`, `Highlighted`, `Status`.
2. `src/lib/matchPos.ts` — Filter-/Suchlogik 1:1 aus dem Design (single source of
   truth), arbeitet auf dem `LVNode`-Baum aus WP-D.
3. Datei-Upload-Komponente (Drag & Drop + Datei-Dialog) → `file.arrayBuffer()` →
   `getGaebParser().parse()` → `mapToLvDraft()` → `classify` → `buildTree` → State.
   Große Dateien: Pipeline in einem Web Worker, damit die UI responsiv bleibt.
4. Fehleranzeige für `GAEBParseError`/`GAEBValidationError`/`GAEBVersionError`.

**Anbindung an den Parser aus WP-B:**
- **Bytes, nicht Text:** `file.arrayBuffer()` verwenden, **nicht** `FileReader.readAsText`.
  Der Parser liest das Encoding aus der XML-Deklaration (GAEB-Exporte sind oft
  ISO-8859-1); vorab als UTF-8 dekodierter Text zerstört Umlaute in Positionstexten.
- Import ausschließlich aus `src/lib/gaeb` (Barrel), nie aus `parser.ts` — die drei
  Exception-Klassen kommen aus derselben Quelle und sind per `instanceof` prüfbar.
- **Korrektur zur ursprünglichen Annahme:** `DOMParser` ist laut HTML-Spezifikation
  nur im Window-Scope definiert und in keinem Browser im Worker verfügbar. Der
  Parser-Schritt bleibt deshalb im Haupt-Thread (nativer XML-Parser, entsprechend
  schnell); in den Worker wandert der rechenintensive Teil — Klassifizierung +
  `buildTree` — über das `structuredClone`-fähige `LVDraft`. Details:
  [`architecture/pipeline.md`](architecture/pipeline.md#wo-der-worker-ansetzt-und-warum-nicht-früher).
- Facette „Positionsart": `positionType` ist `NORMAL | ALTERNATIV | BEDARF |
  ZULAGENPOSITION`; alle vier kommen in `gaeb-xml-beispiel.x83` vor und eignen sich als
  Testfall für den Filter.
- Suche über `longText` trifft auch Unterbeschreibungen (`<SubDescr>`), die der Parser
  an den Langtext der Position anhängt. `shortText` ist nie leer, solange ein Langtext
  existiert (Fallback auf dessen erste Zeile).

**Fertig, wenn:**
- App lädt eine echte GAEB-Datei per Drag & Drop und zeigt Tree + Tabelle.
- Suche und alle Facetten-Filter (inkl. Hervorheben/Ausblenden) funktionieren.
- `grep -R "window.LV\|localStorage" frontend/src` liefert nichts für Fachdaten.
- Eine defekte/nicht unterstützte Datei zeigt eine verständliche Fehlermeldung
  (`unsupported-version.x83` aus den Fixtures als Handprobe).

---

## WP-F · Bubble-Graph  · `feat(graph)`  · **Kern**

**Ziel:** Die Graph-Engine aus `lv-graph.jsx` als Mitte-Modus, gespeist aus demselben
`LVNode`-Baum. Vergabepaket-Kanten entfallen (out of scope).

Schritte:
1. Engine nach `src/lib/graph/` (Baumaufbau, `layoutRadial`, Walk) und Komponenten
   nach `src/components/graph/`.
2. An `LVNode` aus WP-D binden (kein Fixture, kein Demo-Lot im Default-Pfad).
3. Größenmodi (Anzahl / Gesamtpreis / Einheitlich), Zoom + LOD, Culling, Cluster
   übernehmen.
4. Drill-in: Klick auf Abschnittsknoten → Tabelle des Abschnitts; Umschalter
   Graph ⇄ Tabelle.
5. `nodeVpIds`/Vergabepaket-Overlays entfernen.

**Fertig, wenn:**
- Graph rendert eine geladene LV; Zoom/LOD/Culling funktionieren.
- Größenmodi schalten korrekt um; Klick drillt in Abschnitt → Tabelle.
- Eine ~10k-Positionen-Fixture (oder synthetisch generiert) bleibt bei Zoom/Pan
  flüssig (Culling greift).

---

## WP-G · Eigenschaften-Panel + Static-Deploy-Vorbereitung  · `feat(frontend)`

**Ziel:** Eigenschaften-Panel rechts, letzter Schliff, Build ist deploy-fertig für
einen beliebigen statischen Host (Netlify/Vercel/Cloudflare Pages/GitHub Pages).

Schritte:
1. Eigenschaften-Panel rechts: Langtext mit `Highlighted`, Attribute, Einheit/
   Menge/EP.
2. `npm run build` erzeugt ein reines Static-Bundle, keine Server-abhängigen Pfade
   (keine `/api`-Referenzen, kein Proxy nötig).
3. Prüfen: keine Netzwerk-Requests außer dem initialen Laden der App selbst
   (Browser-Devtools-Netzwerk-Tab manuell verifizieren).

**Fertig, wenn:**
- Panel zeigt klassifizierte Merkmale der gewählten Position.
- Das gebaute Bundle läuft von einem beliebigen statischen Host aus, ohne Backend.

---

## Abhängigkeiten

```
WP-A ─► WP-B ─► WP-C ─► WP-D ─► WP-E ─► WP-F ─► WP-G
```
