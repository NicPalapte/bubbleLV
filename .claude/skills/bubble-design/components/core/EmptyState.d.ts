export interface EmptyStateProps {
  children: React.ReactNode;
  /** Clickable "+ … hinzufügen" variant. */
  action?: boolean;
  onClick?: () => void;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
