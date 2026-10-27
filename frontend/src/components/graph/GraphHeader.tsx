// Was der Graph gerade zeigt, in zwei kleinen Teilen: oben ein Hinweis, wenn der
// Filter nichts trifft; unten links die Legende — Formen der Positionsarten,
// Hinweis-Ringe und in der Matrix die Abschnittsfarben der Punkte (nach LV zeigen die
// Gruppen den Abschnitt selbst). Die Legende steht fest; Fenster und Hinweisschilder
// weichen ihr aus, nicht umgekehrt.
//
// Unten teilen sich Legende und Steuerung (`controls`) eine Zeile — so können sie sich
// auf kleinen Bildschirmen nicht überdecken. Ist der Graph schmal (`width`), wird die
// Legende ein Knopf, der sie aufklappt, und der Hinweis „Keine Treffer" rückt unter
// die Kennzahlen.

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useDismiss } from '../common/useDismiss';
import { graphOverlayProps } from '../../lib/graph/overlay';
import { formatCount } from '../../lib/format';
import { countInFilter } from '../../lib/tree/countInFilter';
import { useViewer } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** So viele Abschnitte nennt die Legende; der Rest steht im Überblick. */
const MAX_SECTIONS = 6;

/**
 * Unter dieser Graph-Breite (px) ist die Legende ein Knopf: Kennzahlen (~310 px) oben
 * und Steuerung (~370 px) unten ließen ihr sonst keinen Platz.
 */
export const LEGEND_FULL_MIN_WIDTH = 720;

/** Unter dieser Graph-Breite (px) steht „Keine Treffer" unter den Kennzahlen statt mittig. */
export const HEADER_NARROW_WIDTH = 800;

/** Abstand von oben für Hinweise unter den Kennzahlen (16 + ~62 Höhe + Luft). */
export const BELOW_KPIS = 'top-[88px]';

function Dot({ shape }: { shape: 'normal' | 'bedarf' | 'wahl' | 'zulage' }) {
  return (
    <svg width="12" height="12" aria-hidden="true">
      {shape === 'bedarf' ? (
        <circle cx="6" cy="6" r="3.6" fill="var(--surface)" stroke="var(--dim)" strokeWidth="1.6" />
      ) : shape === 'wahl' ? (
        <rect x="3" y="3" width="6" height="6" fill="var(--dim)" transform="rotate(45 6 6)" />
      ) : (
        <circle cx="6" cy="6" r="4.4" fill="var(--dim)" />
      )}
      {shape === 'zulage' && <circle cx="6" cy="6" r="1.4" fill="var(--surface)" />}
    </svg>
  );
}

function Ring({ strong }: { strong: boolean }) {
  return (
    <svg width="14" height="14" aria-hidden="true">
      <circle cx="7" cy="7" r="2.6" fill="var(--dim)" />
      <circle
        cx="7"
        cy="7"
        r="5.6"
        fill="none"
        stroke={strong ? 'var(--amber)' : 'var(--mute)'}
        strokeWidth="1.4"
        strokeDasharray={strong ? undefined : '2.5 1.5'}
      />
    </svg>
  );
}

export interface GraphHeaderProps {
  root: LVNode;
  /** Breite des Graphen in px; ohne Angabe gilt er als breit. */
  width?: number;
  /** Steuerung unten rechts (Zoom, Hinweise, Darstellung). */
  controls?: ReactNode;
}

export function GraphHeader({ root, width, controls }: GraphHeaderProps) {
  const {
    view: {
      graph: { layout, spotlight },
    },
    matches,
  } = useViewer();

  const keineTreffer = matches.filtering && (matches.counts.get(root.id) ?? 0) === 0;
  const narrow = width !== undefined && width < HEADER_NARROW_WIDTH;
  const compact = width !== undefined && width < LEGEND_FULL_MIN_WIDTH;
  // Rechts oben steht dann die Hervorhebung (BubbleGraph) — „Keine Treffer" darunter.
  const spotlighted = layout === 'lv' && spotlight !== null;

  return (
    <>
      {keineTreffer && (
        <div
          className={`pointer-events-none absolute z-[7] flex gap-[8px] ${
            narrow
              ? `left-[16px] ${spotlighted && compact ? 'top-[132px]' : BELOW_KPIS}`
              : 'left-1/2 top-[16px] -translate-x-1/2'
          }`}
        >
          <span className="ov-pill inline-flex h-[32px] items-center px-[14px] font-mono text-[12px] text-dim">
            Keine Treffer
          </span>
        </div>
      )}

      <div
        {...graphOverlayProps}
        className={`pointer-events-none absolute inset-x-[16px] bottom-[16px] z-[8] flex items-end justify-between gap-[8px] ${
          // Schmal darf die Steuerung über den Knopf rutschen; breit schrumpft die Legende.
          compact ? 'flex-wrap-reverse' : ''
        }`}
      >
        {/* Neuer Zustand beim Wechsel: sonst klappte sie beim Schmalwerden von selbst auf. */}
        <Legend key={compact ? 'knopf' : 'voll'} compact={compact} />
        {controls}
      </div>
    </>
  );
}

/** Legende; schmal als Knopf „Legende", der sie darüber aufklappt. */
function Legend({ compact }: { compact: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, compact && open, close);

  if (!compact) {
    return (
      <div
        aria-label="Legende"
        className="ov-glass pointer-events-auto flex min-w-0 max-w-[560px] flex-col gap-[6px] !rounded-[var(--r-md)] px-[12px] py-[8px] font-mono text-[11px] text-dim"
      >
        <LegendBody />
      </div>
    );
  }
  return (
    <div ref={ref} className="pointer-events-auto relative shrink-0">
      {open && (
        <div
          aria-label="Legende"
          className="ov-glass absolute bottom-[calc(100%+8px)] left-0 flex w-[300px] max-w-[calc(100vw-32px)] flex-col gap-[6px] !rounded-[var(--r-md)] px-[12px] py-[8px] font-mono text-[11px] text-dim"
        >
          <LegendBody />
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`ov-pill inline-flex h-[38px] cursor-pointer items-center gap-[6px] px-[14px] font-mono text-[11.5px] ${
          open ? 'text-accent-ink' : 'text-dim hover:text-ink'
        }`}
      >
        <Dot shape="normal" />
        Legende
      </button>
    </div>
  );
}

function LegendBody() {
  const {
    view: {
      graph: { showHints, layout },
    },
    matches,
    hints,
    sectionColors,
  } = useViewer();
  const hintCount = useMemo(
    () => countInFilter(hints.keys(), hints.size, matches),
    [hints, matches],
  );
  const sections = layout === 'matrix' ? sectionColors.entries.slice(0, MAX_SECTIONS) : [];
  const more = sections.length === 0 ? 0 : sectionColors.entries.length - sections.length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px]">
        <span className="inline-flex items-center gap-[5px]">
          <Dot shape="normal" />
          Normal
        </span>
        <span className="inline-flex items-center gap-[5px]">
          <Dot shape="bedarf" />
          Bedarf
        </span>
        <span className="inline-flex items-center gap-[5px]">
          <Dot shape="wahl" />
          Wahl
        </span>
        <span className="inline-flex items-center gap-[5px]">
          <Dot shape="zulage" />
          Zulage
        </span>
        {showHints && hintCount > 0 && (
          <>
            <span className="inline-flex items-center gap-[5px]">
              <Ring strong />
              beachten
            </span>
            <span className="inline-flex items-center gap-[5px]">
              <Ring strong={false} />
              Hinweis
            </span>
            <span title="Positionen, an denen eine Prüfregel etwas gefunden hat">
              {formatCount(hintCount)} mit Hinweis
            </span>
          </>
        )}
      </div>
      {sections.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px]">
          {sections.map(({ key, label, color }) => (
            <span
              key={key}
              title={label}
              className="inline-flex max-w-[160px] items-center gap-[5px]"
            >
              <span
                aria-hidden="true"
                className="h-[9px] w-[9px] shrink-0 rounded-full"
                style={{
                  background: color.replace('var(--cat-', 'var(--dot-'),
                  boxShadow: 'inset 0 0 0 0.6px var(--dot-line)',
                }}
              />
              <span className="truncate">{label}</span>
            </span>
          ))}
          {more > 0 && <span className="text-mute">+{formatCount(more)} Abschnitte</span>}
        </div>
      )}
    </>
  );
}
