// Tabelle im eigenen Browserfenster, etwa für den zweiten Bildschirm
// (Entscheidung 0039): ↗ im Bereichskopf löst sie aus dem Splitscreen, ↙ hier holt
// sie zurück. Sonst steht die Tabelle als Bereich in `SplitView`.

import { useCallback, useEffect } from 'react';
import { ExternalWindow } from '../common/ExternalWindow';
import { useWorkspace } from './WorkspaceProvider';
import { PositionsTable } from '../table/PositionsTable';
import { useViewer } from '../../state/viewer';

const ICON_BUTTON =
  'inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink';

export function TableWindow() {
  const {
    tree,
    selectedNode,
    view: { workspace },
  } = useViewer();
  const { hosts, dock } = useWorkspace();
  const popup = hosts.table;

  const shown = !workspace.closed.table && tree !== null;
  // Tabelle von woanders zu (Escape, neues LV): das zweite Fenster geht mit.
  useEffect(() => {
    if (!shown && popup !== null) dock('table');
  }, [shown, popup, dock]);

  // Zweites Fenster von Hand zu: die Tabelle kehrt in ihren Bereich zurück.
  const closedByHand = useCallback((): void => dock('table'), [dock]);

  if (!shown || popup === null) return null;
  return (
    <ExternalWindow host={popup} onClosed={closedByHand}>
      <section aria-label="Tabelle — eigenes Fenster" className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[38px] shrink-0 items-center gap-[10px] border-b border-line bg-surface pl-[12px] pr-[6px]">
          <b className="font-display text-[14px] font-semibold text-ink">Tabelle</b>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => dock('table')}
            title="Zurück ins Hauptfenster"
            aria-label="Tabelle zurück ins Hauptfenster"
            className={ICON_BUTTON}
          >
            ↙
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <PositionsTable root={selectedNode ?? tree} />
        </div>
      </section>
    </ExternalWindow>
  );
}
