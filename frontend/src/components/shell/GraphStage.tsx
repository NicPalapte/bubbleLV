// Der Graph mit allem, was fest zu ihm gehört: Gliederung und Legende
// (GraphHeader) sowie die Kennzahlen, die Überblick und Prüfung öffnen. Steht als
// Bereich im Splitscreen oder im eigenen Browserfenster —
// die Hülle drumherum muss `relative` sein.

import { BubbleGraph } from '../graph/BubbleGraph';
import { GraphHeader } from '../graph/GraphHeader';
import { KpiCapsule } from './KpiCapsule';
import type { LVNode } from '../../types/lvNode';

export function GraphStage({ root }: { root: LVNode }) {
  return (
    <>
      <BubbleGraph root={root} />
      <GraphHeader root={root} />
      <KpiCapsule />
    </>
  );
}
