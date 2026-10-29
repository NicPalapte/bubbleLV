// Eigenes Suchfeld fürs PDF (Entscheidung 0084): sucht nur in den offenen PDFs, nie im
// LV. Treffer zählen fürs PDF, das zu sehen ist; die anderen offenen PDFs stehen mit ihrer
// Zahl in einer kleinen Liste darunter, ein Klick wechselt dorthin.
// Strg/Cmd + F holt das Feld, wenn man zuletzt ins Dokument geklickt hat — im eigenen
// Browserfenster immer.

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useDocuments } from './DocumentsProvider';
import { useHostWindow } from '../common/hostWindow';
import { docNeedleOf } from '../../lib/docs/docSearch';
import { formatCount } from '../../lib/format';

const ROW =
  'flex w-full cursor-pointer items-center justify-between gap-[8px] rounded-[6px] border-none px-[8px] py-[5px] text-left font-mono text-[11.5px] [@media(pointer:coarse)]:py-[9px]';

export interface DocSearchFieldProps {
  /** Der Bereich „Dokument“: Klicks darin machen Strg F zur PDF-Suche. */
  rootRef: RefObject<HTMLElement | null>;
  /** Treffer im PDF, das zu sehen ist, und der gerade gezeigte (ab 0). */
  hitCount: number;
  hitIndex: number;
  onStep: (step: number) => void;
}

export function DocSearchField({ rootRef, hitCount, hitIndex, onStep }: DocSearchFieldProps) {
  const { docs, active, activate, docSearch, setDocSearch, searchHits } = useDocuments();
  const host = useHostWindow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const needle = docNeedleOf(docSearch);

  useEffect(() => {
    // Im Hauptfenster gehört Strg F dem Browser, außer man arbeitet gerade im Dokument.
    const own = host !== window;
    let inside = false;
    const onDown = (event: PointerEvent): void => {
      inside = rootRef.current?.contains(event.target as Node | null) ?? false;
    };
    const onKey = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'f') return;
      const target = event.target as Node | null;
      if (!own && !inside && !(rootRef.current?.contains(target) ?? false)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    host.addEventListener('pointerdown', onDown, true);
    host.addEventListener('keydown', onKey);
    return () => {
      host.removeEventListener('pointerdown', onDown, true);
      host.removeEventListener('keydown', onKey);
    };
  }, [host, rootRef]);

  const others = docs.length > 1 && needle !== '' && focused;

  return (
    <div className="relative">
      <label className="flex h-[26px] items-center gap-[4px] rounded-[var(--r-pill)] border border-line bg-surface pl-[8px] pr-[6px] focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        <span aria-hidden="true" className="text-[12px] text-mute">
          ⌕
        </span>
        <input
          ref={inputRef}
          aria-label="Im PDF suchen"
          value={docSearch}
          onChange={(event) => setDocSearch(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onStep(event.shiftKey ? -1 : 1);
            if (event.key === 'Escape') event.currentTarget.blur();
          }}
          placeholder="Im PDF suchen"
          className="w-[130px] border-none bg-transparent font-mono text-[11.5px] text-ink outline-none placeholder:text-mute"
        />
        {needle !== '' && (
          <span className="font-mono text-[11px] text-mute">
            {hitCount === 0 ? '0' : `${hitIndex + 1}/${formatCount(hitCount)}`}
          </span>
        )}
      </label>
      {others && (
        <div
          role="group"
          aria-label="Treffer in offenen PDFs"
          className="ov-window absolute right-0 top-[32px] z-[30] flex w-[260px] flex-col gap-[2px] p-[6px]"
        >
          {docs.map((doc) => {
            const hits = searchHits.get(doc.id);
            const on = doc.id === active?.id;
            return (
              <button
                key={doc.id}
                type="button"
                // Kein Blur vor dem Klick: sonst verschwindet die Liste unter dem Zeiger.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => activate(doc.id)}
                aria-current={on ? 'true' : undefined}
                className={`${ROW} ${
                  on ? 'bg-accent-soft text-accent-ink' : 'bg-transparent text-ink hover:bg-sunken'
                }`}
              >
                <span className="truncate">{doc.name}</span>
                <span className="shrink-0 text-mute">
                  {hits === undefined ? '…' : formatCount(hits.length)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
