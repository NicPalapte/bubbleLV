// Übersicht im Bereich „Dokument“ (Entscheidung 0094): alle offenen PDFs als Miniatur der
// ersten Seite, mit Suche im Namen und Sortierung. Ein Klick öffnet das PDF zum Lesen.
// Gruppieren (z. B. nach Dokumentart) kommt erst, wenn der Kern die Art liefert.

import { useEffect, useMemo, useState } from 'react';
import { useDocuments } from './DocumentsProvider';
import { DOC_TOOL, PdfInput } from './PdfInput';
import {
  DOC_SORT_LABEL,
  docRows,
  linkedSpotsByDoc,
  type DocRow,
  type DocSort,
} from '../../lib/docs/docList';
import type { OpenedPdf } from '../../lib/docs/pdf';
import { THUMB_WIDTH, thumbnailOf } from '../../lib/docs/thumbnail';
import { useViewer } from '../../state/viewer';

const SORTS: readonly DocSort[] = ['geoeffnet', 'name', 'verknuepft'];

/** Höhe der Bildfläche einer Karte; Hochformat passt ganz, Pläne quer liegen mittig. */
const THUMB_BOX = 156;

function Thumbnail({ doc }: { doc: OpenedPdf }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void thumbnailOf(doc.pdf).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [doc.pdf]);
  return src === null ? (
    <span aria-hidden="true" className="h-[120px] w-[86px] border border-line bg-surface" />
  ) : (
    <img
      src={src}
      alt=""
      className="max-h-full max-w-full border border-line object-contain shadow-[var(--shadow-sm)]"
    />
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.5 6.5v4.5M9.5 6.5v4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocCard({ row, doc, current }: { row: DocRow; doc: OpenedPdf; current: boolean }) {
  const { activate, close } = useDocuments();
  return (
    <li className="relative flex">
      <button
        type="button"
        onClick={() => activate(row.id)}
        aria-current={current ? 'true' : undefined}
        title={row.name}
        className={`flex w-full cursor-pointer flex-col overflow-hidden rounded-[var(--r-md)] bg-surface p-0 text-left font-mono text-ink ${
          current ? 'border-2 border-accent' : 'border border-line hover:border-line2'
        }`}
      >
        <span
          className="relative flex w-full items-center justify-center border-b border-line bg-panel p-[10px]"
          style={{ height: THUMB_BOX }}
        >
          <Thumbnail doc={doc} />
          {row.linked > 0 && (
            <span className="absolute right-[8px] top-[8px] rounded-[var(--r-pill)] border border-line bg-surface px-[7px] py-[1px] text-[11px] text-ink">
              {row.linked} verknüpft
            </span>
          )}
        </span>
        <span className="flex flex-col gap-[2px] py-[8px] pl-[10px] pr-[42px]">
          <span className="truncate text-[12.5px] font-semibold">{row.name}</span>
          <span className="text-[11px] text-mute">
            {row.pages} {row.pages === 1 ? 'Seite' : 'Seiten'}
          </span>
        </span>
      </button>
      {/* Nur hier entfernt man ein PDF ganz (Nico, 06.11.2026); Notizen dazu bleiben. */}
      <button
        type="button"
        aria-label={`${row.name} entfernen`}
        title="PDF entfernen — Notizen und Messungen bleiben"
        onClick={() => close(row.id)}
        className="absolute bottom-[8px] right-[8px] inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border border-line bg-surface p-0 text-mute hover:border-line2 hover:text-ink"
      >
        <TrashIcon />
      </button>
    </li>
  );
}

export function DocOverview() {
  const {
    docs,
    active,
    openFiles,
    setOverview,
    busy,
    error,
    ansatzFor,
    setAnsatzFor,
    planWanted,
    donePlanWanted,
  } = useDocuments();
  const { annotations, index } = useViewer();
  // Ansatz ohne Plan gestartet: hier wird der Plan gewählt; danach kein Rücksprung mehr.
  useEffect(() => {
    if (planWanted) donePlanWanted();
  }, [planWanted, donePlanWanted]);
  const ansatzOz =
    ansatzFor === null
      ? null
      : (index.nodes[index.slotOf.get(ansatzFor) ?? -1]?.position?.oz ?? 'Position');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DocSort>('geoeffnet');
  const linked = useMemo(() => linkedSpotsByDoc(annotations.documents), [annotations.documents]);
  const rows = useMemo(() => docRows(docs, linked, query, sort), [docs, linked, query, sort]);
  const byId = useMemo(() => new Map(docs.map((doc) => [doc.id, doc])), [docs]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-[6px] border-b border-line px-[10px] py-[6px]">
        <div
          role="group"
          aria-label="Darstellung"
          className="flex rounded-[var(--r-sm)] bg-sunken p-[2px]"
        >
          <button
            type="button"
            aria-pressed="true"
            className="h-[22px] cursor-default rounded-[5px] border border-line bg-surface px-[10px] font-mono text-[11.5px] font-semibold text-ink shadow-[var(--shadow-sm)]"
          >
            Übersicht · {docs.length}
          </button>
          <button
            type="button"
            aria-pressed="false"
            disabled={active === null}
            onClick={() => setOverview(false)}
            className="h-[22px] cursor-pointer rounded-[5px] border-0 bg-transparent px-[10px] font-mono text-[11.5px] text-dim hover:text-ink"
          >
            Lesen
          </button>
        </div>
        <span className="flex-1" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name suchen"
          aria-label="Dokument suchen"
          className="h-[26px] w-[160px] rounded-[var(--r-sm)] border border-line bg-surface px-[8px] font-mono text-[11.5px] text-ink"
        />
        <label className="flex items-center gap-[4px] font-mono text-[11.5px] text-mute">
          Sortieren
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as DocSort)}
            className="h-[26px] rounded-[var(--r-sm)] border border-line bg-surface px-[6px] font-mono text-[11.5px] text-ink"
          >
            {SORTS.map((value) => (
              <option key={value} value={value}>
                {DOC_SORT_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <PdfInput
          label={busy ? 'Öffnet…' : '+ PDF hinzufügen'}
          onFiles={(files) => void openFiles(files)}
          className={`${DOC_TOOL} border-dashed border-line2 text-dim`}
        />
      </div>
      {ansatzOz !== null && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-[8px] border-b border-line bg-accent-soft px-[12px] py-[6px] font-sans text-[12.5px] text-accent-ink"
        >
          <span className="flex-1">Ansatz für {ansatzOz}: PDF mit dem Plan wählen</span>
          <button type="button" className="cn-btn" onClick={() => setAnsatzFor(null)}>
            Abbrechen
          </button>
        </div>
      )}
      {error !== null && (
        <div
          role="alert"
          className="shrink-0 border-b border-line bg-amberS px-[12px] py-[6px] font-mono text-[11.5px] text-amber"
        >
          {error}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto bg-panel p-[16px]">
        <ul
          aria-label="Offene Dokumente"
          className="m-0 grid list-none gap-[14px] p-0"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_WIDTH}px, 1fr))` }}
        >
          {rows.map((row) => {
            const doc = byId.get(row.id);
            return doc === undefined ? null : (
              <DocCard key={row.id} row={row} doc={doc} current={row.id === active?.id} />
            );
          })}
        </ul>
        {rows.length === 0 && <p className="m-0 font-mono text-[12px] text-mute">Kein Treffer</p>}
      </div>
    </div>
  );
}
