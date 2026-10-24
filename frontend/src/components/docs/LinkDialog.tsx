// „Mit Position verknüpfen": eine Stelle im Begleitdokument von Hand mit einer oder
// mehreren Positionen verbinden (Entscheidung 0072). Vorgewählt ist die Position,
// die gerade ausgewählt ist; weitere findet die Suche — über dieselbe
// Filterentscheidung wie überall (`matchFacts`). Conocto schlägt nichts vor.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHostWindow } from '../common/hostWindow';
import { EMPTY_FILTERS, matchFacts, prepareFilters } from '../../lib/matchPos';
import { useViewer } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

const WIDTH = 340;
/** Mehr Treffer zeigt die Liste nicht; die Suche grenzt weiter ein. */
const MAX_HITS = 40;

const ROW =
  'flex w-full cursor-pointer items-start gap-[10px] border-none bg-transparent px-[12px] py-[7px] text-left hover:bg-sunken';

export function LinkDialog({
  left,
  top,
  already,
  onLink,
  onClose,
}: {
  left: number;
  top: number;
  /** Schon verknüpfte Positionen (Knoten-IDs) — sie stehen abgehakt und grau da. */
  already: readonly string[];
  onLink: (ids: string[]) => void;
  onClose: () => void;
}) {
  const host = useHostWindow();
  const { index, selectedPosition } = useViewer();
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<ReadonlySet<string>>(() =>
    selectedPosition === null || already.includes(selectedPosition.id)
      ? new Set()
      : new Set([selectedPosition.id]),
  );

  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (!(ref.current?.contains(event.target as Node) ?? false)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    host.document.addEventListener('mousedown', onDown);
    host.document.addEventListener('keydown', onKey);
    return () => {
      host.document.removeEventListener('mousedown', onDown);
      host.document.removeEventListener('keydown', onKey);
    };
  }, [host, onClose]);

  const hits = useMemo<LVNode[]>(() => {
    if (query.trim() === '') return [];
    const active = prepareFilters(EMPTY_FILTERS, query);
    const out: LVNode[] = [];
    for (let slot = 0; slot < index.size && out.length < MAX_HITS; slot++) {
      if (matchFacts(index.facts[slot], active)) out.push(index.nodes[slot]);
    }
    return out;
  }, [index, query]);

  const byId = (id: string): LVNode | null => {
    const slot = index.slotOf.get(id);
    return slot === undefined ? null : index.nodes[slot];
  };
  const pickedNodes = [...picked].map(byId).filter((node): node is LVNode => node !== null);
  const alreadyNodes = already.map(byId).filter((node): node is LVNode => node !== null);
  const toggle = (id: string): void => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const row = (node: LVNode, done: boolean) => (
    <label key={node.id} className={`${ROW} ${done ? 'cursor-default opacity-60' : ''}`}>
      <input
        type="checkbox"
        checked={done || picked.has(node.id)}
        disabled={done}
        onChange={() => toggle(node.id)}
        className="mt-[3px] accent-[var(--blue)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[11.5px] text-dim">{node.position?.oz}</span>
        <span className="block truncate font-sans text-[13px] text-ink">
          {node.position?.shortText ?? node.label}
        </span>
      </span>
    </label>
  );

  const shownHits = hits.filter((node) => !picked.has(node.id) && !already.includes(node.id));
  const x = Math.max(8, Math.min(left, host.innerWidth - WIDTH - 8));
  const y = Math.max(8, Math.min(top, host.innerHeight - 420));

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Mit Position verknüpfen"
      data-keeps-popover=""
      className="ov-window fixed z-[70] flex max-h-[420px] flex-col overflow-hidden"
      style={{ left: x, top: y, width: WIDTH }}
    >
      <label className="flex items-center gap-[8px] border-b border-line px-[12px] py-[9px]">
        <span className="sr-only">Position suchen</span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="OZ oder Text suchen"
          className="min-w-0 flex-1 border-none bg-transparent font-sans text-[13px] text-ink outline-none"
        />
      </label>
      <div className="min-h-0 flex-1 overflow-auto py-[4px]">
        {alreadyNodes.length > 0 && (
          <>
            <div className="px-[12px] pb-[2px] pt-[6px] font-mono text-[11px] text-mute">
              Schon verknüpft
            </div>
            {alreadyNodes.map((node) => row(node, true))}
          </>
        )}
        {pickedNodes.length > 0 && (
          <>
            <div className="px-[12px] pb-[2px] pt-[6px] font-mono text-[11px] text-mute">
              Gewählt
            </div>
            {pickedNodes.map((node) => row(node, false))}
          </>
        )}
        {query.trim() !== '' && (
          <>
            <div className="px-[12px] pb-[2px] pt-[6px] font-mono text-[11px] text-mute">
              Treffer
            </div>
            {shownHits.length === 0 ? (
              <div className="px-[12px] py-[6px] font-mono text-[12px] text-mute">Keine</div>
            ) : (
              shownHits.map((node) => row(node, false))
            )}
          </>
        )}
        {query.trim() === '' && pickedNodes.length === 0 && (
          <div className="px-[12px] py-[8px] font-mono text-[12px] text-mute">
            Position wählen oder suchen
          </div>
        )}
      </div>
      <div className="flex justify-end gap-[8px] border-t border-line bg-sunken px-[12px] py-[9px]">
        <button
          type="button"
          onClick={onClose}
          className="h-[30px] cursor-pointer rounded-[var(--r-sm)] border border-line bg-surface px-[12px] font-mono text-[12px] text-ink hover:border-line2"
        >
          Abbrechen
        </button>
        <button
          type="button"
          disabled={picked.size === 0}
          onClick={() => onLink([...picked])}
          className="h-[30px] cursor-pointer rounded-[var(--r-sm)] border-none bg-blueF px-[12px] font-mono text-[12px] font-semibold text-white hover:bg-blueFH disabled:cursor-default disabled:opacity-40"
        >
          {picked.size <= 1 ? 'Verknüpfen' : `${picked.size} verknüpfen`}
        </button>
      </div>
    </div>,
    host.document.body,
  );
}
