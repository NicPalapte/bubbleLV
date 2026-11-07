// Dokumentwahl im Bereich „Dokument“ (Entscheidung 0094): Knopf mit Name und „1 von 12“,
// darunter eine Liste mit Suche, Seiten und verknüpften Stellen. Ersetzt die
// Auswahlliste, die bei vielen PDFs unübersichtlich und am Tablet fummelig war.
// Gleiche Sortierung wie die Übersicht; nach Dokumentart mit Überschrift je Art (0096).

import { useCallback, useMemo, useRef, useState } from 'react';
import { KindDot } from './DocKindChip';
import { kindLabel } from '../../lib/docs/docKindLook';
import { useDocuments } from './DocumentsProvider';
import { DOC_TOOL, PdfInput } from './PdfInput';
import { useDismiss } from '../common/useDismiss';
import { Popover } from '../ui/Popover';
import { docRows, groupByKind, linkedSpotsByDoc, type DocRow } from '../../lib/docs/docList';
import type { OpenedPdf } from '../../lib/docs/pdf';
import { useViewer } from '../../state/viewer';

/** Ab so vielen PDFs gibt es ein Suchfeld in der Liste. */
const SEARCH_FROM = 6;

const FOOT_BUTTON =
  'inline-flex h-[34px] flex-1 cursor-pointer items-center justify-center rounded-[var(--r-sm)] font-mono text-[12px]';

export function DocPicker({ doc }: { doc: OpenedPdf }) {
  const { docs, activate, openFiles, busy, docSort, kindOf } = useDocuments();
  const { annotations } = useViewer();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hide = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);
  useDismiss([anchorRef, popoverRef], open, hide);

  const linked = useMemo(() => linkedSpotsByDoc(annotations.documents), [annotations.documents]);
  const rows = useMemo(
    () => docRows(docs, linked, query, docSort, kindOf),
    [docs, linked, query, docSort, kindOf],
  );
  const heading = useMemo(() => {
    // Überschrift vor der ersten Zeile jeder Art, nur bei Sortierung nach Art.
    const out = new Map<string, DocRow>();
    if (docSort === 'art')
      for (const group of groupByKind(rows)) out.set(group.rows[0].id, group.rows[0]);
    return out;
  }, [rows, docSort]);
  const place = docs.findIndex((entry) => entry.id === doc.id) + 1;

  return (
    <div ref={anchorRef} className="flex min-w-[72px] items-center">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Dokument wählen: ${doc.name}`}
        title={doc.name}
        onClick={() => (open ? hide() : setOpen(true))}
        className={`${DOC_TOOL} min-w-[72px] max-w-[280px] !shrink gap-[6px] aria-expanded:border-accent aria-expanded:bg-accent-soft`}
      >
        <span className="truncate font-semibold">{doc.name}</span>
        {docs.length > 1 && (
          <span className="shrink-0 text-mute">
            · {place} von {docs.length}
          </span>
        )}
        <span aria-hidden="true" className="shrink-0 text-[10px] text-mute">
          ▾
        </span>
      </button>
      <Popover ref={popoverRef} open={open} width={400} anchorRef={anchorRef}>
        <div role="dialog" aria-label="Offene Dokumente" className="flex flex-col">
          {docs.length >= SEARCH_FROM && (
            <input
              type="text"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name suchen"
              aria-label="Dokument suchen"
              className="mx-[4px] mb-[6px] h-[30px] rounded-[var(--r-sm)] border border-line bg-surface px-[10px] font-mono text-[12.5px] text-ink"
            />
          )}
          <div className="grid grid-cols-[1fr_56px_72px] px-[10px] pb-[4px] font-mono text-[11px] text-mute">
            <span>Name</span>
            <span className="text-right">Seiten</span>
            <span className="text-right">Verknüpft</span>
          </div>
          <ul className="m-0 flex max-h-[320px] list-none flex-col overflow-auto p-0">
            {rows.map((row) => {
              const current = row.id === doc.id;
              const head = heading.get(row.id);
              return (
                <li key={row.id}>
                  {head !== undefined && (
                    <span className="flex items-center gap-[8px] px-[10px] pb-[2px] pt-[8px] font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-mute">
                      <KindDot kind={head.kind} />
                      {kindLabel(head.kind)}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-current={current ? 'true' : undefined}
                    onClick={() => {
                      activate(row.id);
                      hide();
                    }}
                    className={`grid min-h-[40px] w-full cursor-pointer grid-cols-[1fr_56px_72px] items-center border-0 px-[10px] text-left font-mono text-[12.5px] ${
                      current
                        ? 'bg-accent-soft font-semibold text-accent-ink shadow-[inset_2px_0_0_var(--accent)]'
                        : 'bg-transparent text-ink hover:bg-sunken'
                    }`}
                  >
                    <span className="truncate" title={row.name}>
                      {row.name}
                    </span>
                    <span className={`text-right ${current ? '' : 'text-dim'}`}>{row.pages}</span>
                    <span className={`text-right ${current ? '' : 'text-dim'}`}>
                      {row.linked === 0 ? '—' : row.linked}
                    </span>
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="px-[10px] py-[8px] font-mono text-[12px] text-mute">Kein Treffer</li>
            )}
          </ul>
          <div className="mt-[6px] flex gap-[6px] border-t border-line px-[4px] pt-[8px]">
            <PdfInput
              label={busy ? 'Öffnet…' : '+ PDF hinzufügen'}
              onFiles={(files) => {
                hide();
                void openFiles(files);
              }}
              className={`${FOOT_BUTTON} border border-dashed border-line2 bg-surface text-dim hover:text-ink`}
            />
          </div>
        </div>
      </Popover>
    </div>
  );
}
