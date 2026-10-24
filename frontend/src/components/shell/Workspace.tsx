// Arbeitsfläche unter der Kopfleiste: immer der Splitscreen (Entscheidung 0074) —
// Graph, Tabelle, Position, Überblick, Prüfung und Dokument als Bereiche auf demselben
// Filter- und Auswahlzustand. Vergleich, Tour und Kurzumfrage liegen darüber. Graph,
// Tabelle und Dokument können in ein eigenes Browserfenster wandern (Entscheidung 0039).

import { SurveyCard } from '../survey/SurveyCard';
import { CompareWindow } from './CompareWindow';
import { DocWindow } from './DocWindow';
import { GraphDock } from './GraphDock';
import { GraphStage } from './GraphStage';
import { SplitView } from './SplitView';
import { TableWindow } from './TableWindow';
import { useWorkspace } from './WorkspaceProvider';
import { ExternalWindow } from '../common/ExternalWindow';
import { Tour } from '../tour/Tour';
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
          <GraphStage root={root} />
        </div>
      </section>
    </ExternalWindow>
  );
}

export function Workspace({ root }: { root: LVNode }) {
  return (
    <>
      <SplitView root={root} />
      <GraphPopout root={root} />
      <TableWindow />
      <DocWindow />
      <CompareWindow />
      <GraphDock />
      <Tour />
      <SurveyCard />
    </>
  );
}
