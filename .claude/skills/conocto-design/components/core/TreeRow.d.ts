export interface TreeRowProps {
  code: string; label: string;
  depth?: number;
  /** Position row (no disclosure caret, indented, lighter weight). */
  leaf?: boolean;
  open?: boolean;
  selected?: boolean;
  /** Left bar color when not selected — Vergabepaket identity color. */
  accent?: string;
  /** Usually <StatusPill dotOnly/>. */
  status?: React.ReactNode;
  count?: React.ReactNode;
  /** Filtered out but still shown (hideMode 'dim'). */
  dimmed?: boolean;
  onClick?: () => void;
}
export function TreeRow(props: TreeRowProps): JSX.Element;
