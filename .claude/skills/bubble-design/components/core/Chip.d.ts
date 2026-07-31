export interface ChipProps {
  children: React.ReactNode;
  /** Active/selected — blue tint + blue border. */
  on?: boolean;
  /** Dashed outline: destructive-ish "reset" or "add" affordance. */
  dashed?: boolean;
  /** Badge number; hidden when 0/undefined. */
  count?: number;
  onClick?: () => void;
  title?: string;
}
export function Chip(props: ChipProps): JSX.Element;
