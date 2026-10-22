// Positionskarte im Graphen (docs/decisions/0034-graph-als-hauptscreen.md):
// Kopf mit OZ und Hauptabschnitt, Kennzahlen (Menge · EP · Positionsart), Hinweise,
// Langtext mit Fundstellen und eine Eigenschaftstabelle.

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CardHead, GroupPill, PropTable, Section, StatRow } from './CardParts';
import { Highlighted } from './Highlighted';
import { LearnPopover } from './LearnPopover';
import { MAX_TERM_LENGTH, type LearnTarget } from './learnSelection';
import { MarkerHead, NoteBlock } from './NoteBlock';
import { PaintBar, PaintList, PaintNamesDialog } from './PaintBar';
import {
  locate,
  PAINT_SECTION,
  paintSelection,
  usePaintHighlights,
  type PaintTarget,
} from './paint';
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
 * „Kopieren" im eigenen Menü — das Menü des Browsers fehlt dort. Ohne Clipboard-API
 * (kein HTTPS) kopiert der alte Befehl die noch stehende Auswahl.
 */
function copySelection(fallback: string): void {
  const selected = window.getSelection()?.toString() ?? '';
  const clipboard = navigator.clipboard as Clipboard | undefined;
  const legacy = (): void => {
    document.execCommand('copy');
  };
  if (clipboard === undefined) legacy();
  else clipboard.writeText(selected === '' ? fallback : selected).catch(legacy);
}

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
  /** Fundstellen-Kategorien, dazu ggf. „Meine Textmarkierungen". */
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
  /** Auswahl im Langtext samt eigenen Anstreichungen, die sie berührt (beim Öffnen gemessen). */
  const [paintTarget, setPaintTarget] = useState<
    (PaintTarget & { touched: readonly number[] }) | null
  >(null);
  const closePaint = useCallback(() => setPaintTarget(null), []);
  const [renameAt, setRenameAt] = useState<{ left: number; top: number } | null>(null);
  const closeRename = useCallback(() => setRenameAt(null), []);
  const marks = annotations.highlights.get(node.id) ?? NO_MARKS;
  /** Indizes eigener Anstreichungen, die die Auswahl berühren. */
  const touched = (target: PaintTarget): number[] => {
    const text = longTextRef.current?.textContent ?? '';
    const end = target.start + target.text.length;
    return marks.flatMap((mark, i) => {
      const at = locate(text, mark);
      return at >= 0 && at < end && at + mark.text.length > target.start ? [i] : [];
    });
  };
  // Rechtsklick auf eine Auswahl (Issue #155): Menü mit Kopieren und Farben. Eine
  // Auswahl allein öffnet nichts mehr; ohne Auswahl bleibt das Menü des Browsers.
  const openPaintMenu = (at: { x: number; y: number } | null): boolean => {
    if (longTextRef.current === null) return false;
    const target = paintSelection(longTextRef.current);
    if (target === null) return false;
    const placed = at === null ? target : { ...target, left: at.x, top: at.y };
    setPaintTarget({ ...placed, touched: touched(target) });
    return true;
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
  // „Meine Textmarkierungen" lässt sich wie eine Fundstellen-Kategorie ausblenden.
  // Suche und Legende bauen den Langtext neu auf — dann neu einfärben.
  const paintHidden = hiddenLabels.has(PAINT_SECTION);
  usePaintHighlights(longTextRef, paintHidden ? NO_MARKS : marks, [search, spans, activeKeys]);
  const legend =
    marks.length === 0
      ? categories
      : [
          ...categories,
          { label: PAINT_SECTION, color: 'var(--paint-ink)', background: 'var(--paint-gelb)' },
        ];
  const legendCounts =
    marks.length === 0 ? counts : new Map([...counts, [PAINT_SECTION, marks.length]]);
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
        actions={<MarkerHead positionId={node.id} />}
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
            {legend.length > 0 && (
              <SpanLegend
                labels={legend}
                counts={legendCounts}
                hidden={hiddenLabels}
                onToggle={toggleCategory}
              />
            )}
            <div
              ref={longTextRef}
              onContextMenu={(event) => {
                if (openPaintMenu({ x: event.clientX, y: event.clientY })) event.preventDefault();
              }}
              onKeyDown={(event) => {
                // Kontextmenü-Taste oder Shift+F10 auf einer Auswahl per Tastatur.
                const menuKey =
                  event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
                if (menuKey && openPaintMenu(null)) event.preventDefault();
              }}
              // Fokussierbar, damit Kontextmenü-Taste und Shift+F10 hier ankommen.
              tabIndex={0}
              // Die Karte liegt im Graphen, der `select-none` setzt — ohne `select-text`
              // ließe sich weder kopieren noch anstreichen oder ein Begriff markieren.
              // Text-Cursor: zeigt, dass sich hier markieren lässt.
              className="cursor-text select-text whitespace-pre-wrap font-sans text-[13px] leading-[1.62] text-ink"
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
                  // Neu Markiertes soll man sehen, auch wenn die Farben ausgeblendet waren.
                  setHiddenLabels((current) => {
                    if (!current.has(PAINT_SECTION)) return current;
                    const next = new Set(current);
                    next.delete(PAINT_SECTION);
                    return next;
                  });
                  window.getSelection()?.removeAllRanges();
                  setPaintTarget(null);
                }}
                onCopy={() => {
                  setPaintTarget(null);
                  copySelection(paintTarget.text);
                }}
                onUnpaint={
                  paintTarget.touched.length === 0
                    ? null
                    : () => {
                        // Von hinten nach vorn: jedes Entfernen verschiebt die Indizes dahinter.
                        for (const i of [...paintTarget.touched].reverse()) {
                          dispatch({ type: 'removeHighlight', id: node.id, position: i });
                        }
                        window.getSelection()?.removeAllRanges();
                        setPaintTarget(null);
                      }
                }
                onRename={() => {
                  setRenameAt({ left: paintTarget.left, top: paintTarget.top });
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
            {renameAt !== null && (
              <PaintNamesDialog left={renameAt.left} top={renameAt.top} onClose={closeRename} />
            )}
            {admin.unlocked && learnTarget !== null && (
              <LearnPopover target={learnTarget} onClose={closeLearn} />
            )}
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

        <PaintList
          marks={marks}
          text={shown}
          onRemove={(i) => dispatch({ type: 'removeHighlight', id: node.id, position: i })}
        />

        {/* Eigene Notizen zuletzt: erst lesen, was die Datei sagt (Entscheidung 0047). */}
        <NoteBlock positionId={node.id} />
      </div>
    </>
  );
}
