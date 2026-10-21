// Positionskarte im Graphen (docs/decisions/0034-graph-als-hauptscreen.md):
// Kopf mit OZ und Hauptabschnitt, Kennzahlen (Menge · EP · Positionsart), Hinweise,
// Langtext mit Fundstellen und eine Eigenschaftstabelle.

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CardHead, GroupPill, PropTable, Section, StatRow } from './CardParts';
import { Highlighted } from './Highlighted';
import { LearnPopover } from './LearnPopover';
import { MAX_TERM_LENGTH, type LearnTarget } from './learnSelection';
import { NoteBlock } from './NoteBlock';
import { PaintBar, PaintList } from './PaintBar';
import { paintSelection, usePaintHighlights, type PaintTarget } from './paint';
import { shownText } from './shownText';
import { HintBlock } from '../check/HintBlock';
import {
  attributeLabel,
  attrMeta,
  attrSpans,
  attrStrings,
  displayAttributes,
} from '../../lib/attributes';
import { facetOptionLabel, FACETS_BY_ID } from '../../lib/facets';
import { formatEuro, formatNumber } from '../../lib/format';
import { categoryOf, keysOfLabel, presentCategories } from '../../lib/spanCategories';
import { POSITION_STATUS } from '../../lib/status';
import { headingOf } from '../../lib/tree/heading';
import { mainSectionOf } from '../../lib/tree/mainSection';
import { applyTerms } from '../../lib/highlight/terms';
import { useAdmin } from '../../state/admin';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { Highlight, Paint } from '../../lib/annotations';

const NO_MARKS: readonly Highlight[] = [];

// Außerhalb der Komponente: `Date.now()` ist im Render-Pfad nicht rein.
function paintNow(
  dispatch: ReturnType<typeof useViewerDispatch>,
  id: string,
  paint: Paint,
  target: PaintTarget,
): void {
  dispatch({
    type: 'addHighlight',
    id,
    paint,
    start: target.start,
    text: target.text,
    at: Date.now(),
  });
}
import type { LVNode, PositionSummary } from '../../types/lvNode';

/**
 * Schalterreihe über dem Langtext: je gefundener Kategorie eine Pille mit
 * Anzahl, die ihre Markierungen ein- und ausblendet. Reiner Anzeigezustand
 * dieser Komponente — er überlebt weder einen Positionswechsel noch einen
 * Reload, und das ist gewollt (docs/architecture/frontend.md).
 */
function SpanLegend({
  labels,
  counts,
  hidden,
  onToggle,
}: {
  labels: ReadonlyArray<{ label: string; color: string; background: string }>;
  counts: ReadonlyMap<string, number>;
  hidden: ReadonlySet<string>;
  onToggle: (label: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      {labels.map((category) => {
        const on = !hidden.has(category.label);
        return (
          <button
            key={category.label}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(category.label)}
            title={on ? `${category.label} ausblenden` : `${category.label} einblenden`}
            className="inline-flex h-[24px] cursor-pointer items-center gap-[6px] rounded-[var(--r-pill)] border px-[9px] font-mono text-[10px]"
            style={{
              borderColor: on ? 'transparent' : 'var(--line)',
              background: on ? category.background : 'transparent',
              color: on ? category.color : 'var(--mute)',
            }}
          >
            {category.label}
            <b className="font-semibold">{counts.get(category.label) ?? 0}</b>
          </button>
        );
      })}
    </div>
  );
}

export function PositionDetails({
  node,
  position,
  onClose,
  grip,
}: {
  node: LVNode;
  position: PositionSummary;
  /** Nur die schwebende Karte im Graphen braucht eine Schließen-Schaltfläche. */
  onClose?: () => void;
  grip?: ReactNode;
}) {
  const {
    filter: { search },
    parents,
    index,
    sectionColors,
    lv,
    annotations,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const parent = parents.get(node.id) ?? null;

  const positionsart = FACETS_BY_ID.get('positionsart');
  // Hauptabschnitt im Ton seiner Punkte im Graphen (Entscheidung 0043).
  const main = useMemo(() => mainSectionOf(node, parents, new Map()), [node, parents]);
  const slot = index.slotOf.get(node.id);
  const mainColor = slot === undefined ? undefined : sectionColors.bySlot[slot];
  const meta = attrMeta(position.attributes);
  const keywords = attrStrings(position.attributes, 'keywords');
  const attributes = displayAttributes(position);

  // Gelernte Begriffe (Entscheidung 0053) kommen beim Anzeigen dazu, nicht in der
  // Klassifizierung: sie färben nur ein und sind kein Filter.
  const admin = useAdmin();
  const spans = useMemo(
    () => applyTerms(position.longText, attrSpans(position.attributes), admin.terms),
    [position.longText, position.attributes, admin.terms],
  );
  const longTextRef = useRef<HTMLDivElement>(null);
  const [learnTarget, setLearnTarget] = useState<LearnTarget | null>(null);
  const closeLearn = useCallback(() => setLearnTarget(null), []);
  // Eigene Anstreichungen (Entscheidung 0063).
  const [paintTarget, setPaintTarget] = useState<PaintTarget | null>(null);
  const closePaint = useCallback(() => setPaintTarget(null), []);
  const marks = annotations.highlights.get(node.id) ?? NO_MARKS;
  const readSelection = (): void => {
    if (longTextRef.current !== null) setPaintTarget(paintSelection(longTextRef.current));
  };
  const categories = useMemo(() => presentCategories(spans), [spans]);
  const counts = useMemo(() => {
    const out = new Map<string, number>();
    for (const span of spans) {
      const label = categoryOf(span.key).label;
      out.set(label, (out.get(label) ?? 0) + 1);
    }
    return out;
  }, [spans]);
  const [hiddenLabels, setHiddenLabels] = useState<ReadonlySet<string>>(new Set());
  const activeKeys = useMemo(() => {
    const keys = new Set(spans.map((span) => span.key));
    for (const label of hiddenLabels) for (const key of keysOfLabel(label)) keys.delete(key);
    return keys;
  }, [spans, hiddenLabels]);
  // Suche und Legende bauen den Langtext neu auf — dann neu einfärben.
  usePaintHighlights(longTextRef, marks, [search, spans, activeKeys]);
  const shown = useMemo(
    () => shownText(position.longText, spans, activeKeys),
    [position.longText, spans, activeKeys],
  );

  const toggleCategory = (label: string): void =>
    setHiddenLabels((current) => {
      const next = new Set(current);
      if (!next.delete(label)) next.add(label);
      return next;
    });

  // Ohne Preise in der Datei (x83, der Normalfall bei Bauunternehmern) steht
  // „–" statt „0,00 €" — null ist kein Preis.
  const priced = (lv?.tree.totalPrice ?? 0) > 0 && position.unitPrice !== null;
  const arten =
    positionsart === undefined
      ? []
      : positionsart.get(position).map((value) => facetOptionLabel(positionsart, value));

  const rows: Array<readonly [string, string]> = [];
  if (parent !== null && parent.kind !== 'project') {
    rows.push(['Abschnitt', `${parent.code} ${parent.label ?? ''}`.trim()]);
  }
  for (const [key, value] of attributes) {
    // Die Positionsart steht schon oben in den Kennzahlen.
    if (key === 'positionsart') continue;
    rows.push([attributeLabel(key), value]);
  }
  if (priced) rows.push(['GP', formatEuro(node.totalPrice, 0)]);
  rows.push(['Positionstyp', position.positionType]);
  rows.push(['Status', POSITION_STATUS]);

  return (
    <>
      <CardHead
        grip={grip}
        meta={
          <>
            <span className="shrink-0 font-mono text-[11px] text-dim">{position.oz}</span>
            {main !== null && mainColor !== undefined && (
              <GroupPill color={mainColor}>{headingOf(main)}</GroupPill>
            )}
          </>
        }
        title={<Highlighted text={position.shortText} query={search} />}
        onClose={onClose}
      />
      <StatRow
        stats={[
          {
            label: 'Menge',
            value: formatNumber(position.quantity),
            unit: position.unit ?? undefined,
          },
          priced
            ? { label: 'EP', value: formatEuro(position.unitPrice) }
            : { label: 'EP', value: '–', empty: true },
          arten.length > 0
            ? { label: 'Positionsart', value: arten.join(' · ') }
            : { label: 'Positionsart', value: '–', empty: true },
        ]}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-auto px-[16px] pb-[16px] pt-[14px]">
        {/* Hinweise vor dem Langtext: wer eine Position aufmacht, soll zuerst
            sehen, ob an ihr etwas auffällt (WP-R, R1). */}
        <HintBlock positionId={node.id} />

        {position.longText !== '' && (
          <Section title="Langtext">
            {categories.length > 0 && (
              <SpanLegend
                labels={categories}
                counts={counts}
                hidden={hiddenLabels}
                onToggle={toggleCategory}
              />
            )}
            <div
              ref={longTextRef}
              onMouseUp={readSelection}
              onKeyUp={(event) => {
                if (event.shiftKey) readSelection();
              }}
              // Die Karte liegt im Graphen, der `select-none` setzt — ohne `select-text`
              // ließe sich weder kopieren noch anstreichen oder ein Begriff markieren.
              className="select-text whitespace-pre-wrap font-sans text-[13px] leading-[1.62] text-ink"
            >
              <Highlighted
                text={position.longText}
                query={search}
                spans={spans}
                activeKeys={activeKeys}
              />
            </div>
            {paintTarget !== null && (
              <PaintBar
                target={paintTarget}
                onPaint={(paint) => {
                  paintNow(dispatch, node.id, paint, paintTarget);
                  window.getSelection()?.removeAllRanges();
                  setPaintTarget(null);
                }}
                onLearn={
                  admin.unlocked && paintTarget.text.replace(/\s+/g, ' ').length <= MAX_TERM_LENGTH
                    ? () => {
                        const { left, top } = paintTarget;
                        const text = paintTarget.text.replace(/\s+/g, ' ');
                        setPaintTarget(null);
                        setLearnTarget({ text, left, top });
                      }
                    : null
                }
                onClose={closePaint}
              />
            )}
            {admin.unlocked && learnTarget !== null && (
              <LearnPopover target={learnTarget} onClose={closeLearn} />
            )}
            <PaintList
              marks={marks}
              text={shown}
              onRemove={(i) => dispatch({ type: 'removeHighlight', id: node.id, position: i })}
            />
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-[4px]">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-[var(--r-pill)] bg-sunken px-[8px] py-[2px] font-mono text-[10px] text-dim"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        <Section title="Eigenschaften">
          <PropTable rows={rows} />
          {meta !== null && (
            <div className="font-mono text-[10px] text-mute">
              {meta.classifier} · Ruleset {meta.ruleset} · v{meta.version}
            </div>
          )}
        </Section>

        {/* Eigene Notizen zuletzt: erst lesen, was die Datei sagt (Entscheidung 0047). */}
        <NoteBlock positionId={node.id} />
      </div>
    </>
  );
}
