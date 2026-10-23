export interface Column<T> {
  key: string; label: string;
  /** Percentage string, e.g. '28%' — columns are flex-basis, never auto. */
  width: string;
  align?: 'left' | 'right';
  /** Ink-colored, weight 500 — exactly one column per table. */
  primary?: boolean;
  render?: (row: T) => React.ReactNode;
}
export interface DataTableProps<T> {
  columns: Column<T>[]; rows: T[];
  rowKey: (row: T) => string;
  selectedKey?: string | null;
  onPick?: (key: string) => void;
  empty?: string;
  sort?: { key: string; dir: 1 | -1 };
  onSort?: (key: string) => void;
}
export function DataTable<T>(props: DataTableProps<T>): JSX.Element;
