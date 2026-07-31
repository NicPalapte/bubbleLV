Setze **WP-5 · Bubble-Graph portieren** um. Das ist der Kern des Produkts.

Kontext lesen: @docs/implementation-plan.md @docs/architecture/frontend.md @.claude/CLAUDE.md
Design-Referenz (portieren, nicht 1:1 kopieren): `design/claude-design/lv-graph.jsx`
Design-System-Skill: `bubble-design` (`.claude/skills/bubble-design/`) — Canvas-Hintergrund
(Blueprint-Grid/Dot-Pattern, `--paper`), Größenkodierung und Motion für die Bubbles siehe
README "Visual foundations"; Drill-in-Pattern (Graph ⇄ Tabelle) siehe `patterns.md`.

**Ziel:** Die Graph-Engine aus `lv-graph.jsx` als Mitte-Modus, gespeist aus demselben
`/tree`-`LVNode`-Baum wie die Tree-Spalte. Vergabepaket-Kanten entfallen (out of scope).

**Vorgehen:** Erst kurzer Plan, dann:
1. Engine nach `src/lib/graph/` (Baumaufbau, `layoutRadial`, Walk, Kind-Klassifizierung) und
   Komponenten nach `src/components/graph/`.
2. An `LVNode` aus der API binden (kein Fixture, kein Demo-Lot im Default).
3. Erhalten: Größenmodi (Anzahl / Gesamtpreis / Einheitlich) über `LVNode`-Aggregate,
   Zoom + Level-of-Detail, Viewport-Culling, Cluster-Bubbles ab > 24 Geschwistern.
4. Drill-in: Klick auf Abschnittsknoten → Tabelle des Abschnitts; Umschalter Graph ⇄ Tabelle.
5. `nodeVpIds`/`positionPakete`-Overlays und `genDemoLot` aus dem aktiven Pfad entfernen
   (Demo-Lot höchstens hinter einem Flag).

**Constraints:** Muss Richtung ~10k Positionen skalieren (Aggregate, LOD, Culling beibehalten).
Graph und Tree teilen denselben `LVNode`-Baum.

**Definition of Done:**
- Graph rendert die importierte LV; Zoom/LOD/Culling funktionieren.
- Größenmodi schalten korrekt; Klick drillt in Abschnitt → Tabelle.
- Keine Referenzen mehr auf Vergabe/`positionPakete` im aktiven Pfad.

Commit: `feat(frontend): Bubble-Graph-Viewer`
