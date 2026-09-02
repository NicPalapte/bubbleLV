// Rendert `**…**`-Markierungen im Langtext als Hervorhebung und hebt zusätzlich
// den aktuellen Suchbegriff hervor. Portiert aus `Highlighted` in
// design/claude-design/lv-main.jsx.

import { Fragment, type ReactNode } from 'react';

interface HighlightedProps {
  text: string;
  /** Optionaler Suchbegriff; wird zusätzlich zu `**…**` hervorgehoben. */
  query?: string;
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

export function Highlighted({ text, query = '' }: HighlightedProps) {
  const trimmed = query.trim();
  const segments = String(text ?? '').split(/(\*\*[^*]+\*\*)/g);

  return (
    <span>
      {segments.map((segment, index) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return <Mark key={index}>{segment.slice(2, -2)}</Mark>;
        }
        return <Fragment key={index}>{highlightQuery(segment, trimmed, String(index))}</Fragment>;
      })}
    </span>
  );
}
