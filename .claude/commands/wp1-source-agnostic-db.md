Setze **WP-1 · DB quellen-agnostisch machen** um.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/data-model.md @docs/architecture/backend.md @.claude/CLAUDE.md

**Ziel:** Der Schreibweg in die DB ist nicht mehr GAEB-geformt. Der Parser produziert ein
neutrales `LVDraft`; eine einzige `persist_lv(project_id, draft)` schreibt es weg.

**Vorgehen:** Beginne mit einem kurzen Plan (3–5 Punkte), dann implementieren:
1. `SourceType`-Enum (`GAEB | MANUAL | EXCEL`), Felder `source_type` + `source_metadata`
   (JSONB) auf `LV`; `gaeb_version` nach `source_metadata` verschieben.
2. Feld `attributes` (JSONB, Default `{}`) auf `Position`.
3. `LVDraft / LotDraft / SectionDraft / PositionDraft` in `app/schemas/lv_draft.py` — ohne GAEB-Begriffe.
4. `LVRepository.persist_lv` nimmt `LVDraft` statt `ParsedLV`; Repo importiert nichts aus
   `app.adapters`/`pyGAEB`.
5. Mapper `ParsedLV → LVDraft` im `GAEBImportService`.
6. Alembic-Migration; bestehende Zeilen auf `source_type='GAEB'` backfillen.
7. Bestehende GAEB-Tests auf den neuen Pfad umstellen.

**Constraints:** Regeln aus @.claude/CLAUDE.md gelten. Idempotenz über OZ bleibt; `assignee_id`
darf beim Re-Import nicht überschrieben werden.

**Definition of Done:**
- `pytest -x --cov=app --cov-fail-under=80` grün.
- Import schreibt `source_type='GAEB'` + `source_metadata.gaeb_version`.
- Re-Import idempotent, `assignee_id` bleibt erhalten.
- `grep -R "pygaeb\|Parsed" app/repositories/` liefert nichts.

Commit: `feat(db): quellen-agnostischer Schreibpfad via LVDraft`
