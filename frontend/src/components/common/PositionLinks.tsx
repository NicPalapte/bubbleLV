// Abschnitt „Verbunden" der Positionskarte (Entscheidung 0081): Positionen, die eine
// Regel mit dieser verbindet. Vorschläge stehen gestrichelt mit „Ja“/„Nein“ — erst
// dein „Ja“ macht daraus eine Verbindung, „Nein“ merkt sich Conocto. Klick springt zur
// anderen Position, ✕ löst eine bestätigte Verbindung wieder.

import { useMemo } from 'react';
import { ruleKey } from '@core';
import { Section } from './CardParts';
import { useJumpToPosition } from './useJumpToPosition';
import { confirmedWith, linkOf } from '../../lib/positionLinks';
import { linkSuggestionsOf } from '../../lib/rules/linkSuggestions';
import { useAdmin } from '../../state/admin';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export const POSITION_LINKS_SECTION = 'Verbunden';

const ROW_BUTTON =
  'inline-flex h-[26px] cursor-pointer items-center rounded-[var(--r-pill)] border px-[10px] font-mono text-[11.5px]';

export function PositionLinks({ positionId }: { positionId: string }) {
  const { annotations, nodes, index, parents } = useViewer();
  const dispatch = useViewerDispatch();
  const jump = useJumpToPosition();
  const { rules } = useAdmin();
  const links = annotations.links ?? [];
  const suggestions = useMemo(
    () => linkSuggestionsOf(index, parents, rules),
    [index, parents, rules],
  );
  const confirmed = confirmedWith(links, positionId);
  const open = (suggestions.get(positionId) ?? []).filter(
    (entry) => linkOf(links, positionId, entry.other) === undefined,
  );
  if (confirmed.length === 0 && open.length === 0) return null;

  const ruleName = (key: string): string =>
    rules.find((rule) => ruleKey(rule) === key)?.name ?? key;
  const label = (id: string): { oz: string; text: string } => {
    const position = nodes.get(id)?.position;
    return { oz: position?.oz ?? '–', text: position?.shortText ?? 'Position nicht im LV' };
  };

  return (
    <Section
      title={POSITION_LINKS_SECTION}
      right={<span className="font-mono text-[11px] text-mute">{confirmed.length}</span>}
    >
      <ul
        aria-label={POSITION_LINKS_SECTION}
        className="m-0 flex list-none flex-col overflow-hidden rounded-[var(--r-md)] border border-line bg-surface p-0"
      >
        {confirmed.map(({ other, link }, i) => {
          const { oz, text } = label(other);
          return (
            <li
              key={`c-${other}`}
              className={`group flex items-stretch ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <button
                type="button"
                disabled={!nodes.has(other)}
                onClick={() => jump(other)}
                title="Zur Position springen"
                className="min-w-0 flex-1 cursor-pointer border-none bg-transparent px-[12px] py-[7px] text-left hover:bg-sunken disabled:cursor-default"
              >
                <span className="block truncate font-mono text-[11px] text-mute">
                  {oz} · über Regel „{ruleName(link.regel)}“
                </span>
                <span className="block truncate font-sans text-[13px] text-ink">{text}</span>
              </button>
              <button
                type="button"
                aria-label="Verbindung lösen"
                title="Verbindung lösen"
                onClick={() =>
                  dispatch({
                    type: 'judgeLink',
                    x: positionId,
                    y: other,
                    status: 'verworfen',
                    regel: link.regel,
                    at: Date.now(),
                  })
                }
                className="cursor-pointer border-none bg-transparent px-[12px] font-mono text-[12px] text-mute opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          );
        })}
        {open.map((entry, i) => {
          const { oz, text } = label(entry.other);
          const judge = (status: 'bestaetigt' | 'verworfen'): void =>
            dispatch({
              type: 'judgeLink',
              x: positionId,
              y: entry.other,
              status,
              regel: entry.key,
              at: Date.now(),
            });
          return (
            <li
              key={`v-${entry.other}`}
              className={`flex flex-wrap items-center gap-[8px] border-dashed border-amber px-[12px] py-[7px] ${
                i > 0 || confirmed.length > 0 ? 'border-t' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => jump(entry.other)}
                title="Zur Position springen"
                className="min-w-0 flex-1 cursor-pointer border-none bg-transparent p-0 text-left"
              >
                <span className="block truncate font-mono text-[11px] text-amber">
                  Vorschlag · {oz} · Regel „{entry.rule.name}“
                </span>
                <span className="block truncate font-sans text-[13px] text-ink">{text}</span>
              </button>
              <button
                type="button"
                onClick={() => judge('bestaetigt')}
                className={`${ROW_BUTTON} border-transparent bg-accent-fill text-white`}
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => judge('verworfen')}
                className={`${ROW_BUTTON} border-line bg-surface text-ink hover:border-line2`}
              >
                Nein
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
