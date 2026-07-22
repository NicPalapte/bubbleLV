Setze **WP-3 · Read-API für den Viewer** um.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/backend.md @docs/architecture/frontend.md @.claude/CLAUDE.md

**Ziel:** Endpunkte, die Tree, Bubble-Graph, Tabelle und Eigenschaften speisen.

**Vorgehen:** Erst kurzer Plan, dann implementieren:
1. `GET /api/projects/{project_id}/tree` → rekursiver `LVNode`-Baum (Contract siehe backend.md):
   pro Knoten `id, kind, code, label, position_count, total_price, children`; auf Positionsebene
   zusätzlich die Positionsdaten inkl. `attributes`. Aggregate (`position_count`, `total_price`)
   im Backend rechnen.
2. `GET /api/positions/{position_id}` → `PositionDetail` (Kurz-/Langtext, `attributes`, Zuständigkeit).
3. `PATCH /api/positions/{position_id}` → **nur** `assignee_id` (Status bleibt read-only).
4. `POST /api/projects/{project_id}/lv:import` an den neuen `LVDraft`-Pfad anpassen.
5. Pydantic-Response-Schemas; Feldnamen auf die Frontend-Types abstimmen (@docs/architecture/frontend.md).

**Constraints:** `router → service → repository`. Kein `dict`-Return. Alles `async`.

**Definition of Done:**
- `httpx`-API-Tests grün.
- `/tree` liefert verschachtelte Knoten; Aggregate stimmen mit den Positionen überein.
- `PATCH …assignee` persistiert und ist nach `GET` sichtbar.
- `pytest` grün, Coverage ≥ 80 %.

Commit: `feat(api): read-API für LV-Tree, Position-Detail und Zuständigkeit`
