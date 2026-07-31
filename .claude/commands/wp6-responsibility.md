Setze **WP-6 · Zuständigkeit + Feinschliff** um.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/frontend.md @.claude/CLAUDE.md
Design-Referenz: `design/claude-design/lv-main.jsx` (`AssigneePicker`, `Member`, Eigenschaften-Spalte)
Design-System-Skill: `bubble-design` (`.claude/skills/bubble-design/`) — `components/core/MemberAvatar.jsx`
(Avatar-Größen/Rollenfarbe für den `AssigneePicker`) und `components/core/PropField.jsx`/`PropGrid`
(Label/Wert-Zeilen für das Eigenschaften-Panel) als Komponentenreferenz.

**Ziel:** Bearbeiter-Zuweisung end-to-end, Eigenschaften-Panel, letzter Schliff.

**Vorgehen:** Erst kurzer Plan, dann:
1. `AssigneePicker` schreibt via `PATCH /api/positions/{id}` (`assignee_id`); optimistisches
   UI-Update, danach Server-Wahrheit.
2. Eigenschaften-Panel rechts: Langtext mit `Highlighted`, klassifizierte `attributes`
   (`_meta` ignorieren), Einheit/Menge/EP, Zuständigkeit.
3. Zuständigkeit als Filter-Facette an die echten Daten binden.

**Constraints:** Kein `localStorage` für Fachdaten — Zuständigkeit kommt aus dem Backend.

**Definition of Done:**
- Zuweisung überlebt Reload (aus dem Backend).
- Panel zeigt die klassifizierten Merkmale der gewählten Position.

Commit: `feat(positions): Zuständigkeit end-to-end + Eigenschaften-Panel`
