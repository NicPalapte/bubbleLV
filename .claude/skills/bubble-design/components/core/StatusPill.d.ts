export interface StatusPillProps {
  /** German LV vocabulary — do not translate. */
  status: 'geprüft' | 'offen' | 'entwurf';
  /** Just the colored dot — used in dense tree rows and table headers. */
  dotOnly?: boolean;
}
export function StatusPill(props: StatusPillProps): JSX.Element;
