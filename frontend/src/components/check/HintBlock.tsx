// Block „Hinweise" in den Positionsdetails (WP-R, R1).
//
// Dezent am Ende der Positionskarte, je Regel eine Zeile; oben im Kartenkopf steht nur
// die Zahl (`HintCount`) — dieselbe Zahl wie der Reiter „Prüfung".
//
// Ton wie im ganzen Prüfteil: **Hinweis, kein Urteil**
// (docs/domain/vob-pruefungen.md). Jede Regel nennt ihren Norm-Verweis, ein
// unbestätigter Verweis ist als solcher markiert, und die Fundstelle steht
// dabei — nie nur eine Behauptung.
//
// Abgeschaltete Regeln kommen hier nicht an: `hints` aus dem Viewer ist bereits
// gegen `filter.mutedRules` gerechnet (lib/check/hints.ts).

import type { Ref, RefObject } from 'react';
import { useJumpToCheck } from '../common/useJumpToCheck';
import { groupByRule, type Flag, type RuleStatus } from '../../lib/check';
import { useViewer } from '../../state/viewer';

function RuleHints({
  ruleId,
  flags,
  rule,
  positionId,
  onJump,
}: {
  ruleId: string;
  flags: readonly Flag[];
  rule: RuleStatus | undefined;
  positionId: string;
  onJump: (ruleId: string, positionId: string) => void;
}) {
  const strong = rule?.severity === 'beachten';
  return (
    <div className="flex flex-col gap-[2px]">
      <div
        className={`flex flex-wrap items-baseline gap-[6px] font-sans text-[13px] ${
          strong ? 'text-amberD' : 'text-ink'
        }`}
      >
        <span className="font-semibold">{ruleId}</span>
        <span>{rule?.label ?? 'Unbekannte Regel'}</span>
      </div>
      <ul className="m-0 list-none p-0">
        {flags.map((flag, index) => (
          <li key={`${flag.id}-${index}`} className="font-sans text-[12px] leading-[1.5] text-dim">
            {flag.title}
          </li>
        ))}
      </ul>
      <p className="m-0 flex flex-wrap items-baseline gap-x-[6px] font-mono text-[11px] text-mute">
        {rule !== undefined && rule.ruleRef !== '' && (
          <>
            <span>{rule.ruleRef}</span>
            {!rule.refConfirmed && (
              <span
                className="text-amberD"
                title="Der Norm-Verweis ist noch nicht bestätigt — siehe docs/domain/vob-pruefungen.md"
              >
                Verweis zu bestätigen
              </span>
            )}
            <span aria-hidden="true">·</span>
          </>
        )}
        <button
          type="button"
          onClick={() => onJump(ruleId, positionId)}
          className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] text-mute underline underline-offset-2 hover:text-accent focus-visible:text-accent"
        >
          In der Prüfung zeigen
        </button>
      </p>
    </div>
  );
}

/**
 * Zahl der Hinweise im Kartenkopf; ein Klick rollt zum Block am Kartenende.
 * Nichts gefunden heißt: nichts anzeigen.
 */
export function HintCount({
  positionId,
  target,
}: {
  positionId: string;
  target: RefObject<HTMLElement | null>;
}) {
  const { hints } = useViewer();
  const found = hints.get(positionId);
  if (found === undefined) return null;
  const count = found.flags.length;
  const strong = found.severity === 'beachten';
  return (
    <button
      type="button"
      onClick={() => target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      className={`shrink-0 cursor-pointer rounded-[var(--r-pill)] border-none px-[8px] py-[2px] font-sans text-[11.5px] font-semibold ${
        strong ? 'bg-amberS text-amberD' : 'bg-sunken text-dim'
      }`}
    >
      ⚠ {count} {count === 1 ? 'Hinweis' : 'Hinweise'}
    </button>
  );
}

/** Nichts gefunden heißt: nichts anzeigen — eine leere Überschrift sagt nichts. */
export function HintBlock({ positionId, ref }: { positionId: string; ref?: Ref<HTMLElement> }) {
  const { lv, hints } = useViewer();
  const jumpToCheck = useJumpToCheck();
  const found = hints.get(positionId);
  if (found === undefined) return null;

  const rules = new Map((lv?.check.rules ?? []).map((rule) => [rule.id, rule]));
  const groups = groupByRule(found.flags);

  return (
    <section ref={ref} aria-label="Hinweise" className="flex scroll-mt-[12px] flex-col gap-[8px]">
      <span className="font-mono text-[11px] text-mute">Hinweise</span>
      <div className="flex flex-col gap-[10px]">
        {groups.map(([ruleId, flags]) => (
          <RuleHints
            key={ruleId}
            ruleId={ruleId}
            flags={flags}
            rule={rules.get(ruleId)}
            positionId={positionId}
            onJump={jumpToCheck}
          />
        ))}
      </div>
    </section>
  );
}
