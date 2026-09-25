// Kopfzeile über dem Graphen: Kennzahlen + Umschalter für den Größenmodus und
// für die Trefferansicht (WP-Q, Issue #60). Portiert aus `CenterHint` in
// design/claude-design/lv-main.jsx.

import { useMemo } from 'react';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SIZE_MODES } from '../../lib/graph/constants';
import { FOCUS_GROUP_LABELS, type FocusGroupBy } from '../../lib/graph/focusTree';
import { formatCount, truncate } from '../../lib/format';
import { useViewer, useViewerDispatch, type GraphFocus, type SizeModeId } from '../../state/viewer';
import type { MatchIndex } from '../../lib/tree/matchCounts';
import type { LVNode } from '../../types/lvNode';

const FOCUS_OPTIONS: ReadonlyArray<{ value: GraphFocus; label: string; title: string }> = [
  {
    value: 'structure',
    label: 'GESAMTER GRAPH',
    title: 'Das ganze LV zeigen, Treffer darin hervorheben.',
  },
  {
    value: 'isolate',
    label: 'ISOLATION',
    title: 'Nur die Treffer zeigen, neu gebündelt — alles andere tritt weg.',
  },
];

const GROUP_OPTIONS: readonly FocusGroupBy[] = ['abschnitt', 'gewerk', 'bauteiltyp'];

/**
 * Zahl für eine Legende in der Kopfzeile, **im aktuellen Filter** gezählt.
 *
 * Ohne Filter ist es schlicht die Größe der Menge; mit Filter zählen nur die
 * Positionen, die er durchlässt — sonst stünde hier eine Zahl für das ganze LV,
 * während im Graphen daneben eine Teilmenge steht (.claude/CLAUDE.md: ein
 * Filterzustand, alle Ansichten).
 *
 * Eine Stelle für alle Legenden: als zweite Schleife daneben driftete die
 * nächste Zahl wieder ab.
 */
function imFilter(ids: Iterable<string>, groesse: number, matches: MatchIndex): number {
  if (!matches.filtering) return groesse;
  let count = 0;
  for (const id of ids) if ((matches.counts.get(id) ?? 0) > 0) count += 1;
  return count;
}

export function GraphHeader({ root }: { root: LVNode }) {
  const {
    view: {
      graph: { sizeMode, focus: focusMode, groupBy, highlightCluster },
    },
    matches,
    focus,
    quantities,
    hints,
    clusters,
    lv,
  } = useViewer();
  const dispatch = useViewerDispatch();

  // Filter ohne Treffer: dann gibt es nichts zu isolieren, und der Graph zeigt
  // weiter das ganze LV — gedämpft bzw. ausgeblendet, je nach Modus. Das muss
  // dastehen, sonst behauptet der Umschalter „Isolation", während das volle LV
  // auf dem Schirm steht.
  const treffer = matches.counts.get(root.id) ?? 0;
  const keineTreffer = matches.filtering && treffer === 0;

  // Legende und Zahl in einem: der Ring an der Bubble braucht eine Erklärung,
  // und wie viele Positionen ihn tragen, will man ohnehin wissen (WP-R).
  const hintCount = useMemo(() => imFilter(hints.keys(), hints.size, matches), [hints, matches]);
  // Dasselbe für den gestrichelten Ring der Ähnlichkeit (WP-R, R2).
  const gruppiert = useMemo(
    () => imFilter(clusters.keys(), clusters.size, matches),
    [clusters, matches],
  );

  // Hervorgehobene Ähnlichkeitsgruppe (WP-R, R2): Wer sie eingeschaltet hat,
  // muss sie auch wieder loswerden — ohne diese Zeile bliebe nur Escape, und
  // das findet niemand von selbst.
  const hervorgehoben =
    highlightCluster === null
      ? null
      : (lv?.relations.clusters.find((cluster) => cluster.id === highlightCluster) ?? null);

  const lots = root.children.length;
  const sections = root.children.reduce((total, lot) => total + lot.children.length, 0);
  // x83-Dateien führen keine Einheitspreise — der Größenmodus "Gesamtpreis"
  // wäre dann für das ganze LV 0 (docs/implementation-plan.md, WP-D). Die
  // Option wird deshalb gesperrt statt still auf "Anzahl" zurückzufallen: sonst
  // sieht der Knopf gewählt aus und im Graphen ändert sich nichts.
  const priceless = root.totalPrice === 0;

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-[14px] z-[1] flex justify-center px-[14px]">
      <div
        className="pointer-events-auto inline-flex max-w-full flex-wrap items-center justify-center gap-x-[12px] gap-y-[6px] border border-line py-[5px] pl-[14px] pr-[6px]"
        style={{ background: 'var(--scrim)', boxShadow: 'var(--shadow-hairline)' }}
      >
        <span className="font-mono text-[9px] tracking-[0.6px] text-mute">
          {formatCount(lots)} LOSE · {formatCount(sections)} ABSCHNITTE ·{' '}
          {formatCount(root.positionCount)} POS.
          {focus !== null && (
            <>
              {' · '}
              <span className="text-ink">
                {formatCount(focus.hitCount)} TREFFER IN {formatCount(focus.groupCount)} GRUPPEN
              </span>
            </>
          )}
          {keineTreffer && (
            <>
              {' · '}
              <span className="text-ink">
                KEINE TREFFER{focusMode === 'isolate' ? ' — NICHTS ZU ISOLIEREN' : ''}
              </span>
            </>
          )}
          {' · GRÖSSE'}
        </span>
        {hervorgehoben !== null && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'highlightCluster', id: null })}
            title="Hervorhebung der Ähnlichkeitsgruppe aufheben (oder Escape)"
            className="inline-flex max-w-[280px] cursor-pointer items-center gap-[6px] border border-line bg-white px-[7px] py-[2px] font-mono text-[9px] tracking-[0.6px] text-ink hover:text-blue focus-visible:text-blue"
          >
            <span className="truncate">
              ÄHNLICHE: {truncate(hervorgehoben.label, 28).toUpperCase()} ·{' '}
              {formatCount(hervorgehoben.positionIds.length)}
            </span>
            <span aria-hidden="true">✕</span>
          </button>
        )}
        {hervorgehoben === null && gruppiert > 0 && (
          <span
            className="inline-flex items-center gap-[4px] font-mono text-[9px] tracking-[0.6px] text-mute"
            title="Gestrichelter Ring an der Bubble: zu dieser Position gibt es ähnliche. Er erscheint, sobald du nah genug herangezoomt hast."
          >
            <svg width="12" height="12" aria-hidden="true">
              <circle cx="6" cy="6" r="2.2" fill="var(--bub-position-line)" />
              <circle
                cx="6"
                cy="6"
                r="4.8"
                fill="none"
                stroke="var(--line2)"
                strokeWidth="1"
                strokeDasharray="1.5 2.5"
              />
            </svg>
            {formatCount(gruppiert)} MIT ÄHNLICHEN
          </span>
        )}
        {hintCount > 0 && (
          <span
            className="inline-flex items-center gap-[4px] font-mono text-[9px] tracking-[0.6px] text-mute"
            title="Ring an der Bubble: an dieser Position hat mindestens eine Prüfregel etwas gefunden. Er erscheint, sobald du nah genug herangezoomt hast."
          >
            <svg width="12" height="12" aria-hidden="true">
              <circle cx="6" cy="6" r="2.2" fill="var(--bub-position-line)" />
              <circle cx="6" cy="6" r="4.6" fill="none" stroke="var(--amber)" strokeWidth="1.2" />
            </svg>
            {formatCount(hintCount)} MIT HINWEIS
          </span>
        )}
        <SegmentedControl
          label="Größe der Bubbles"
          options={SIZE_MODES.map((mode) => {
            // Ein Modus, der für die geladene Datei bzw. den aktuellen Filter
            // nichts aussagt, wird gesperrt statt still auf „Anzahl"
            // zurückzufallen: sonst sieht der Knopf gewählt aus und im Graphen
            // ändert sich nichts.
            const gesperrt =
              (mode.id === 'cost' && priceless) ||
              (mode.id === 'quantity' && quantities.unit === null);
            const grund =
              mode.id === 'cost'
                ? 'Diese Datei führt keine Einheitspreise — Größe nach Gesamtpreis ist hier ohne Aussage.'
                : 'Mengen lassen sich nur innerhalb einer Einheit vergleichen. Filtere auf eine Einheit, dann greift dieser Modus.';
            const beschriftung =
              mode.id === 'quantity' && quantities.unit !== null
                ? `${mode.short} ${quantities.unit}`
                : mode.short;
            return {
              value: mode.id,
              label: gesperrt ? `${mode.short} ·—` : beschriftung,
              disabled: gesperrt,
              title: gesperrt ? grund : mode.label,
            };
          })}
          value={sizeMode}
          onChange={(value) => dispatch({ type: 'sizeMode', value: value as SizeModeId })}
        />

        {/* Die Trefferansicht steht nur zur Wahl, solange es Treffer zu zeigen
            gibt — ohne Filter zeigt der Graph immer die Struktur. */}
        {matches.filtering && (
          <>
            <span className="font-mono text-[9px] tracking-[0.6px] text-mute">TREFFER</span>
            <SegmentedControl
              label="Trefferansicht"
              options={FOCUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
                title: option.title,
              }))}
              value={focusMode}
              onChange={(value) => dispatch({ type: 'graphFocus', value: value as GraphFocus })}
            />
          </>
        )}

        {matches.filtering && focusMode !== 'structure' && (
          <>
            <span className="font-mono text-[9px] tracking-[0.6px] text-mute">BÜNDELN NACH</span>
            <SegmentedControl
              label="Treffer bündeln nach"
              options={GROUP_OPTIONS.map((id) => ({
                value: id,
                label: FOCUS_GROUP_LABELS[id].toUpperCase(),
                title: `Treffer nach ${FOCUS_GROUP_LABELS[id]} bündeln`,
              }))}
              value={groupBy}
              onChange={(value) => dispatch({ type: 'focusGroupBy', value: value as FocusGroupBy })}
            />
          </>
        )}
      </div>
    </div>
  );
}
