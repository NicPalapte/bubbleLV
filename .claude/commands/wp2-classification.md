Setze **WP-2 · Klassifizierung hinter austauschbarer Schnittstelle** um.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/backend.md @docs/architecture/data-model.md @docs/mvp-scope.md @docs/domain/README.md @.claude/CLAUDE.md

**Ziel:** Merkmale aus Kurz-/Langtext **mehrstufig** in `Position.attributes` ablegen —
hinter `ClassifierProtocol` (Signatur bleibt stabil, WP-7/LLM bleibt ohne Umbau
einhängbar). Die Klassifizierung matcht den Text zuerst direkt gegen die
**STLB-Bau-Leistungsbereiche (LB)** — das liefert Gewerk (`gewerk_lb` + `gewerk`) und,
für eindeutig nicht-physische LBs (z. B. Baustelleneinrichtung), auch Positionsart in
einem Schritt. Kein LB-Treffer fällt auf die bisherige Stichwort-/Einheiten-Heuristik für
Positionsart zurück. Bei Bauteil-Positionen wird zusätzlich der Bauteiltyp erkannt (ein
LB deckt meist mehrere Bauteiltypen ab), und die eigentliche Eigenschafts-Extraktion
delegiert an ein Ruleset je (Bauteiltyp, `gewerk_lb`) — neue LBs kommen als neues
Ruleset hinzu, ohne den Klassifizierer umzubauen.

**Vorgehen:** Erst kurzer Plan (3–5 Punkte), dann:
1. Paket `app/services/classification/`:
   - `base.py`: `ClassifierProtocol`, `ClassifierInput`, `ClassificationResult`
     (`attributes` + `meta`) — Protocol-Signatur unverändert.
   - `stlb_match.py`: matcht `short_text`/`long_text` gegen die vom Maintainer
     gepflegte Referenztabelle
     [`docs/domain/reference/stlb-bau-leistungsbereiche.csv`](../../docs/domain/reference/stlb-bau-leistungsbereiche.csv)
     (Spalten `lb_nummer`, `lb_bezeichnung`, `positionsart_default`, `keywords`,
     `quelle_version`; beim Start geladen, nicht hartkodiert) →
     `attributes.gewerk_lb`, `attributes.gewerk`, und `attributes.positionsart` sofern
     `positionsart_default` für den LB gesetzt ist. **Kein Treffer** (Katalog leer oder
     Text ohne STLB-Bezug) → Fallback auf `position_kind.py`.
   - `position_kind.py`: Fallback-Erkennung Bauteil vs. Nicht-Bauteil
     (`personal | planung | baustelleneinrichtung | nebenleistung | sonstige`) anhand
     Stichworten/Einheit → `attributes.positionsart`, nur wenn Stufe 0 keinen LB-Treffer
     hatte.
   - `object_type.py`: Bauteiltyp-Erkennung (`Wand`, `Decke`, `Fundament`, … —
     kleines, erweiterbares Vokabular) → `attributes.bauteiltyp`. Läuft nur, wenn
     `positionsart == "bauteil"`.
   - `rulesets/`: `PropertyRuleset`-Protocol + `RulesetRegistry`
     (`(bauteiltyp, gewerk_lb) → Ruleset`); je ein Ruleset-Modul pro Kombination, für
     die der Maintainer bereits eine LB-Zeile in der Referenz-CSV gepflegt hat
     (Betongüte `C\d\d/\d\d`, Expositionsklassen `X[CDFSA]\d`, tragend/nichttragend,
     Maße, Stichworte) plus `fallback.py` (nur Maße/Stichworte, greift wenn kein
     Ruleset registriert ist oder `gewerk_lb` `null` ist — **kein Fehler**) und eigene,
     kleinere Rulesets für Nicht-Bauteil-Positionsarten (`personal.py`, `planung.py`,
     `baustelleneinrichtung.py`, …). Ruleset-Key ist `gewerk_lb` (LB-Nummer), nicht die
     Freitext-Bezeichnung.
   - `rule_based.py`: `RuleBasedClassifier` orchestriert die Stufen (StlbMatch [+
     Positionsart-Fallback] → Bauteiltyp → Ruleset-Registry); `meta.classifier="rule"`,
     `meta.ruleset=<aufgelöster Ruleset-Key oder "fallback">`.
   - `llm.py`: `LLMClassifier`-Platzhalter mit `NotImplementedError` (Slot für WP-7).
   - Factory `get_classifier()` + `settings.CLASSIFIER` (`rule | llm`, Default `rule`).
2. Klassifizierung als Schritt über `LVDraft` **vor** `persist_lv`; `_meta` in `attributes`.
3. `ReclassifyService.reclassify(lv_id)`: persistierte Positionen → `ClassifierInput` →
   aktiver Classifier → nur `attributes` aktualisieren (kein Neu-Import).
4. Unit-Tests: STLB-Match-Treffer, Kein-Treffer-Fallback, je Stufe, je registriertem
   Ruleset, Ruleset-Fallback-Pfad (unbekannte Bauteiltyp/LB-Kombination liefert
   Basis-Attribute statt Fehler), Nicht-Bauteil-Pfad. Classifier über das Protocol
   mockbar; `stlb_match.py` testbar mit einer kleinen Test-CSV statt der echten
   Referenzdatei.

**Constraints:** Aufrufer außerhalb von `app/services/classification/` importieren nur
`ClassifierProtocol`/`get_classifier()` — nie `RuleBasedClassifier`, die
`RulesetRegistry` oder ein konkretes Ruleset direkt. Klassifizierung greift für jede
`source_type`. `async`-Signatur (LLM ist I/O-gebunden). STLB-Bau-LB-Nummern **nicht
erfinden** — sie kommen ausschließlich aus
[`docs/domain/reference/stlb-bau-leistungsbereiche.csv`](../../docs/domain/reference/stlb-bau-leistungsbereiche.csv)
(vom Maintainer zu befüllen, siehe [`domain/README.md`](../../docs/domain/README.md)).
Solange diese Datei nur die Kopfzeile enthält, matcht Stufe 0 nie — das ist erwarteter
MVP-Zustand, kein Fehler; **keine Platzhalter-LB-Nummern ins Ruleset-Vokabular
schreiben**, um die Tabelle vorzeitig "voll" aussehen zu lassen.

**Definition of Done:**
- Mit befüllter Referenz-CSV: `02.010` (Wand im gematchten LB) →
  `positionsart:"bauteil"`, `gewerk_lb:"<LB-Nummer>"`, `gewerk:"<LB-Bezeichnung>"`,
  `bauteiltyp:"Wand"`, `beton:"C30/37"`, `expo:["XC2","XD1"]`, `tragend:true`,
  `_meta.classifier="rule"`, `_meta.ruleset="<gewerk_lb>_wand"`.
- Mit leerer Referenz-CSV (Kopfzeile only): jede Position läuft über den
  Positionsart-Fallback, `gewerk`/`gewerk_lb` bleiben `null`, **kein Fehler**.
- Eine Personal-/Baustelleneinrichtungs-Position → passende `positionsart` (aus
  LB-Treffer oder Fallback), **keine** `beton`/`tragend`-Keys.
- Eine Bauteil-Position mit unbekannter Bauteiltyp/LB-Kombination → Basis-Attribute
  über den Fallback-Extraktor, kein Fehler.
- Positionen ohne Merkmale: leere Facetten, kein Fehler.
- `ReclassifyService` lässt LV-Struktur und `assignee_id` unangetastet.
- `pytest` grün, Coverage ≥ 80 %.

Commit: `feat(classify): mehrstufige regelbasierte Klassifizierung hinter ClassifierProtocol`
