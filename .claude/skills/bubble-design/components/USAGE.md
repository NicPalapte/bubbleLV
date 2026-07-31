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

## Inventory
| Component | File |
| --- | --- |
| Chip | `core/Chip.jsx` |
| StatusPill | `core/StatusPill.jsx` |
| MemberAvatar | `core/MemberAvatar.jsx` |
| PanelHeader, BlockLabel | `core/PanelHeader.jsx` |
| PropField, PropGrid | `core/PropField.jsx` |
| TreeRow | `core/TreeRow.jsx` |
| DataTable | `core/DataTable.jsx` |
| Popover, PopoverHead, PopoverRow | `core/Popover.jsx` |
| Checkbox | `core/Checkbox.jsx` |
| SegmentedControl | `core/SegmentedControl.jsx` |
| PackageTag, PackageDots, packageColors | `core/PackageTag.jsx` |
| EmptyState | `core/EmptyState.jsx` |
| BubbleLogo | `core/BubbleLogo.jsx` |
