// Der Graph mit allem, was fest zu ihm gehört: Gliederung und Legende
// (GraphHeader) sowie die Kennzahlen, die das Seitenfenster öffnen. Steht im
// Hauptfenster, als Bereich im Splitscreen oder im eigenen Browserfenster —
// die Hülle drumherum muss `relative` sein.

import { BubbleGraph } from '../graph/BubbleGraph';
import { GraphHeader } from '../graph/GraphHeader';
import { KpiCapsule } from './KpiCapsule';
import type { LVNode } from '../../types/lvNode';

export function GraphStage({ root, cardOverlay }: { root: LVNode; cardOverlay: boolean }) {
  return (
    <>
      <BubbleGraph root={root} cardOverlay={cardOverlay} />
      <GraphHeader root={root} />
      <KpiCapsule />
    </>
  );
}
