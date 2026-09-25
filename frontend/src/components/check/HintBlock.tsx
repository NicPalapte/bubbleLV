// Block „Hinweise" in den Positionsdetails (WP-R, R1).
//
// Er steht in der Auswahlkarte des Graphen und im Eigenschaften-Panel der
// Tabelle — dieselbe Komponente, damit ein Hinweis überall gleich aussieht und
// dieselbe Zahl nennt wie die Ansicht „Prüfung".
//
// Ton wie im ganzen Prüfteil: **Hinweis, kein Urteil**
// (docs/domain/vob-pruefungen.md). Jede Regel nennt ihren Norm-Verweis, ein
// unbestätigter Verweis ist als solcher markiert, und die Fundstelle steht
// dabei — nie nur eine Behauptung.
//
// Abgeschaltete Regeln kommen hier nicht an: `hints` aus dem Viewer ist bereits
// gegen `filter.mutedRules` gerechnet (lib/check/hints.ts).

import { useJumpToCheck } from '../common/useJumpToCheck';
import { Chip } from '../ui/Chip';
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
  return (
    <div className="border-b border-grid py-[6px] last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-[6px]">
        <span className="font-mono text-[10px] text-mute">{ruleId}</span>
        <span className="font-sans text-[11.5px] font-semibold text-ink">
          {rule?.label ?? 'Unbekannte Regel'}
        </span>
        {rule !== undefined && (
          <Chip static on={rule.severity === 'beachten'}>
            {CATEGORY_LABELS[rule.category]}
          </Chip>
        )}
      </div>
      <ul className="mt-[3px] list-none pl-0">
        {flags.map((flag, index) => (
          <li key={`${flag.id}-${index}`} className="font-sans text-[11px] leading-[1.5] text-dim">
            {flag.title}
          </li>
        ))}
      </ul>
      {rule !== undefined && rule.ruleRef !== '' && (
        <p className="mt-[2px] font-mono text-[9px] text-mute">
          {rule.ruleRef}
          {!rule.refConfirmed && (
            <span
              className="ml-[5px] border px-[3px] py-[1px]"
              style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
              title="Der Norm-Verweis ist noch nicht bestätigt — siehe docs/domain/vob-pruefungen.md"
            >
              zu bestätigen
            </span>
          )}
        </p>
      )}
      <button
        type="button"
        onClick={() => onJump(ruleId, positionId)}
        className="mt-[5px] inline-flex cursor-pointer items-center border border-line bg-white px-[7px] py-[2px] font-mono text-[9px] tracking-[0.6px] text-dim hover:text-blue focus-visible:text-blue"
      >
        IN DER PRÜFUNG ZEIGEN
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
    <div
      style={{ padding: 'var(--pad-panel-head)', borderBottom: '1px solid var(--grid)' }}
      className="bg-panel"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] tracking-[0.6px] text-mute uppercase">Hinweise</span>
        <span className="font-mono text-[9px] text-mute">
          {found.flags.length} aus {groups.length} {groups.length === 1 ? 'Regel' : 'Regeln'}
        </span>
      </div>
      <p className="mt-[2px] font-sans text-[10.5px] leading-[1.5] text-dim">
        Stellen, an denen ein Blick lohnt — keine Bewertung und kein Rechtsrat.
      </p>
      <div className="mt-[4px]">
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
    </div>
  );
}
