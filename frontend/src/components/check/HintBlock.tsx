// Block „Hinweise" in den Positionsdetails (WP-R, R1).
//
// Er steht oben in der Positionskarte des Graphen, je Regel ein Kasten —
// dieselbe Zahl wie der Reiter „Prüfung".
//
// Ton wie im ganzen Prüfteil: **Hinweis, kein Urteil**
// (docs/domain/vob-pruefungen.md). Jede Regel nennt ihren Norm-Verweis, ein
// unbestätigter Verweis ist als solcher markiert, und die Fundstelle steht
// dabei — nie nur eine Behauptung.
//
// Abgeschaltete Regeln kommen hier nicht an: `hints` aus dem Viewer ist bereits
// gegen `filter.mutedRules` gerechnet (lib/check/hints.ts).

import { useJumpToCheck } from '../common/useJumpToCheck';
import { groupByRule, type Flag, type FlagCategory, type RuleStatus } from '../../lib/check';
import { useViewer } from '../../state/viewer';

const CATEGORY_LABELS: Record<FlagCategory, string> = {
  geld: 'Geld',
  menge: 'Menge',
  risiko: 'Risiko',
  norm: 'Norm',
  frist: 'Frist',
  vob: 'VOB',
};

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
    <div
      className={`flex flex-col gap-[5px] rounded-[var(--r-md)] px-[12px] py-[10px] ${
        strong ? 'bg-amberS' : 'border border-line bg-sunken'
      }`}
    >
      <div
        className={`flex flex-wrap items-baseline gap-[6px] font-mono text-[10.5px] font-semibold ${
          strong ? 'text-amber' : 'text-dim'
        }`}
      >
        <span>⚠ {ruleId}</span>
        <span aria-hidden="true">·</span>
        <span>{rule?.label ?? 'Unbekannte Regel'}</span>
        {rule !== undefined && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-normal">{CATEGORY_LABELS[rule.category]}</span>
          </>
        )}
      </div>
      <ul className="m-0 list-none p-0">
        {flags.map((flag, index) => (
          <li
            key={`${flag.id}-${index}`}
            className="font-sans text-[11.5px] leading-[1.5] text-ink"
          >
            {flag.title}
          </li>
        ))}
      </ul>
      {rule !== undefined && rule.ruleRef !== '' && (
        <p className="m-0 font-mono text-[9.5px] text-dim">
          {rule.ruleRef} · Hinweis, keine Bewertung
          {!rule.refConfirmed && (
            <span
              className="ml-[5px] rounded-[var(--r-sm)] border px-[4px] py-[1px]"
              style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
              title="Der Norm-Verweis ist noch nicht bestätigt — siehe docs/domain/vob-pruefungen.md"
            >
              Verweis zu bestätigen
            </span>
          )}
        </p>
      )}
      <button
        type="button"
        onClick={() => onJump(ruleId, positionId)}
        className="cursor-pointer self-start border-none bg-transparent p-0 font-mono text-[10px] text-dim underline underline-offset-2 hover:text-blue focus-visible:text-blue"
      >
        In der Prüfung zeigen
      </button>
    </div>
  );
}

/** Nichts gefunden heißt: nichts anzeigen — eine leere Überschrift sagt nichts. */
export function HintBlock({ positionId }: { positionId: string }) {
  const { lv, hints } = useViewer();
  const jumpToCheck = useJumpToCheck();
  const found = hints.get(positionId);
  if (found === undefined) return null;

  const rules = new Map((lv?.check.rules ?? []).map((rule) => [rule.id, rule]));
  const groups = groupByRule(found.flags);

  return (
    <section aria-label="Hinweise" className="flex flex-col gap-[8px]">
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
    </section>
  );
}
