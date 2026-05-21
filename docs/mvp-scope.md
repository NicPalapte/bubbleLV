# MVP-Scope & Feature-Specs

## F-01 · GAEB-Import & Parsing

GAEB DA XML (Versionen 2.0–3.3) hochladen, parsen, in PostgreSQL persistieren.

**Adapter-Architektur:**
```
GAEBParserProtocol (ABC)
    └── PyGAEBAdapter   ← app/adapters/gaeb_adapter.py
```

**Pydantic-Modelle (Adaptergrenze):**

| Modell            | Felder                                                               |
|-------------------|----------------------------------------------------------------------|
| `GAEBDocument`    | `raw_data`, `version`, `encoding`                                    |
| `Position`        | `oz`, `short_text`, `long_text`, `unit`, `quantity`, `position_type` |
| `ProjectMetadata` | `project_id`, `project_name`, `client`, `deadline`, `lots`          |
| `Lot`             | `lot_id`, `name`, `sections: list[Section]`                          |
| `Section`         | `section_id`, `name`, `positions: list[Position]`                    |

`PositionType`: `NORMAL | ALTERNATIV | BEDARF | ZULAGENPOSITION`

**Kernfunktionen:**
- `GAEBParserProtocol.parse(file: BinaryIO) -> GAEBDocument`
- `GAEBParserProtocol.extract_positions(doc: GAEBDocument) -> list[Position]`
- `GAEBParserProtocol.extract_metadata(doc: GAEBDocument) -> ProjectMetadata`
- `persist_lv(project_id, positions, metadata) -> None` — idempotent via OZ

---

## F-02 · LV-Viewer

**Kernfunktionen:**
- `get_lv_tree(project_id: UUID) -> LVTree` — Los → Abschnitt → Position
- `get_position_detail(position_id: UUID) -> PositionDetail`
- `search_positions(project_id, query: str) -> list[Position]` — via `tsvector`
- `filter_positions(project_id, filters: PositionFilter) -> list[Position]`

---

## F-03 · Positionsmanagement

**Kernfunktionen:**
- `set_position_status(position_id, status: PositionStatus, user_id) -> Position`
- `assign_position(position_id, assignee_id, due_date, user_id) -> Position`
- `add_note(position_id, content: str, user_id) -> Note` — append-only
- `get_position_audit_log(position_id) -> list[AuditEntry]`
- `get_project_progress(project_id) -> ProjectProgress`

---

## Out of Scope {#out-of-scope}

| Feature                                    | Phase |
|--------------------------------------------|-------|
| Nutzer- & Projektverwaltung (F-04)         | 2     |
| NU-Anfragen per E-Mail (F-05)              | 2     |
| Dokumentenverknüpfung / Bieterfragen (F-06)| 2     |
| Azure AD SSO                               | 2     |
| Referenzdatenbank (F-07)                   | 3     |
| Externe Konnektoren (Sharepoint, Dalux, Forma) | 3 |
| KI-Konformitätsprüfung VOB (F-09)          | 4     |
| NU-Self-Service-Portal (F-10)              | 4     |
| EP-Kalkulation in der App                  | nie   |
| GAEB-Export / Rückschreiben in iTwo        | nie   |
| Native Mobile App                          | nie   |
| Multi-Tenant / SaaS                        | nie   |