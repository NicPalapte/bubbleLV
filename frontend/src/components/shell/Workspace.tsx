// Arbeitsfläche unter der Kopfleiste (Entscheidung 0064). Zwei Anordnungen auf
// demselben Filter- und Auswahlzustand:
// - Splitscreen: Graph, Tabelle und Positionskarte als Bereiche nebeneinander.
// - Fenster: der Graph füllt die Fläche, Tabelle und Karte schweben darüber
//   (docs/decisions/0034-graph-als-hauptscreen.md).
// Seitenfenster (Überblick · Filter · Prüfung), Vergleich und Tour liegen in
// beiden Anordnungen darüber. Graph und Tabelle können in ein eigenes
// Browserfenster wandern (Entscheidung 0039).

import { CompareWindow } from './CompareWindow';
import { GraphDock } from './GraphDock';
import { GraphStage } from './GraphStage';
import { SidePanel } from './SidePanel';
import { SplitView } from './SplitView';
import { TableWindow } from './TableWindow';
import { useWorkspace } from './WorkspaceProvider';
import { ExternalWindow } from '../common/ExternalWindow';
import { SelectionCard } from '../graph/SelectionCard';
import { Tour } from '../tour/Tour';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** Der Graph im eigenen Browserfenster; ↙ oder Schließen holt ihn zurück. */
function GraphPopout({ root }: { root: LVNode }) {
  const { hosts, dock } = useWorkspace();
  const host = hosts.graph;
  if (host === null) return null;
  return (
    <ExternalWindow host={host} onClosed={() => dock('graph')}>
      <section aria-label="Graph — eigenes Fenster" className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[38px] shrink-0 items-center gap-[10px] border-b border-line bg-surface pl-[12px] pr-[6px]">
          <b className="font-display text-[14px] font-semibold text-ink">Graph</b>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => dock('graph')}
            title="Zurück ins Hauptfenster"
            aria-label="Graph zurück ins Hauptfenster"
            className="inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
          >
            ↙
          </button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-paper">
          <GraphStage root={root} cardOverlay={false} />
        </div>
      </section>
    </ExternalWindow>
  );
}

/** Fenster-Anordnung: Graph als Fläche, die Karte schwebt darüber. */
function WindowsLayout({ root }: { root: LVNode }) {
  const { selectedNode, selectedPosition } = useViewer();
  const dispatch = useViewerDispatch();
  const { hosts } = useWorkspace();
  const cardNode = selectedPosition ?? selectedNode;
  return (
    <>
      {hosts.graph === null ? (
        <GraphStage root={root} cardOverlay />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[12px] text-mute">
          Graph im eigenen Fenster
        </div>
      )}
      {cardNode !== null && (
        <SelectionCard node={cardNode} onClose={() => dispatch({ type: 'closeSelection' })} />
      )}
    </>
  );
}

export function Workspace({ root }: { root: LVNode }) {
  const { split } = useWorkspace();
  return (
    <>
      {split ? <SplitView root={root} /> : <WindowsLayout root={root} />}
      <GraphPopout root={root} />
      <SidePanel />
      <TableWindow />
      <CompareWindow />
      <GraphDock tableButton={!split} />
      <Tour />
    </>
  );
}
