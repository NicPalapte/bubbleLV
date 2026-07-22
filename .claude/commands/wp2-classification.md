Setze **WP-2 · Klassifizierung hinter austauschbarer Schnittstelle** um.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/backend.md @docs/architecture/data-model.md @.claude/CLAUDE.md

**Ziel:** Merkmale aus Kurz-/Langtext in `Position.attributes` ablegen — hinter einem
`ClassifierProtocol`, sodass später ein LLM-Klassifizierer ohne Umbau eingehängt werden kann.

**Vorgehen:** Erst kurzer Plan (3–5 Punkte), dann:
1. Paket `app/services/classification/`:
   - `base.py`: `ClassifierProtocol`, `ClassifierInput`, `ClassificationResult` (`attributes` + `meta`).
   - `rule_based.py`: `RuleBasedClassifier` (Regex/Heuristik) — Betongüte `C\d\d/\d\d`,
     Expositionsklassen `X[CDFSA]\d`, tragend/nichttragend, Maße, Stichworte; `meta.classifier="rule"`.
   - `llm.py`: `LLMClassifier`-Platzhalter mit `NotImplementedError` (Slot für WP-7).
   - Factory `get_classifier()` + `settings.CLASSIFIER` (`rule | llm`, Default `rule`).
2. Klassifizierung als Schritt über `LVDraft` **vor** `persist_lv`; `_meta` in `attributes` schreiben.
3. `ReclassifyService.reclassify(lv_id)`: persistierte Positionen → `ClassifierInput` →
   aktiver Classifier → nur `attributes` aktualisieren (kein Neu-Import).
4. Unit-Tests gegen bekannte Fixture-Positionen; Classifier über das Protocol mockbar.

**Constraints:** Aufrufer importieren nur `ClassifierProtocol`/`get_classifier()` — nie
`RuleBasedClassifier` direkt. Klassifizierung greift für jede `source_type`. `async`-Signatur
(LLM ist I/O-gebunden).

**Definition of Done:**
- `02.010` → `beton:"C30/37"`, `expo:["XC2","XD1"]`, `tragend:true`, `_meta.classifier="rule"`.
- Positionen ohne Merkmale: leere Facetten, kein Fehler.
- `ReclassifyService` lässt LV-Struktur und `assignee_id` unangetastet.
- `pytest` grün, Coverage ≥ 80 %.

Commit: `feat(classify): regelbasierte Klassifizierung hinter ClassifierProtocol`
