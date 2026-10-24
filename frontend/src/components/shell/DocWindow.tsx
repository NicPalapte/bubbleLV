// Begleitdokument (Entscheidung 0072) im eigenen Browserfenster für den zweiten
// Bildschirm — dieselbe Mechanik wie die Tabelle (TableWindow.tsx): ↗ im Bereichskopf
// löst es aus dem Splitscreen, ↙ hier holt es zurück. Sonst steht das Dokument als
// Bereich in `SplitView`.

import { useCallback, useEffect } from 'react';
import { ExternalWindow } from '../common/ExternalWindow';
import { useWorkspace } from './WorkspaceProvider';
import { DocumentView } from '../docs/DocumentView';
import { useViewer } from '../../state/viewer';

const ICON_BUTTON =
  'inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink';

export function DocWindow() {
  const {
    tree,
    view: { workspace },
  } = useViewer();
  const { hosts, dock } = useWorkspace();
  const popup = hosts.doc;

  const shown = !workspace.closed.doc && tree !== null;
  // Dokument von woanders zu (neues LV): das zweite Fenster geht mit.
  useEffect(() => {
    if (!shown && popup !== null) dock('doc');
  }, [shown, popup, dock]);

  // Zweites Fenster von Hand zu: das Dokument kehrt in seinen Bereich zurück.
  const closedByHand = useCallback((): void => dock('doc'), [dock]);

  if (!shown || popup === null) return null;
  return (
    <ExternalWindow host={popup} onClosed={closedByHand}>
      <section aria-label="Dokument — eigenes Fenster" className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[38px] shrink-0 items-center gap-[10px] border-b border-line bg-surface pl-[12px] pr-[6px]">
          <b className="font-display text-[14px] font-semibold text-ink">Dokument</b>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => dock('doc')}
            title="Zurück ins Hauptfenster"
            aria-label="Dokument zurück ins Hauptfenster"
            className={ICON_BUTTON}
          >
            ↙
          </button>
        </div>
        <DocumentView />
      </section>
    </ExternalWindow>
  );
}
