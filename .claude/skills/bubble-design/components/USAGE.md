# Using the components

All components are plain React function components with **named exports**, no dependencies
beyond React, and no CSS files of their own — every value is a CSS custom property from
`styles.css`. Import that once, then use them anywhere.

```jsx
import { Chip } from './components/core/Chip.jsx';
import { StatusPill } from './components/core/StatusPill.jsx';
import { DataTable } from './components/core/DataTable.jsx';

<Chip on count={3}>Vergabepaket ▾</Chip>
<StatusPill status="geprüft" />
<DataTable
  columns={[
    { key:'code',  label:'OZ',          width:'9%' },
    { key:'label', label:'Bezeichnung', width:'28%', primary:true },
    { key:'menge', label:'Menge',       width:'8%',  align:'right' },
    { key:'status',label:'Status',      width:'10%', render:r => <StatusPill status={r.status} /> },
  ]}
  rows={positions} rowKey={p => p.code}
  selectedKey={sel} onPick={setSel}
  sort={sort} onSort={k => setSort(s => ({ key:k, dir: s.key===k ? -s.dir : 1 }))}
  empty="Keine Positionen entsprechen den Filtern."
/>
```

The prototype in the parent project (`lv-main.jsx`, `lv-graph.jsx`, `lv-vergabe.jsx`,
`lv-analytics.jsx`) uses browser-Babel globals instead of imports — same markup, the
components are just assigned to `window`. Either style works; keep one per file.

## Source of truth

Two copies of these components exist. They serve different purposes — do not merge them.

- `.claude/skills/bubble-design/components/core/*.jsx` — **this kit**. Reference
  implementations for throwaway prototypes that run on browser-Babel without a build
  step. Not shipped, not type-checked (outside `frontend/tsconfig.app.json`
  `include: ["src"]`), not linted (`frontend/eslint.config.js` covers `**/*.{ts,tsx}`).
- `frontend/src/components/ui/*.tsx` — **the production version**. This is what the app
  renders and what the Bubble MVP is judged on.

Rules:

- Changing app behavior or appearance → edit the `.tsx` under `frontend/src/components/ui/`.
  Do not edit the `.jsx` here and expect the app to follow; nothing syncs them.
- Changing this kit (new primitive, changed prototype markup) → port the change to the
  `.tsx` twin in the same commit, or state in the commit body why it stays
  prototype-only.
- The `.tsx` versions already differ deliberately: ARIA roles on `DataTable`/`TreeRow`,
  a separate `onToggle` on `TreeRow`, `type="button"` on `Chip`. Do not "fix" those back
  to match the `.jsx`. Rationale: `docs/architecture/frontend.md` § Design-System and
  `docs/decisions/0004-design-kit-und-frontend.md`.
- Never delete a `.jsx` here because a `.tsx` twin exists — the prototypes in
  `design/claude-design/` and this skill's own output depend on the Babel-compatible
  form.

## Inventory

Production paths are relative to `frontend/src/components/ui/`. `—` means deliberately
not in the app; the reason is binding, see `docs/scope.md#out-of-scope`.

| Component | Kit file (prototypes) | Production (the app) |
| --- | --- | --- |
| Chip | `core/Chip.jsx` | `Chip.tsx` |
| StatusPill | `core/StatusPill.jsx` | `StatusPill.tsx` |
| MemberAvatar | `core/MemberAvatar.jsx` | — Zuständigkeit is out of scope |
| PanelHeader, BlockLabel | `core/PanelHeader.jsx` | `PanelHeader.tsx` |
| PropField, PropGrid | `core/PropField.jsx` | `PropField.tsx` |
| TreeRow | `core/TreeRow.jsx` | `TreeRow.tsx` |
| DataTable | `core/DataTable.jsx` | `DataTable.tsx` |
| Popover, PopoverHead, PopoverRow | `core/Popover.jsx` | `Popover.tsx` |
| Checkbox | `core/Checkbox.jsx` | — the facet row brings its own |
| SegmentedControl | `core/SegmentedControl.jsx` | `SegmentedControl.tsx` |
| PackageTag, PackageDots, packageColors | `core/PackageTag.jsx` | — Vergabepakete are out of scope |
| EmptyState | `core/EmptyState.jsx` | `EmptyState.tsx` |
| BubbleLogo | `core/BubbleLogo.jsx` | `BubbleLogo.tsx` |
