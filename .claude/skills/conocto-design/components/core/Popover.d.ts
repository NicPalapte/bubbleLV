export interface PopoverProps {
  open: boolean;
  children: React.ReactNode;
  /** min-width in px. 200 for pickers, 244 for facets, 260 for range sliders. */
  width?: number;
  align?: 'left' | 'right';
}
export function Popover(props: PopoverProps): JSX.Element | null;
export function PopoverHead(props: { children: React.ReactNode; onReset?: () => void }): JSX.Element;
export function PopoverRow(props: {
  children: React.ReactNode; on?: boolean; onClick?: () => void;
  /** Multi-select facet row. */
  checkbox?: boolean;
  /** Right-aligned count. */
  trailing?: React.ReactNode;
}): JSX.Element;
