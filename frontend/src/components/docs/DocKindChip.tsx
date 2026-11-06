// Etikett „Dokumentart“ an einem PDF (Entscheidung 0096): zeigt die geltende Art,
// antippen öffnet die Liste aller Arten. Oben steht, woran die Art erkannt wurde;
// „Zurück auf erkannte Art“ nimmt eine Wahl von Hand wieder weg.

import { useCallback, useRef, useState } from 'react';
import { DOC_KIND_LABEL, DOC_KINDS, type DocKind, type DocKindGuess } from '@core';
import { kindDot, kindLabel, NOT_FOUND_LABEL } from '../../lib/docs/docKindLook';
import { useDocuments } from './DocumentsProvider';
import { useDismiss } from '../common/useDismiss';
import { Popover } from '../ui/Popover';

function reasonOf(guess: DocKindGuess | null): string {
  if (guess === null) return 'Erste Seite wird gelesen …';
  if (guess.rule === 'name') return `Erkannt am Namen: „${guess.hit ?? ''}“`;
  if (guess.rule === 'titel') return `Erkannt am Titel auf Seite 1: „${guess.hit ?? ''}“`;
  if (guess.rule === 'format') return 'Erkannt am Format: größer als A3';
  return NOT_FOUND_LABEL;
}

export function KindDot({ kind }: { kind: DocKind | null }) {
  return (
    <span
      aria-hidden="true"
      className="h-[7px] w-[7px] shrink-0 rounded-full"
      style={{ background: kindDot(kind) }}
    />
  );
}

export function DocKindChip({ id, name }: { id: string; name: string }) {
  const { kindOf, setKind } = useDocuments();
  const { kind, manual, guess } = kindOf(id);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hide = useCallback(() => setOpen(false), []);
  useDismiss([anchorRef, popoverRef], open, hide);
  const choose = (next: DocKind | null): void => {
    setKind(id, next);
    hide();
  };
  const missing = kind === null;

  return (
    <div ref={anchorRef} className="flex min-w-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Dokumentart von ${name}: ${kindLabel(kind)}. Ändern`}
        title={manual ? 'Von Hand gewählt' : reasonOf(guess)}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-[26px] min-w-0 cursor-pointer items-center gap-[6px] rounded-[var(--r-pill)] border px-[9px] font-mono text-[11.5px] font-semibold ${
          missing
            ? 'border-amber bg-amberS text-amber'
            : manual
              ? 'border-dim bg-surface text-ink'
              : 'border-line bg-sunken text-ink'
        } aria-expanded:border-accent aria-expanded:bg-accent-soft aria-expanded:text-accent-ink`}
      >
        <KindDot kind={kind} />
        <span className="truncate">{missing ? 'Art wählen' : kindLabel(kind)}</span>
        <span aria-hidden="true" className="shrink-0 text-[10px]">
          ▾
        </span>
      </button>
      <Popover ref={popoverRef} open={open} width={280} anchorRef={anchorRef}>
        <div role="dialog" aria-label="Dokumentart wählen" className="flex flex-col">
          <div className="flex flex-col gap-[2px] border-b border-line px-[10px] pb-[8px]">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-mute">
              Dokumentart
            </span>
            <span className="font-sans text-[12px] text-dim">
              {manual ? `Von Hand gewählt · ${reasonOf(guess)}` : reasonOf(guess)}
            </span>
          </div>
          <ul className="m-0 flex max-h-[360px] list-none flex-col overflow-auto p-0 py-[4px]">
            {DOC_KINDS.map((option) => {
              const current = option === kind;
              return (
                <li key={option}>
                  <button
                    type="button"
                    aria-pressed={current}
                    onClick={() => choose(option === guess?.kind ? null : option)}
                    className={`flex min-h-[44px] w-full cursor-pointer items-center gap-[10px] border-0 px-[12px] text-left font-mono text-[13px] ${
                      current
                        ? 'bg-accent-soft font-semibold text-accent-ink shadow-[inset_2px_0_0_var(--accent)]'
                        : 'bg-transparent text-ink hover:bg-sunken'
                    }`}
                  >
                    <KindDot kind={option} />
                    <span className="flex-1">{DOC_KIND_LABEL[option]}</span>
                    {current && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {manual && (
            <div className="border-t border-line px-[4px] pt-[8px]">
              <button
                type="button"
                onClick={() => choose(null)}
                className="inline-flex h-[44px] w-full cursor-pointer items-center justify-center rounded-[var(--r-sm)] border border-dashed border-line2 bg-surface font-mono text-[12.5px] text-dim hover:text-ink"
              >
                Zurück auf erkannte Art
              </button>
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
}
