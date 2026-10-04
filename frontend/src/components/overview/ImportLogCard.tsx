// Karte „Import-Log" im Überblick: was beim Laden der Datei aufgefallen ist —
// fehlende Einheiten oder Mengen, nicht klassifizierte Positionen, doppelte OZ
// und Hinweise des Imports selbst (z. B. Ausfall des Hintergrundprozesses).
//
// Der Log gilt immer für die **ganze Datei**, nicht für den aktiven Filter
// (lib/overview/importLog.ts). Jeder Eintrag klappt die betroffenen Positionen
// auf; ein Klick darauf öffnet sie in der Tabelle.

import { useMemo, useState } from 'react';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { formatCount, formatPositions } from '../../lib/format';
import { buildImportLog, type LogEntry } from '../../lib/overview/importLog';
import { useViewer } from '../../state/viewer';

/** Mehr Zeilen liest niemand mehr ab; der Rest steht als Zusatz darunter. */
const MAX_ROWS = 50;

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  beachten: 'var(--amber)',
  hinweis: 'var(--dim)',
};

export function ImportLogCard() {
  const { index, notices, nodes } = useViewer();
  const jumpTo = useJumpToPosition();
  const log = useMemo(() => buildImportLog(index), [index]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const toggle = (kind: string): void =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(kind)) next.add(kind);
      return next;
    });

  if (log.entries.length === 0 && notices.length === 0) {
    return (
      <p className="font-sans text-[12px] text-dim">
        Beim Import ist nichts aufgefallen: alle {formatPositions(log.total)} haben Einheit, Menge
        und Gewerk.
      </p>
    );
  }

  return (
    <div>
      <p className="font-sans text-[11.5px] leading-[1.5] text-dim">
        Gilt für die ganze Datei, nicht für den Filter — {formatPositions(log.total)} gelesen.
      </p>
      {notices.map((notice) => (
        <p key={notice} className="mt-[6px] font-mono text-[10.5px] leading-[1.6] text-blueD">
          {notice}
        </p>
      ))}
      {log.entries.map((entry) => {
        const isOpen = open.has(entry.kind);
        return (
          <section key={entry.kind} className="border-b border-grid py-[8px]">
            <button
              type="button"
              onClick={() => toggle(entry.kind)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-baseline gap-[8px] border-none bg-transparent p-0 text-left"
            >
              <span className="font-sans text-[12.5px] font-semibold text-ink">{entry.title}</span>
              <span className="font-mono text-[10px]" style={{ color: LEVEL_COLOR[entry.level] }}>
                {formatPositions(entry.positionIds.length)}
              </span>
              <span className="flex-1" />
              <span aria-hidden="true" className="font-mono text-[10px] text-mute">
                {isOpen ? '▾' : '▸'}
              </span>
            </button>
            <p className="mt-[2px] font-sans text-[11px] leading-[1.5] text-dim">{entry.note}</p>
            {isOpen && (
              <div className="mt-[6px] border-t border-grid">
                {entry.positionIds.slice(0, MAX_ROWS).map((id) => {
                  const position = nodes.get(id)?.position ?? null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => jumpTo(id)}
                      className="flex w-full cursor-pointer items-baseline gap-[10px] border-none border-b border-solid border-grid bg-transparent px-0 py-[4px] text-left"
                    >
                      <span className="w-[110px] shrink-0 font-mono text-[10px] text-dim">
                        {position?.oz ?? '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-sans text-[11.5px] text-ink">
                        {position?.shortText ?? 'Position nicht gefunden'}
                      </span>
                    </button>
                  );
                })}
                {entry.positionIds.length > MAX_ROWS && (
                  <p className="mt-[4px] font-mono text-[9.5px] text-mute">
                    {formatCount(entry.positionIds.length - MAX_ROWS)} weitere
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
