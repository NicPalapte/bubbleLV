// Kopfleiste, rechts: Umschalter Splitscreen | Fenster (Entscheidung 0063) und
// je ein Knopf für jeden Bereich, der gerade zu ist oder in einem eigenen
// Browserfenster steht. Nur auf breiten Bildschirmen — darunter gelten Fenster.

import type { ReactNode } from 'react';
import { useOptionalWorkspace, type PopPane } from './WorkspaceProvider';
import { PANES, type PaneId } from '../../lib/workspace/split';
import { useViewer, useViewerDispatch, type WorkspaceMode } from '../../state/viewer';

const LABEL: Record<PaneId, string> = { graph: 'Graph', table: 'Tabelle', card: 'Position' };

const MODES: readonly { value: WorkspaceMode; label: string; icon: ReactNode }[] = [
  {
    value: 'split',
    label: 'Split',
    icon: (
      <>
        <rect x="0.7" y="0.7" width="12.6" height="10.6" rx="2" />
        <path d="M9 1v10M1 6.5h8" />
      </>
    ),
  },
  {
    value: 'windows',
    label: 'Fenster',
    icon: (
      <>
        <rect x="0.7" y="0.7" width="12.6" height="10.6" rx="2" />
        <rect x="7" y="3" width="4.5" height="5.5" rx="1" fill="currentColor" />
      </>
    ),
  },
];

const CHIP =
  'inline-flex h-[28px] shrink-0 cursor-pointer items-center gap-[5px] whitespace-nowrap rounded-[var(--r-pill)] border border-line bg-surface px-[10px] font-mono text-[10.5px] text-ink hover:border-blue hover:text-blueD';

export function WorkspaceBar() {
  const workspace = useOptionalWorkspace();
  const {
    view: {
      workspace: { mode, closed },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  if (workspace === null || !workspace.wide) return null;
  const { split, hosts, dock } = workspace;

  const away = (['graph', 'table'] as const).filter((pane: PopPane) => hosts[pane] !== null);
  const shut = split ? PANES.filter((pane) => closed[pane]) : [];

  return (
    <div className="flex shrink-0 items-center gap-[6px]">
      {away.map((pane) => (
        <button
          key={pane}
          type="button"
          onClick={() => dock(pane)}
          title={`${LABEL[pane]} zurück ins Hauptfenster`}
          className={CHIP}
        >
          ↙ {LABEL[pane]}
        </button>
      ))}
      {shut.map((pane) => (
        <button
          key={pane}
          type="button"
          onClick={() => dispatch({ type: 'paneClosed', pane, closed: false })}
          title={`${LABEL[pane]} wieder einblenden`}
          className={CHIP}
        >
          + {LABEL[pane]}
        </button>
      ))}
      <div
        role="radiogroup"
        aria-label="Anordnung"
        data-tour="workspace"
        className="inline-flex shrink-0 gap-[2px] rounded-[var(--r-pill)] border border-line bg-sunken p-[2px]"
      >
        {MODES.map((option) => {
          const on = option.value === mode;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => dispatch({ type: 'workspaceMode', mode: option.value })}
              className={`inline-flex h-[24px] cursor-pointer items-center gap-[5px] rounded-[var(--r-pill)] border-none px-[9px] font-mono text-[10.5px] ${
                on
                  ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                  : 'bg-transparent text-dim hover:text-blueD'
              }`}
            >
              <svg
                width="14"
                height="12"
                viewBox="0 0 14 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                aria-hidden="true"
              >
                {option.icon}
              </svg>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
