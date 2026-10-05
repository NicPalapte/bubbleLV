// Positionskarte im Graphen (docs/decisions/0034-graph-als-hauptscreen.md):
// Kopf mit OZ und Gewerk, Kennzahlen (Menge · EP · Positionsart), Hinweise,
// Langtext mit Fundstellen und eine Eigenschaftstabelle.

import { useMemo, useState, type ReactNode } from 'react';
import { CardHead, GroupPill, PropTable, Section, StatRow } from './CardParts';
import { Highlighted } from './Highlighted';
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
import { useViewer } from '../../state/viewer';
import type { ClassificationMeta } from '../../lib/classify';
import type { LVNode, PositionSummary } from '../../types/lvNode';

/**
 * Ein Gewerk, das aus der Abschnittsüberschrift stammt, wird als solches
 * ausgewiesen. Es steht so in der Datei, aber nicht in dieser Position — und
 * Bubble behauptet nichts, was die Position nicht selbst sagt.
 */
function attributeValue(key: string, value: string, meta: ClassificationMeta | null): string {
  const inherited = meta?.gewerkQuelle === 'abschnitt';
  return inherited && (key === 'gewerk' || key === 'gewerkLb') ? `${value} (aus Abschnitt)` : value;
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
    gewerkColors,
    lv,
  } = useViewer();
  const parent = parents.get(node.id) ?? null;

  const positionsart = FACETS_BY_ID.get('positionsart');
  const gewerk = FACETS_BY_ID.get('gewerk')?.get(position)[0];
  const meta = attrMeta(position.attributes);
  const keywords = attrStrings(position.attributes, 'keywords');
  const attributes = displayAttributes(position);

  const spans = useMemo(() => attrSpans(position.attributes), [position.attributes]);
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
    rows.push([attributeLabel(key), attributeValue(key, value, meta)]);
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
            {gewerk !== undefined && (
              <GroupPill color={gewerkColors.of(gewerk)}>{gewerk}</GroupPill>
            )}
          </>
        }
        title={position.shortText}
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
            <div className="whitespace-pre-wrap font-sans text-[13px] leading-[1.62] text-ink">
              <Highlighted
                text={position.longText}
                query={search}
                spans={spans}
                activeKeys={activeKeys}
              />
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-[4px]">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-[var(--r-pill)] bg-sunken px-[8px] py-[2px] font-mono text-[9.5px] text-dim"
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
            <div className="font-mono text-[9px] text-mute">
              {meta.classifier} · Ruleset {meta.ruleset} · v{meta.version}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
