// Positionskarte im Graphen (docs/decisions/0034-graph-als-hauptscreen.md):
// Kopf mit OZ und Hauptabschnitt, Kennzahlen (Menge · EP · Positionsart), Hinweise,
// Langtext mit Fundstellen und eine Eigenschaftstabelle.

import { useCallback, useMemo, useRef, useState } from 'react';
import { CardHead, GroupPill, PropTable, Section, StatRow } from './CardParts';
import { Highlighted } from './Highlighted';
import { LearnPopover } from './LearnPopover';
import { MAX_TERM_LENGTH, type LearnTarget } from './learnSelection';
import { MarkerHead, NoteBlock } from './NoteBlock';
import { PaintBar, PaintList, PaintNamesDialog, SelectionMenu } from './PaintBar';
import {
  locate,
  PAINT_SECTION,
  paintSelection,
  usePaintHighlights,
  useTouchSelectionMenu,
  type PaintTarget,
} from './paint';
import { shownText } from './shownText';
import { useTextSearches } from './useTextSearches';
import { HintBlock, HintCount } from '../check/HintBlock';
import { DocLinks } from '../docs/DocLinks';
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
import { blocksFromSelection } from '@core';
import { applyRules, nameOf, newRule } from '../../lib/rules/rules';
import { PositionLinks } from './PositionLinks';
import { useAdmin } from '../../state/admin';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { Highlight, Paint } from '../../lib/annotations';

const NO_MARKS: readonly Highlight[] = [];
/** Längere Auswahl ergibt keine brauchbare Regel mehr. */
const MAX_RULE_SELECTION = 400;

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
function copySelection(fallback: string, onFail: () => void): void {
  const selected = window.getSelection()?.toString() ?? '';
  const clipboard = navigator.clipboard as Clipboard | undefined;
  const legacy = (): void => {
    let copied: boolean;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    if (!copied) onFail();
  };
  if (clipboard === undefined) return legacy();
  try {
    clipboard.writeText(selected === '' ? fallback : selected).catch(legacy);
  } catch {
    legacy();
  }
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
            className="inline-flex h-[24px] cursor-pointer items-center gap-[6px] rounded-[var(--r-pill)] border px-[9px] font-mono text-[11px]"
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

export function PositionDetails({ node, position }: { node: LVNode; position: PositionSummary }) {
  const {
    filter: { search },
    parents,
    index,
    sectionColors,
    lv,
    annotations,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const searchesFor = useTextSearches();
  const parent = parents.get(node.id) ?? null;

  const positionsart = FACETS_BY_ID.get('positionsart');
  // Hauptabschnitt im Ton seiner Punkte im Graphen (Entscheidung 0043).
  const main = useMemo(() => mainSectionOf(node, parents, new Map()), [node, parents]);
  const slot = index.slotOf.get(node.id);
  const mainColor = slot === undefined ? undefined : sectionColors.bySlot[slot];
  const meta = attrMeta(position.attributes);
  const keywords = attrStrings(position.attributes, 'keywords');
  const attributes = displayAttributes(position);

  // Gelernte Begriffe (Entscheidung 0053) und aktive Regeln (0081) kommen beim Anzeigen
  // dazu, nicht in der Klassifizierung: sie färben nur ein und sind kein Filter.
  const admin = useAdmin();
  const spans = useMemo(
    () =>
      applyRules(
        position,
        applyTerms(position.longText, attrSpans(position.attributes), admin.terms),
        admin.rules,
      ),
    [position, admin.terms, admin.rules],
  );
  const longTextRef = useRef<HTMLDivElement>(null);
  // Zusätzlich als Zustand: Die Tablet-Leiste muss mitbekommen, wann der Langtext da ist.
  const [longTextEl, setLongTextEl] = useState<HTMLDivElement | null>(null);
  const attachLongText = useCallback((el: HTMLDivElement | null): void => {
    longTextRef.current = el;
    setLongTextEl(el);
  }, []);
  const hintsRef = useRef<HTMLElement>(null);
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
  // Kurztext im Kopf: nur suchen und kopieren, nicht anstreichen (Entscheidung 0077).
  const [shortTextEl, setShortTextEl] = useState<HTMLSpanElement | null>(null);
  const [shortPick, setShortPick] = useState<PaintTarget | null>(null);
  const closeShortPick = useCallback(() => setShortPick(null), []);
  const openShortMenu = (at: { x: number; y: number } | null): boolean => {
    if (shortTextEl === null) return false;
    const target = paintSelection(shortTextEl);
    if (target === null) return false;
    setShortPick(at === null ? target : { ...target, left: at.x, top: at.y });
    return true;
  };
  useTouchSelectionMenu(shortTextEl, () => {
    openShortMenu(null);
  });
  // Ohne Rechtsklick am Tablet: Leiste unter der Auswahl, sobald sie ruht.
  useTouchSelectionMenu(longTextEl, () => {
    openPaintMenu(null);
  });
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
        meta={
          <>
            <span className="shrink-0 font-mono text-[12px] text-dim">{position.oz}</span>
            {main !== null && mainColor !== undefined && (
              <GroupPill color={mainColor}>{headingOf(main)}</GroupPill>
            )}
            <HintCount positionId={node.id} target={hintsRef} />
          </>
        }
        title={
          <span
            ref={setShortTextEl}
            onContextMenu={(event) => {
              if (openShortMenu({ x: event.clientX, y: event.clientY })) event.preventDefault();
            }}
            // Wie der Langtext: im Graphen gilt `select-none`, hier soll man markieren können.
            className="cursor-text select-text"
          >
            <Highlighted text={position.shortText} query={search} />
          </span>
        }
        actions={<MarkerHead positionId={node.id} />}
      />
      {shortPick !== null && (
        <SelectionMenu
          target={shortPick}
          searches={searchesFor(shortPick.text, () => {
            window.getSelection()?.removeAllRanges();
            setShortPick(null);
          })}
          onCopy={() => {
            setShortPick(null);
            copySelection(shortPick.text, () =>
              dispatch({ type: 'notice', message: 'Text konnte nicht kopiert werden.' }),
            );
          }}
          onClose={closeShortPick}
        />
      )}
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
              ref={attachLongText}
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
              className="cursor-text select-text whitespace-pre-wrap font-sans text-[14px] leading-[1.62] text-ink"
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
                searches={searchesFor(paintTarget.text, () => {
                  window.getSelection()?.removeAllRanges();
                  setPaintTarget(null);
                })}
                onCopy={() => {
                  setPaintTarget(null);
                  copySelection(paintTarget.text, () =>
                    dispatch({ type: 'notice', message: 'Text konnte nicht kopiert werden.' }),
                  );
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
                onRule={
                  admin.unlocked && paintTarget.text.length <= MAX_RULE_SELECTION
                    ? () => {
                        const blocks = blocksFromSelection(paintTarget.text);
                        const taken = new Set(admin.rules.map((rule) => rule.id));
                        const rule = newRule(
                          taken,
                          blocks.length > 0 ? blocks : undefined,
                          nameOf(blocks),
                        );
                        // Gleich als eigener Entwurf speichern, dann im Editor zeigen.
                        admin.saveRule(rule);
                        admin.requestRule(rule);
                        window.getSelection()?.removeAllRanges();
                        setPaintTarget(null);
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
                    className="rounded-[var(--r-pill)] bg-sunken px-[8px] py-[2px] font-mono text-[11px] text-dim"
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
            <div className="font-mono text-[11px] text-mute">
              {meta.classifier} · Ruleset {meta.ruleset} · v{meta.version}
            </div>
          )}
        </Section>

        {/* Hinweise dezent am Ende; der Kopf zeigt nur ihre Zahl (WP-R, R1). */}
        <HintBlock ref={hintsRef} positionId={node.id} />

        <PaintList
          marks={marks}
          text={shown}
          onRemove={(i) => dispatch({ type: 'removeHighlight', id: node.id, position: i })}
        />

        <DocLinks positionId={node.id} />

        <PositionLinks positionId={node.id} />

        {/* Eigene Notizen zuletzt: erst lesen, was die Datei sagt (Entscheidung 0047). */}
        <NoteBlock positionId={node.id} />
      </div>
    </>
  );
}
