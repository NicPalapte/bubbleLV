export interface PanelHeaderProps {
  /** Uppercase mono context line, e.g. "POSITION · OZ 03.010". */
  eyebrow: string;
  title: string;
  /** Right-aligned slot — usually <StatusPill/> or a version tag. */
  right?: React.ReactNode;
  /** 15 for positions, 18 for sections/lots/projects. */
  size?: number;
}
export function PanelHeader(props: PanelHeaderProps): JSX.Element;
export function BlockLabel(props: { children: React.ReactNode; right?: React.ReactNode }): JSX.Element;
