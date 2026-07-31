Setze **WP-4 · Frontend-Gerüst + Datenschicht** um.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/frontend.md @.claude/CLAUDE.md
Design-Referenz (nicht ausliefern, nur portieren): `design/claude-design/lv-main.jsx`, `design/claude-design/lv-data.jsx`
Design-System-Skill: `bubble-design` (`.claude/skills/bubble-design/`) — Tokens (`tokens/*.css`),
UI-Primitives (`components/core/*.jsx`) und Patterns (`patterns.md`) sind aus denselben
Prototyp-Dateien abgeleitet; beim Portieren als Referenz für Farben, Typografie, Abstände und
Komponentenverhalten heranziehen, nicht das bestehende Prototyp-JSX 1:1 kopieren.

**Ziel:** Vite-App in `frontend/`, die eine real importierte LV lädt und Tree + Tabelle +
Suche + Filter rendert (noch **ohne** Graph — der kommt in WP-5).

**Vorgehen:** Erst kurzer Plan, dann:
1. Vite + React + TypeScript + Tailwind in `frontend/`; `vite.config.ts` proxyt `/api` → FastAPI.
2. `src/types/lv.ts`, `src/api/client.ts`, `src/api/lv.ts` (getTree, getPosition, setAssignee).
3. Port aus `lv-main.jsx`: `Tree`, `PositionsTable`, `TopBar`, `FilterStrip`,
   `FacetButton`/`RangeButton`, `Highlighted`, `Status`, `Member` (Port-Map in frontend.md).
4. `src/lib/matchPos.ts` — Filter-/Suchlogik 1:1 aus dem Design (single source of truth).
5. Fixture-Daten (`window.LV`) und `localStorage` für Fachdaten entfernen; Daten aus der API.

**Constraints:** Keine Fixture-Daten, kein `localStorage` für Fachdaten. Strikte TS-Types.
Tree konsumiert den `LVNode`-Baum aus `/tree`.

**Definition of Done:**
- App lädt eine importierte LV und zeigt Tree + Tabelle.
- Suche und alle Facetten-Filter (inkl. Hervorheben/Ausblenden) funktionieren.
- `grep -R "window.LV\|localStorage" frontend/src` liefert nichts für Fachdaten.

Commit: `feat(frontend): Gerüst, API-Client und LV-Tree/Tabelle`
