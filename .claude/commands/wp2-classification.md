Setze **WP-2 · Klassifizierung hinter austauschbarer Schnittstelle** um.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/backend.md @docs/architecture/data-model.md @docs/mvp-scope.md @docs/domain/README.md @.claude/CLAUDE.md

**Ziel:** Merkmale aus Kurz-/Langtext **mehrstufig** in `Position.attributes` ablegen —
hinter `ClassifierProtocol` (Signatur bleibt stabil, WP-7/LLM bleibt ohne Umbau
einhängbar). Die Klassifizierung entscheidet zuerst Bauteil vs. Nicht-Bauteil, erkennt
bei Bauteil-Positionen Bauteiltyp und Gewerk/Material getrennt, und delegiert die
eigentliche Eigenschafts-Extraktion an ein Ruleset je (Bauteiltyp, Gewerk) — neue
Gewerke kommen als neues Ruleset hinzu, ohne den Klassifizierer umzubauen.

**Vorgehen:** Erst kurzer Plan (3–5 Punkte), dann:
1. Paket `app/services/classification/`:
   - `base.py`: `ClassifierProtocol`, `ClassifierInput`, `ClassificationResult`
     (`attributes` + `meta`) — Protocol-Signatur unverändert.
   - `position_kind.py`: erkennt Bauteil vs. Nicht-Bauteil
     (`personal | planung | baustelleneinrichtung | nebenleistung | sonstige`) anhand
     Stichworten/Einheit → `attributes.positionsart`.
   - `object_type.py`: Bauteiltyp-Erkennung (`Wand`, `Decke`, `Fundament`, … —
     kleines, erweiterbares Vokabular) → `attributes.bauteiltyp`. Läuft nur, wenn
     `positionsart == "bauteil"`.
   - `work_type.py`: Gewerk-/Material-Erkennung (`Ortbeton`, `Fertigteil`,
     `Mauerwerk`, `Holzbau`, `Stahlbau`, …) → `attributes.gewerk`. Läuft nur bei
     Bauteil-Positionen.
   - `rulesets/`: `PropertyRuleset`-Protocol + `RulesetRegistry`
     (`(bauteiltyp, gewerk) → Ruleset`); je ein Ruleset-Modul pro Kombination
     (initial: Ortbeton × {Wand, Decke, Fundament} — Betongüte `C\d\d/\d\d`,
     Expositionsklassen `X[CDFSA]\d`, tragend/nichttragend, Maße, Stichworte) plus
     `fallback.py` (nur Maße/Stichworte, greift wenn kein Ruleset registriert ist —
     **kein Fehler**) und eigene, kleinere Rulesets für Nicht-Bauteil-Positionsarten
     (`personal.py`, `planung.py`, `baustelleneinrichtung.py`, …).
   - `rule_based.py`: `RuleBasedClassifier` orchestriert die Stufen 0–3 (Positionsart
     → Bauteiltyp → Gewerk → Ruleset-Registry); `meta.classifier="rule"`,
     `meta.ruleset=<aufgelöster Ruleset-Key oder "fallback">`.
   - `llm.py`: `LLMClassifier`-Platzhalter mit `NotImplementedError` (Slot für WP-7).
   - Factory `get_classifier()` + `settings.CLASSIFIER` (`rule | llm`, Default `rule`).
2. Klassifizierung als Schritt über `LVDraft` **vor** `persist_lv`; `_meta` in `attributes`.
3. `ReclassifyService.reclassify(lv_id)`: persistierte Positionen → `ClassifierInput` →
   aktiver Classifier → nur `attributes` aktualisieren (kein Neu-Import).
4. Unit-Tests: je Stufe, je registriertem Ruleset, Fallback-Pfad (unbekannte
   Bauteiltyp/Gewerk-Kombination liefert Basis-Attribute statt Fehler),
   Nicht-Bauteil-Pfad. Classifier über das Protocol mockbar.

**Constraints:** Aufrufer außerhalb von `app/services/classification/` importieren nur
`ClassifierProtocol`/`get_classifier()` — nie `RuleBasedClassifier`, die
`RulesetRegistry` oder ein konkretes Ruleset direkt. Klassifizierung greift für jede
`source_type`. `async`-Signatur (LLM ist I/O-gebunden). STLB-Bau-LB-Nummern für
`gewerk` **nicht erfinden** — offene Zuordnung, siehe
[`domain/README.md`](../../docs/domain/README.md); MVP nutzt ein Freitext-Gewerk-Label
ohne Normbezug.

**Definition of Done:**
- `02.010` (Ortbeton-Wand) → `positionsart:"bauteil"`, `bauteiltyp:"Wand"`,
  `gewerk:"Ortbeton"`, `beton:"C30/37"`, `expo:["XC2","XD1"]`, `tragend:true`,
  `_meta.classifier="rule"`, `_meta.ruleset="ortbeton_wand"`.
- Eine Personal-/Baustelleneinrichtungs-Position → passende `positionsart`, **keine**
  `beton`/`tragend`-Keys.
- Eine Bauteil-Position mit unbekannter Bauteiltyp/Gewerk-Kombination → Basis-Attribute
  über den Fallback-Extraktor, kein Fehler.
- Positionen ohne Merkmale: leere Facetten, kein Fehler.
- `ReclassifyService` lässt LV-Struktur und `assignee_id` unangetastet.
- `pytest` grün, Coverage ≥ 80 %.

Commit: `feat(classify): mehrstufige regelbasierte Klassifizierung hinter ClassifierProtocol`
