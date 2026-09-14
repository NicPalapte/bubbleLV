// Rendert `**…**`-Markierungen im Langtext als Hervorhebung, hebt den aktuellen
// Suchbegriff hervor und zeichnet seit WP-J die **Fundstellen der
// Klassifizierung** ein — je Kategorie eine Farbe, einzeln abschaltbar.
//
// Portiert aus `Highlighted` in design/claude-design/lv-main.jsx.
//
// Die Fundstellen kommen als Zeichen-Indizes in den Rohtext
// (docs/architecture/data-model.md#spans). Deshalb wird der Text zuerst an den
// Span-Grenzen zerlegt und erst danach je Stück auf `**…**` und Suchbegriff
// geprüft — umgekehrt würden die Indizes nicht mehr passen, sobald ein
// `**`-Paar entfernt ist.

import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { categoryOf } from '../../lib/spanCategories';
import type { Span } from '../../lib/classify';

interface HighlightedProps {
  text: string;
  /** Optionaler Suchbegriff; wird zusätzlich zu `**…**` hervorgehoben. */
  query?: string;
  /** Fundstellen der Klassifizierung, überschneidungsfrei und nach `start` sortiert. */
  spans?: readonly Span[];
  /** Sichtbare Kategorien; ohne Angabe werden alle gezeichnet. */
  activeKeys?: ReadonlySet<string>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Mark({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-none border-b border-blue bg-blueS px-[3px] font-medium text-blueD">
      {children}
    </mark>
  );
}

/** Fundstelle: getönte Fläche in der Farbe ihrer Kategorie, mit Erklärung im Titel. */
function SpanMark({ span, children }: { span: Span; children: ReactNode }) {
  const category = categoryOf(span.key);
  const style: CSSProperties = {
    background: category.background,
    color: category.color,
    borderBottom: `1px solid ${category.color}`,
    borderRadius: 0,
    padding: '0 2px',
  };
  return (
    <mark data-span-key={span.key} title={`${category.label}: ${span.label}`} style={style}>
      {children}
    </mark>
  );
}

function highlightQuery(text: string, query: string, keyPrefix: string): ReactNode[] {
  if (query === '') return [<Fragment key={`${keyPrefix}-0`}>{text}</Fragment>];
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <Mark key={`${keyPrefix}-${index}`}>{part}</Mark>
    ) : (
      <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>
    ),
  );
}

/** Ein Stück Text zwischen zwei Fundstellen: `**…**` und Suchbegriff wie bisher. */
function plain(text: string, query: string, keyPrefix: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((segment, index) =>
      segment.startsWith('**') && segment.endsWith('**') ? (
        <Mark key={`${keyPrefix}-${index}`}>{segment.slice(2, -2)}</Mark>
      ) : (
        <Fragment key={`${keyPrefix}-${index}`}>
          {highlightQuery(segment, query, `${keyPrefix}-${index}`)}
        </Fragment>
      ),
    );
}

/** Die zu zeichnenden Fundstellen: sichtbar, im Text liegend, nach `start`. */
function visibleSpans(
  text: string,
  spans: readonly Span[],
  activeKeys: ReadonlySet<string> | undefined,
): Span[] {
  return spans
    .filter((span) => activeKeys === undefined || activeKeys.has(span.key))
    .filter((span) => span.start >= 0 && span.end <= text.length && span.end > span.start)
    .sort((a, b) => a.start - b.start);
}

export function Highlighted({ text, query = '', spans, activeKeys }: HighlightedProps) {
  const trimmed = query.trim();
  const source = String(text ?? '');
  const marks = spans === undefined ? [] : visibleSpans(source, spans, activeKeys);

  if (marks.length === 0) return <span>{plain(source, trimmed, 's')}</span>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  marks.forEach((span, index) => {
    // Überlappungen sind in `mergeSpans` schon ausgeräumt; ein doch noch
    // überlappender Span wird übersprungen, statt Text zu verdoppeln.
    if (span.start < cursor) return;
    if (span.start > cursor)
      parts.push(...plain(source.slice(cursor, span.start), trimmed, `t${index}`));
    parts.push(
      <SpanMark key={`span-${index}`} span={span}>
        {source.slice(span.start, span.end)}
      </SpanMark>,
    );
    cursor = span.end;
  });
  if (cursor < source.length) parts.push(...plain(source.slice(cursor), trimmed, 'tail'));

  return <span>{parts}</span>;
}
