Setze **WP-7 · LLM-Klassifizierer** um. **Post-MVP** — nur starten, wenn WP-1…6 stehen und
das MVP validiert ist.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/backend.md @docs/architecture/data-model.md @.claude/CLAUDE.md

**Ziel:** Den in WP-2 vorbereiteten Slot füllen: `LLMClassifier` implementiert
`ClassifierProtocol`, ohne Änderung an Import, Persistenz oder API.

**Vor der Umsetzung klären (mit dem Maintainer):**
- Modellwahl und Anbindung (Anthropic-API), Kosten-/Latenz-Budget.
- Prompt- und Ausgabeschema (muss dieselben `attributes`-Keys liefern wie der Regel-Extraktor).
- Umgang mit niedriger `confidence`: Regel-Fallback oder als „unsicher" markieren?
- Batch-Größe und Rate-Limits.

**Vorgehen (nach Klärung):** Erst kurzer Plan, dann:
1. `app/services/classification/llm.py` → `LLMClassifier` (async, batched), erfüllt
   `ClassifierProtocol`; `meta.classifier="llm"`, `meta.confidence` je Ergebnis.
2. Aktivierung nur über `settings.CLASSIFIER=llm` — kein Aufrufer ändert sich.
3. Bestehende LVs über `ReclassifyService` neu klassifizieren (kein GAEB-Neu-Import).
4. Tests: LLM-Aufruf gemockt; Schema-Konformität der Ausgabe; Fallback-Pfad.

**Definition of Done:**
- `CLASSIFIER=rule` und `CLASSIFIER=llm` liefern beide schema-konforme `attributes`.
- Re-Klassifizierung ändert nur `attributes`, nicht Struktur oder `assignee_id`.
- Kein Aufrufer importiert `LLMClassifier` direkt.

Commit: `feat(classify): LLM-Klassifizierer hinter ClassifierProtocol`
