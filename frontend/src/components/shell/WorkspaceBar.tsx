// Kopfleiste, rechts: ein Knopf „Ansicht" (Entscheidung 0074). Das Menü blendet jeden
// Bereich des Splitscreens ein und aus, holt Bereiche aus einem eigenen Browserfenster
// zurück (Entscheidung 0039) und setzt die Anordnung zurück (Entscheidung 0073).

import { useCallback, useRef, useState } from 'react';
import { useOptionalWorkspace, type PopPane } from './WorkspaceProvider';
import { useDismiss } from '../common/useDismiss';
import { Popover, PopoverRow } from '../ui/Popover';
import { INITIAL_ARRANGEMENT, PANES, PANE_LABEL as LABEL } from '../../lib/workspace/split';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const BUTTON =
  'inline-flex h-[32px] shrink-0 cursor-pointer items-center gap-[6px] rounded-[var(--r-sm)] border-none bg-transparent px-[10px] font-mono text-[12px] text-dim hover:bg-sunken hover:text-ink aria-expanded:bg-sunken aria-expanded:text-ink';

const isPopPane = (pane: string): pane is PopPane =>
  pane === 'graph' || pane === 'table' || pane === 'doc';

export function WorkspaceBar() {
  const workspace = useOptionalWorkspace();
  const {
    view: {
      workspace: { closed, root },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss(
    [anchorRef, popoverRef],
    open,
    useCallback(() => setOpen(false), []),
  );
  if (workspace === null) return null;
  const { hosts, dock } = workspace;

  // Gemerkte Anordnungen kommen als neues Objekt zurück — darum Inhalt vergleichen.
  const moved = JSON.stringify(root) !== JSON.stringify(INITIAL_ARRANGEMENT.root);

  return (
    <div ref={anchorRef} className="flex items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        data-tour="workspace"
        title="Bereiche ein- und ausblenden"
        className={BUTTON}
      >
        Ansicht <span className="text-[11px] text-mute">▾</span>
      </button>
      <Popover ref={popoverRef} open={open} width={232} align="right" anchorRef={anchorRef}>
        {PANES.map((pane) => {
          const away = isPopPane(pane) && hosts[pane] !== null;
          return away ? (
            <PopoverRow
              key={pane}
              checkbox
              on
              onClick={() => dock(pane)}
              title={`${LABEL[pane]} zurück ins Hauptfenster`}
              trailing={<span className="text-mute">↙ zurückholen</span>}
            >
              {LABEL[pane]}
            </PopoverRow>
          ) : (
            <PopoverRow
              key={pane}
              checkbox
              on={!closed[pane]}
              onClick={() => dispatch({ type: 'paneClosed', pane, closed: !closed[pane] })}
            >
              {LABEL[pane]}
            </PopoverRow>
          );
        })}
        <hr className="mx-[4px] my-[4px] border-0 border-t border-line" />
        <PopoverRow
          onClick={() => {
            setOpen(false);
            dispatch({ type: 'workspaceReset' });
          }}
          title={moved ? 'Bereiche wieder wie am Anfang anordnen' : 'Schon wie am Anfang'}
        >
          ↺ Anordnung zurücksetzen
        </PopoverRow>
      </Popover>
    </div>
  );
}
