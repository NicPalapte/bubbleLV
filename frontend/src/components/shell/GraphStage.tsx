// Der Graph mit allem, was fest zu ihm gehört: Legende und Steuerung (GraphHeader,
// im Graphen selbst, weil sie seine Breite braucht) sowie die Kennzahlen, die
// Überblick und Prüfung öffnen. Steht als Bereich im Splitscreen oder im eigenen
// Browserfenster — die Hülle drumherum muss `relative` sein.

import { BubbleGraph } from '../graph/BubbleGraph';
import { KpiCapsule } from './KpiCapsule';
import type { LVNode } from '../../types/lvNode';

export function GraphStage({ root }: { root: LVNode }) {
  return (
    <>
      <BubbleGraph root={root} />
      <KpiCapsule />
    </>
  );
}
