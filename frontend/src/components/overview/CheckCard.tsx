// Karte „Prüfung" im Seitenfenster: eine Zeile je Regel mit Schalter und Anzahl,
// nach Kategorie gruppiert. Hinweistext, Norm-Verweis und Funde stehen in der
// Klappkarte daneben (`CheckFlyout`), damit die Karte auch schmal ruhig bleibt.
//
// Ton: **Hinweis, kein Urteil** (docs/domain/vob-pruefungen.md). Ein Verweis, den
// der Owner noch nicht bestätigt hat, ist in der Klappkarte als „zu bestätigen"
// markiert.
//
// Inaktive Regeln verschwinden nicht, sondern stehen mit ihrem Grund da: sonst
// hielte man eine fehlende Referenzdatei für „nichts gefunden".
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): gezählt und gelistet
// werden nur Funde zu Positionen, die der aktive Filter durchlässt.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { formatCount } from '../../lib/format';
import { matchCount } from '../../lib/tree/matchCounts';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { Flag, FlagCategory, RuleStatus } from '../../lib/check';

const CATEGORY_LABELS: Record<FlagCategory, string> = {
  vob: 'VOB',
  menge: 'Menge',
  risiko: 'Risiko',
  norm: 'Norm',
  frist: 'Frist',
  geld: 'Geld',
};

/** Anzeigereihenfolge der Gruppen. */
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as FlagCategory[];

/** Funde je Regel im aktuellen Filterzustand. */
function useFlagsByRule(): Map<string, Flag[]> {
  const { lv, nodes, matches } = useViewer();
  const check = lv?.check ?? null;
  return useMemo(() => {
    const map = new Map<string, Flag[]>();
    for (const flag of check?.flags ?? []) {
      // Dieselbe gefilterte Menge wie Graph und Tabelle: `matches` ist bereits
      // gegen den aktiven Filter gerechnet.
      if (matches.filtering) {
        const node = nodes.get(flag.positionId);
        if (node === undefined || matchCount(matches, node) === 0) continue;
      }
      const list = map.get(flag.id) ?? [];
      list.push(flag);
      map.set(flag.id, list);
    }
    return map;
  }, [check, matches, nodes]);
}

/** Die aufgeklappte Regel — höchstens eine, siehe `toggleRuleOpen`. */
function useOpenRule(): string | null {
  const {
    view: {
      overview: { openRules },
    },
  } = useViewer();
  const [first] = openRules;
  return first ?? null;
}

function Switch({ rule, on, onToggle }: { rule: RuleStatus; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Regel ${rule.id} anzeigen`}
      title={on ? 'Regel abschalten' : 'Regel wieder anzeigen'}
      onClick={(event) => {
        // Der Schalter sitzt in der Zeile — ein Klick soll sie nicht aufklappen.
        event.stopPropagation();
        onToggle();
      }}
      className={`relative h-[13px] w-[22px] shrink-0 cursor-pointer rounded-[var(--r-pill)] border-none p-0 after:absolute after:top-[2px] after:h-[9px] after:w-[9px] after:rounded-full after:bg-surface after:transition-[left] after:duration-100 after:content-[''] ${
        on ? 'bg-blue after:left-[11px]' : 'bg-line2 after:left-[2px]'
      }`}
    />
  );
}

export function CheckCard() {
  const {
    lv,
    filter: { mutedRules },
    view: {
      overview: { revealRule },
    },
    matches,
  } = useViewer();
  const dispatch = useViewerDispatch();
  const byRule = useFlagsByRule();
  const openRule = useOpenRule();

  // Sprung aus dem Graphen: die aufgeklappte Regel ins Fenster holen.
  const rows = useRef(new Map<string, HTMLElement>());
  const attachRow = useCallback((id: string, node: HTMLElement | null): void => {
    if (node === null) rows.current.delete(id);
    else rows.current.set(id, node);
  }, []);
  useEffect(() => {
    if (revealRule === null) return;
    rows.current.get(revealRule)?.scrollIntoView({ block: 'nearest' });
    dispatch({ type: 'ruleRevealed' });
  }, [revealRule, dispatch]);

  const check = lv?.check ?? null;
  if (check === null) return null;

  const countOf = (rule: RuleStatus): number =>
    rule.active ? (byRule.get(rule.id)?.length ?? 0) : 0;
  const sichtbar = check.rules.filter((rule) => rule.active && !mutedRules.has(rule.id));
  const gesamt = sichtbar.reduce((sum, rule) => sum + countOf(rule), 0);

  // Ohne Treffer und eingeschaltet: nur eine Sammelzeile. Abgeschaltete Regeln
  // bleiben als Zeile stehen, damit man sie wieder einschalten kann.
  const ohneTreffer = check.rules.filter(
    (rule) => rule.active && countOf(rule) === 0 && !mutedRules.has(rule.id),
  );
  const zeilen = check.rules.filter((rule) => rule.active && !ohneTreffer.includes(rule));
  const inaktiv = check.rules.filter((rule) => !rule.active);

  return (
    <div>
      <p className="flex items-baseline gap-[8px] pb-[6px]">
        <span className="font-sans text-[15px] font-semibold text-ink">{formatCount(gesamt)}</span>
        <span className="font-mono text-[10.5px] text-mute">
          {gesamt === 1 ? 'Hinweis' : 'Hinweise'} · {sichtbar.length} Regeln
          {matches.filtering && ' · im aktuellen Filter'}
        </span>
      </p>

      {CATEGORY_ORDER.map((category) => {
        const inGruppe = zeilen.filter((rule) => rule.category === category);
        if (inGruppe.length === 0) return null;
        return (
          <div key={category}>
            <p className="pb-[4px] pt-[10px] font-mono text-[9px] uppercase tracking-[.6px] text-mute">
              {CATEGORY_LABELS[category]}
            </p>
            {inGruppe.map((rule) => {
              const muted = mutedRules.has(rule.id);
              const count = countOf(rule);
              const open = openRule === rule.id && !muted;
              const canOpen = !muted && count > 0;
              return (
                <section
                  key={rule.id}
                  ref={(node) => attachRow(rule.id, node)}
                  aria-label={`${rule.id} ${rule.label}`}
                  className={`-mx-[6px] grid grid-cols-[auto_1fr_auto_auto] items-center gap-[8px] border-t border-grid px-[6px] py-[6px] ${
                    open ? 'bg-blueS shadow-[inset_2px_0_0_var(--blue)]' : 'hover:bg-sunken'
                  }`}
                >
                  <Switch
                    rule={rule}
                    on={!muted}
                    onToggle={() => dispatch({ type: 'toggleRule', id: rule.id })}
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'toggleRuleOpen', id: rule.id })}
                    disabled={!canOpen}
                    aria-expanded={open}
                    title={rule.label}
                    className={`min-w-0 cursor-pointer truncate border-none bg-transparent p-0 text-left font-sans text-[12.5px] font-semibold disabled:cursor-default ${
                      open ? 'text-blueD' : 'text-ink'
                    } ${muted ? 'opacity-45' : ''}`}
                  >
                    <span className="mr-[6px] font-mono text-[10px] font-normal text-mute">
                      {rule.id}
                    </span>
                    {rule.label}
                  </button>
                  <span
                    className={`min-w-[24px] rounded-[var(--r-pill)] px-[6px] py-[1px] text-center font-mono text-[10.5px] tabular-nums ${
                      rule.severity === 'beachten'
                        ? 'bg-amberS font-semibold text-amberD'
                        : 'bg-sunken text-dim'
                    } ${muted ? 'opacity-45' : ''}`}
                  >
                    {formatCount(count)}
                  </span>
                  <span aria-hidden="true" className="font-mono text-[11px] text-mute">
                    {canOpen ? '›' : ''}
                  </span>
                </section>
              );
            })}
          </div>
        );
      })}

      {ohneTreffer.length > 0 && (
        <p className="mt-[10px] border-t border-grid pt-[8px] font-mono text-[10.5px] text-mute">
          Ohne Treffer: {ohneTreffer.map((rule) => rule.id).join(', ')}
        </p>
      )}
      {inaktiv.map((rule) => (
        <section
          key={rule.id}
          aria-label={`${rule.id} ${rule.label}`}
          className="mt-[6px] font-mono text-[10.5px] text-mute"
        >
          <span className="mr-[6px]">{rule.id}</span>
          <span>inaktiv</span>
          {rule.inactiveReason !== null && <span className="block">{rule.inactiveReason}</span>}
        </section>
      ))}
      <p className="mt-[12px] font-mono text-[10px] text-mute">Hinweise, kein Rechtsrat.</p>
    </div>
  );
}

/**
 * Klappkarte neben dem Seitenfenster: Hinweistext, Verweis und Funde der
 * aufgeklappten Regel. Ein Fund wählt die Position im Graphen aus.
 */
export function CheckFlyout({ left }: { left: number }) {
  const {
    lv,
    nodes,
    filter: { mutedRules },
    selection: { positionId: selected },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpTo = useJumpToPosition();
  const byRule = useFlagsByRule();
  const openRule = useOpenRule();

  const rule = lv?.check.rules.find((entry) => entry.id === openRule) ?? null;
  const flags = rule === null ? [] : (byRule.get(rule.id) ?? []);
  if (rule === null || !rule.active || mutedRules.has(rule.id) || flags.length === 0) return null;

  return (
    <section
      aria-label={`Funde ${rule.id}`}
      // Fehlt rechts der Platz, legt sie sich über das Seitenfenster.
      style={{
        left: `min(${left}px, calc(100% - 316px))`,
        bottom: 'max(64px, calc(var(--legend-space, 0px) + 28px))',
      }}
      className="ov-glass absolute top-[88px] z-[10] flex w-[300px] max-w-[calc(100%-32px)] flex-col overflow-hidden"
    >
      <div className="flex shrink-0 items-center gap-[8px] border-b border-line px-[14px] py-[10px]">
        <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-semibold text-ink">
          {rule.id} · {formatCount(flags.length)} {flags.length === 1 ? 'Fund' : 'Funde'}
        </span>
        <button
          type="button"
          onClick={() => dispatch({ type: 'toggleRuleOpen', id: rule.id })}
          aria-label="Funde schließen"
          className="inline-flex h-[24px] w-[24px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-[14px] pb-[14px] pt-[10px]">
        {rule.hint !== '' && (
          <p className="mb-[4px] font-sans text-[11.5px] leading-[1.5] text-dim">{rule.hint}</p>
        )}
        {rule.ruleRef !== '' && (
          <p className="mb-[8px] font-mono text-[10px] text-mute">
            {rule.ruleRef}
            {!rule.refConfirmed && (
              <span
                className="ml-[6px] border px-[4px] py-[1px]"
                style={{ borderColor: 'var(--amber)', color: 'var(--amberD)' }}
                title="Der Norm-Verweis ist noch nicht bestätigt — siehe docs/domain/vob-pruefungen.md"
              >
                Verweis zu bestätigen
              </span>
            )}
          </p>
        )}
        {flags.map((flag, index) => {
          const position = nodes.get(flag.positionId)?.position ?? null;
          const isSelected = selected === flag.positionId;
          return (
            <button
              key={`${flag.positionId}-${index}`}
              type="button"
              onClick={() => jumpTo(flag.positionId, { stayInView: true })}
              disabled={position === null}
              aria-current={isSelected ? 'true' : undefined}
              className={`-mx-[6px] block w-[calc(100%+12px)] cursor-pointer border-none border-t border-solid border-grid px-[6px] py-[6px] text-left disabled:cursor-default ${
                isSelected
                  ? 'bg-blueS shadow-[inset_2px_0_0_var(--blue)]'
                  : 'bg-transparent hover:bg-sunken'
              }`}
            >
              <span className="flex min-w-0 gap-[8px]">
                <span className="shrink-0 font-mono text-[10px] text-dim">
                  {position?.oz ?? '—'}
                </span>
                <span className="min-w-0 truncate font-sans text-[11.5px] text-ink">
                  {position?.shortText ?? 'Position nicht gefunden'}
                </span>
              </span>
              <span className="mt-[1px] block font-mono text-[10px] text-mute">{flag.title}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
