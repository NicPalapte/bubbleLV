# Bubble — Patterns

Above component level. Copy these shapes; don't invent new ones.

## App shell
```
┌─────────────────────────────────────────────────────────────┐
│ Topbar 54px: logo │ breadcrumb │ search │ facet chips │ user │
├─────────────────────────────────────────────────────────────┤
│ Filter strip (only when filters are active)                 │
├──────────┬──────────────────────────────────────┬───────────┤
│ Tree     │ Canvas / Table / Analytics view      │ Props     │
│ 236px    │ flex:1, min-width:0                  │ 320px     │
└──────────┴──────────────────────────────────────┴───────────┘
```
Both side panels are drag-resizable (5px handle, `col-resize`, hover `--blueS`),
clamped 180–460 / 260–560, and persisted in localStorage along with the collapsed
state of the tree, the bubble size mode and the hide/dim mode.
Collapsed tree = 44px icon rail with the same nav, badges in the corner.

## Navigation model
Project → Los → LV (breadcrumb dropdowns) → Abschnitt → Position.
The breadcrumb stops at LV; section/position context lives in the panels.
`Esc` steps back one level (position → section → overview).
Clicking a bubble drills in and swaps the canvas for the positions table;
`←` in the table sub-toolbar returns.

## Filtering
Facets are declared as data (`{ id, label, get(p), optionLabel, swatch, sortValues }`)
and rendered as `Chip` + `Popover` with checkbox rows and per-value counts.
One `matchPos(position, filters, search)` function is the single source of truth for
every view. Active filters are echoed as removable chips in the filter strip, with a
`SegmentedControl` for **Hervorheben** (dim non-matches) vs **Ausblenden** (hide them).

## Right-hand properties panel
Header (`PanelHeader`) then stacked blocks separated by `1px solid var(--grid)`, each
opened by a `BlockLabel`. Canonical order for a position:
Vergabepakete + Preisspiegel · Bearbeiter · Aufgaben · Notizen · Langtext (on `--panel`) ·
Metadaten · Betonspezifikation · Mengen + Kosten · Dokumente.
Key figures go in a `PropGrid` of `PropField`s (2 columns, `gap:'0 18px'`).
Hovering a bubble previews that object in the panel with a 140ms trailing delay before
it snaps back — hover never overrides an explicit click in the table view.

## Progress and share bars
A 2–3px `--grid` track with a solid fill: `--blue` for geprüft, `--amber` for offen,
`--mute` for entwurf; the cost-share bar uses `linear-gradient(90deg,var(--blue),var(--cyan))`.
Always followed by a 9px uppercase caption ("42 % DES ABSCHNITTS").

## Data visualisation
Bubble graph (force layout), treemap and sunburst share one encoding:
**fill = status tint** (blue = geprüft, `#fff4dc` = offen, `#f1f4f8` = entwurf),
**stroke = status color**, **area = the selected size metric** (count / volume / cost),
labels are mono code + Space Grotesk name + mono count. Connectors are
`0.8px --line` dashed `2 3`. Never add a legend the labels already provide.

## Persistence
Everything the user arranges is stored in localStorage under `bubble-*` keys
(`bubble-leftW`, `bubble-rightW`, `bubble-treeCollapsed`, `bubble-sizeMode`,
`bubble-hideMode`, `bubble-demo`, `bubble-assignees`, `bubble-tasks`, `bubble-notes`).
Follow that prefix for anything new.
