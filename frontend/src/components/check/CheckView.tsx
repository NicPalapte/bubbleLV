// Ansicht „Prüfung" (WP-K, Schritt 5): alle Hinweise, nach Regel gruppiert, mit
// Anzahl, Sprung zur Position und Schalter je Regel.
//
// Ton: **Hinweis, kein Urteil** (docs/domain/vob-pruefungen.md). Deshalb steht
// über der Liste, was Bubble nicht tut, jede Regel nennt ihren Norm-Verweis, und
// ein Verweis, den der Owner noch nicht bestätigt hat, ist ausdrücklich als
// „zu bestätigen" markiert — Bubble behauptet keine Fundstelle in der Norm, die
// niemand geprüft hat.
//
// Inaktive Regeln verschwinden nicht, sondern stehen mit ihrem Grund da: sonst
// hielte man eine fehlende Referenzdatei für „nichts gefunden".

import { useMemo, useState } from 'react';
import { BlockLabel } from '../ui/PanelHeader';
import { Chip } from '../ui/Chip';
import { formatCount } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { Flag, FlagCategory, RuleStatus } from '../../lib/check';
import type { LVNode } from '../../types/lvNode';

const CATEGORY_LABELS: Record<FlagCategory, string> = {
  geld: 'Geld',
  menge: 'Menge',
  risiko: 'Risiko',
  norm: 'Norm',
  frist: 'Frist',
  vob: 'VOB',
};

/** Farbe je Schweregrad — „beachten" ist auffälliger, aber kein Alarm. */
const SEVERITY_COLOR: Record<string, string> = {
  beachten: 'var(--amber)',
  hinweis: 'var(--dim)',
};

function RuleHeader({
  rule,
  muted,
  onToggle,
  open,
  onOpen,
}: {
  rule: RuleStatus;
  muted: boolean;
  onToggle: () => void;
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-[8px]">
      <button
        type="button"
        onClick={onOpen}
        disabled={!rule.active || rule.count === 0}
        className="cursor-pointer border-none bg-transparent p-0 text-left font-sans text-[13px] font-semibold text-ink disabled:cursor-default"
      >
        <span className="mr-[6px] font-mono text-[10px] text-mute">{rule.id}</span>
        {rule.label}
        {rule.active && rule.count > 0 && (
          <span aria-hidden="true" className="ml-[6px] font-mono text-[10px] text-mute">
            {open ? '▾' : '▸'}
          </span>
        )}
      </button>
      <Chip static on={rule.severity === 'beachten'}>
        {CATEGORY_LABELS[rule.category]}
      </Chip>
      {rule.active ? (
        <span className="font-mono text-[10px]" style={{ color: SEVERITY_COLOR[rule.severity] }}>
          {formatCount(rule.count)} {rule.count === 1 ? 'Hinweis' : 'Hinweise'}
        </span>
      ) : (
        <span className="font-mono text-[10px] text-mute">inaktiv</span>
      )}
      <span className="flex-1" />
      {rule.active && (
        <Chip
          on={!muted}
          onClick={onToggle}
          title={muted ? 'Regel wieder anzeigen' : 'Regel abschalten'}
        >
          {muted ? 'aus' : 'an'}
        </Chip>
      )}
    </div>
  );
}

function RuleMeta({ rule }: { rule: RuleStatus }) {
  return (
    <>
      <p className="mt-[4px] font-sans text-[11.5px] leading-[1.5] text-dim">{rule.hint}</p>
      {rule.ruleRef !== '' && (
        <p className="mt-[3px] font-mono text-[9.5px] text-mute">
          {rule.ruleRef}
          {!rule.refConfirmed && (
            <span
              className="ml-[6px] border px-[4px] py-[1px]"
              style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
              title="Der Norm-Verweis ist noch nicht bestätigt — siehe docs/domain/vob-pruefungen.md"
            >
              Verweis zu bestätigen
            </span>
          )}
        </p>
      )}
      {rule.inactiveReason !== null && (
        <p className="mt-[3px] font-mono text-[9.5px] text-mute">{rule.inactiveReason}</p>
      )}
    </>
  );
}

function FlagRow({ flag, node, onJump }: { flag: Flag; node: LVNode | null; onJump: () => void }) {
  const position = node?.position ?? null;
  return (
    <button
      type="button"
      onClick={onJump}
      disabled={node === null}
      className="flex w-full cursor-pointer items-baseline gap-[10px] border-none border-b border-solid border-grid bg-transparent px-0 py-[5px] text-left disabled:cursor-default"
    >
      <span className="w-[110px] shrink-0 font-mono text-[10px] text-dim">
        {position?.oz ?? '—'}
      </span>
      <span className="min-w-0 flex-1 truncate font-sans text-[11.5px] text-ink">
        {position?.shortText ?? 'Position nicht gefunden'}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-mute">{flag.title}</span>
    </button>
  );
}

export function CheckView() {
  const { lv, nodes, parents, mutedRules } = useViewer();
  const dispatch = useViewerDispatch();
  const [openRules, setOpenRules] = useState<ReadonlySet<string>>(new Set());

  const check = lv?.check ?? null;

  const byRule = useMemo(() => {
    const map = new Map<string, Flag[]>();
    for (const flag of check?.flags ?? []) {
      const list = map.get(flag.id) ?? [];
      list.push(flag);
      map.set(flag.id, list);
    }
    return map;
  }, [check]);

  if (check === null) return null;

  const sichtbar = check.rules.filter((rule) => rule.active && !mutedRules.has(rule.id));
  const gesamt = sichtbar.reduce((sum, rule) => sum + rule.count, 0);

  const jumpTo = (positionId: string): void => {
    const parent = parents.get(positionId) ?? null;
    dispatch({ type: 'selectPosition', nodeId: parent?.id ?? null, positionId });
    dispatch({ type: 'setViewMode', mode: 'table' });
  };

  const toggleOpen = (id: string): void =>
    setOpenRules((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className="absolute inset-0 overflow-auto bg-white">
      <div className="mx-auto max-w-[900px] px-[20px] py-[16px]">
        <div className="border-b border-line pb-[10px]">
          <BlockLabel>Prüfung</BlockLabel>
          <p className="mt-[2px] font-sans text-[13px] text-ink">
            <span className="font-semibold">{formatCount(gesamt)}</span>{' '}
            {gesamt === 1 ? 'Hinweis' : 'Hinweise'} aus {sichtbar.length} aktiven Regeln
          </p>
          <p className="mt-[4px] font-sans text-[11.5px] leading-[1.5] text-dim">
            Bubble zeigt Stellen, an denen ein Blick lohnt — keine Bewertung und kein Rechtsrat.
            Jede Regel nennt ihren Verweis und lässt sich abschalten.
          </p>
        </div>

        {check.rules.map((rule) => {
          const flags = byRule.get(rule.id) ?? [];
          const muted = mutedRules.has(rule.id);
          const open = openRules.has(rule.id);
          return (
            <section
              key={rule.id}
              className="border-b border-grid py-[12px]"
              style={{ opacity: rule.active && !muted ? 1 : 0.55 }}
            >
              <RuleHeader
                rule={rule}
                muted={muted}
                onToggle={() => dispatch({ type: 'toggleRule', id: rule.id })}
                open={open}
                onOpen={() => toggleOpen(rule.id)}
              />
              <RuleMeta rule={rule} />
              {open && !muted && flags.length > 0 && (
                <div className="mt-[8px] border-t border-grid">
                  {flags.map((flag, index) => (
                    <FlagRow
                      key={`${flag.id}-${flag.positionId}-${index}`}
                      flag={flag}
                      node={nodes.get(flag.positionId) ?? null}
                      onJump={() => jumpTo(flag.positionId)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
