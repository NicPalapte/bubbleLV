// Reiter „Regeln" der Admin-Werkzeuge (Entscheidungen 0081, 0089): links alle Regeln nach
// Wirkung gruppiert, jede mit Schalter, rechts der Baukasten und die Treffer im geladenen LV.
// Eigene Regeln speichern sich bei jeder Änderung im Browser; der Grundstock
// (docs/domain/reference/regeln.json) lässt sich nur abschalten oder als eigene Regel
// kopieren. Austausch über „Regeln importieren/exportieren“ (`regeln.json`).

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  blocksOf,
  matchCondition,
  parseRuleFile,
  positionLinkOf,
  ruleIdOf,
  ruleKey,
  suggestLinks,
  toRuleFile,
  type Rule,
  type RuleHit,
} from '@core';
import { RuleEditor } from './RuleEditor';
import { RuleSwitch } from './RuleSwitch';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { downloadText } from '../../lib/export/download';
import { linkOf } from '../../lib/positionLinks';
import { LEARNED_NOTE } from '../../lib/highlight/terms';
import {
  copyOf,
  GRUNDSTOCK,
  linkCandidatesOf,
  newRule,
  RULE_GROUP_LABELS,
  ruleGroupOf,
  ruleTextOf,
  type RuleGroup,
} from '../../lib/rules/rules';
import { HINT_LABELS } from '../../lib/rules/sentence';
import { useAdmin } from '../../state/admin';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** So viele Treffer bzw. Paare zeigt die Vorschau; die Zahl darüber zählt alle. */
const PREVIEW_LIMIT = 40;
/** So viel Text steht um einen Treffer herum in der Vorschau. */
const SNIPPET = 140;

const BUTTON =
  'inline-flex h-[28px] cursor-pointer items-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] font-mono text-[11.5px] text-ink hover:border-line2 disabled:cursor-default disabled:opacity-40';

/** Grundstock-Regeln, die schon in regeln.json aus sind: nur abschalten erlaubt (0089). */
const lockedIds: ReadonlySet<string> = new Set(
  GRUNDSTOCK.filter((rule) => rule.status !== 'freigegeben').map((rule) => rule.id),
);

const GROUPS: readonly RuleGroup[] = ['hervorheben', 'pruefhinweis', 'verknuepfen', 'pdf'];

/** Label neben dem Namen: „gelernt“ (Begriff aus dem Langtext, 0088), „eigene“; Grundstock ohne. */
function labelOf(rule: Rule, grundstock: boolean): string | null {
  if (grundstock) return null;
  return rule.bemerkung === LEARNED_NOTE ? 'gelernt' : 'eigene';
}

/** Brauchbare Regeln einer `regeln.json` und wie viele Einträge die Datei hatte. */
function parseJsonRules(text: string): { rules: Rule[]; total: number } {
  try {
    const value: unknown = JSON.parse(text);
    const entries =
      typeof value === 'object' && value !== null && 'regeln' in value ? value.regeln : null;
    return { rules: parseRuleFile(value), total: Array.isArray(entries) ? entries.length : 0 };
  } catch {
    return { rules: [], total: 0 };
  }
}

/** Ausschnitt eines Treffers mit hervorgehobenen Fundstellen. */
function Snippet({ text, hit }: { text: string; hit: RuleHit }) {
  const start = Math.max(hit.start, (hit.marks[0]?.start ?? hit.start) - SNIPPET / 2);
  const end = Math.min(hit.end, start + SNIPPET);
  const parts: Array<{ text: string; mark: boolean }> = [];
  let at = start;
  for (const mark of hit.marks) {
    if (mark.start < at || mark.end > end) continue;
    parts.push({ text: text.slice(at, mark.start), mark: false });
    parts.push({ text: text.slice(mark.start, mark.end), mark: true });
    at = mark.end;
  }
  parts.push({ text: text.slice(at, end), mark: false });
  return (
    <span className="font-sans text-[12.5px] leading-[1.45] text-ink">
      {start > 0 && '… '}
      {parts.map((part, i) =>
        part.mark ? (
          <mark
            key={i}
            className="rounded-[2px] border-b-2 border-amber bg-amberS px-[1px] text-ink"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
      {end < text.length && ' …'}
    </span>
  );
}

function HitPreview({ rule, positions }: { rule: Rule; positions: readonly LVNode[] }) {
  const jump = useJumpToPosition();
  const { context } = useAdmin();
  const hits = useMemo(() => {
    const out: Array<{ node: LVNode; hit: RuleHit }> = [];
    for (const node of positions) {
      if (node.position === null) continue;
      const hit = matchCondition(rule.bedingung, ruleTextOf(node.position), context)[0];
      if (hit !== undefined) out.push({ node, hit });
    }
    return out;
  }, [rule.bedingung, positions, context]);

  // PDF-Regeln (0085) treffen keine Position; ihre Vorschau braucht ein offenes PDF.
  if (rule.bedingung.wo.every((field) => field === 'pdf')) {
    return (
      <span className="font-sans text-[12.5px] text-mute">
        Diese Regel sucht im PDF. Treffer zeigt der Bereich „Dokument“.
      </span>
    );
  }
  // Eingebaute Logik braucht das ganze LV und läuft nur beim Laden (lib/check/builtins.ts).
  if (blocksOf(rule.bedingung).some((block) => 'eingebaut' in block)) {
    return (
      <span className="font-sans text-[12.5px] text-mute">
        Eingebaute Prüfung. Ihre Funde stehen in „Prüfung“.
      </span>
    );
  }

  return (
    <>
      <span className="font-mono text-[12px] font-semibold text-accent">
        {hits.length} von {positions.length} Positionen
      </span>
      <ul className="m-0 flex list-none flex-col p-0">
        {hits.slice(0, PREVIEW_LIMIT).map(({ node, hit }) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => jump(node.id)}
              title="Zur Position springen"
              className="grid w-full cursor-pointer grid-cols-[92px_minmax(0,1fr)] gap-[10px] rounded-[var(--r-sm)] border-none bg-transparent px-[8px] py-[6px] text-left hover:bg-sunken"
            >
              <span className="font-mono text-[12px] text-dim">{node.position?.oz}</span>
              {hit.feld === 'position' ? (
                // Trifft die Position als Ganzes (Angaben): Kurztext statt Ausschnitt.
                <span className="truncate font-sans text-[12.5px] leading-[1.45] text-ink">
                  {node.position?.shortText}
                </span>
              ) : (
                <Snippet
                  text={
                    hit.feld === 'kurztext'
                      ? (node.position?.shortText ?? '')
                      : (node.position?.longText ?? '')
                  }
                  hit={hit}
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function LinkPreview({ rule, positions }: { rule: Rule; positions: readonly LVNode[] }) {
  const { parents, nodes, annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const jump = useJumpToPosition();
  const { context } = useAdmin();
  const links = annotations.links ?? [];
  const result = useMemo(() => {
    const link = positionLinkOf(rule.wirkung);
    if (link === null) return { pairs: [], truncated: false };
    const { ziel, gleich } = link;
    const candidates = linkCandidatesOf(positions, parents);
    return suggestLinks(rule.bedingung, ziel, gleich, candidates, undefined, context);
  }, [rule.bedingung, rule.wirkung, positions, parents, context]);
  const key = ruleKey(rule);
  const name = (id: string): string => {
    const position = nodes.get(id)?.position;
    return position === undefined || position === null
      ? id
      : `${position.oz} ${position.shortText}`;
  };

  return (
    <>
      <span className="font-mono text-[12px] font-semibold text-accent">
        {result.pairs.length}
        {result.truncated ? '+' : ''} Paare vorgeschlagen
      </span>
      {result.truncated && (
        <span className="font-sans text-[12px] text-amber">
          Sehr viele Paare: die Regel ist zu allgemein. Bausteine oder „Nur mit“ enger fassen.
        </span>
      )}
      <ul className="m-0 flex list-none flex-col gap-[2px] p-0">
        {result.pairs.slice(0, PREVIEW_LIMIT).map((pair) => {
          const verdict = linkOf(links, pair.from, pair.to)?.status;
          const judge = (status: 'bestaetigt' | 'verworfen'): void =>
            dispatch({
              type: 'judgeLink',
              x: pair.from,
              y: pair.to,
              status,
              regel: key,
              at: Date.now(),
            });
          return (
            <li
              key={`${pair.from}|${pair.to}`}
              className="flex flex-wrap items-center gap-[8px] rounded-[var(--r-sm)] px-[8px] py-[5px] hover:bg-sunken"
            >
              <button
                type="button"
                onClick={() => jump(pair.from)}
                className="min-w-0 max-w-[40%] cursor-pointer truncate border-none bg-transparent p-0 text-left font-sans text-[12.5px] text-ink"
                title={name(pair.from)}
              >
                {name(pair.from)}
              </button>
              <span className="font-mono text-[12px] text-mute">↔</span>
              <button
                type="button"
                onClick={() => jump(pair.to)}
                className="min-w-0 max-w-[40%] flex-1 cursor-pointer truncate border-none bg-transparent p-0 text-left font-sans text-[12.5px] text-ink"
                title={name(pair.to)}
              >
                {name(pair.to)}
              </button>
              {verdict === undefined ? (
                <span className="ml-auto flex gap-[6px]">
                  <button
                    type="button"
                    onClick={() => judge('bestaetigt')}
                    className="inline-flex h-[24px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-accent-fill px-[10px] font-mono text-[11px] text-white"
                  >
                    Ja
                  </button>
                  <button type="button" onClick={() => judge('verworfen')} className={BUTTON}>
                    Nein
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'forgetLink', x: pair.from, y: pair.to })}
                  title="Urteil zurücknehmen"
                  className={`ml-auto cursor-pointer border-none bg-transparent font-mono text-[11.5px] ${
                    verdict === 'bestaetigt' ? 'text-greenD' : 'text-mute'
                  }`}
                >
                  {verdict === 'bestaetigt' ? 'verbunden ✓' : 'abgelehnt'} ↺
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function RuleListItem({
  rule,
  label,
  locked,
  selected,
  onSelect,
  onToggle,
}: {
  rule: Rule;
  label: string | null;
  locked: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const on = rule.status === 'freigegeben';
  return (
    <li
      className={`flex items-center gap-[8px] border-0 border-l-[3px] px-[14px] py-[6px] ${
        selected ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-sunken'
      }`}
    >
      <RuleSwitch on={on} label={rule.name} locked={locked} onToggle={onToggle} />
      <button
        type="button"
        aria-current={selected}
        onClick={onSelect}
        title={rule.name}
        className={`min-w-0 flex-1 cursor-pointer truncate border-none bg-transparent p-0 text-left font-sans text-[13px] ${
          on ? 'text-ink' : 'text-mute line-through'
        }`}
      >
        {rule.name}
      </button>
      {label !== null && (
        <span className="shrink-0 rounded-[var(--r-pill)] bg-cyanS px-[7px] py-[1px] font-mono text-[10.5px] text-cyan">
          {label}
        </span>
      )}
    </li>
  );
}

/** So erscheint ein Prüfhinweis in „Prüfung“ — Vorschau im Editor. */
function HintCard({ rule, own }: { rule: Rule; own: boolean }) {
  if (!('pruefhinweis' in rule.wirkung)) return null;
  const hint = rule.wirkung.pruefhinweis;
  return (
    <div className="flex flex-col gap-[6px] rounded-[var(--r-md)] border border-line p-[12px]">
      <span className="font-display text-[13px] font-semibold text-ink">
        So erscheint es in „Prüfung“
      </span>
      <div
        className={`flex flex-col gap-[3px] rounded-[var(--r-sm)] border border-l-[3px] border-line bg-surface px-[10px] py-[8px] ${
          hint.schwere === 'beachten' ? 'border-l-amber' : 'border-l-line2'
        }`}
      >
        <span className="flex flex-wrap items-center gap-[8px] font-sans text-[13px] font-semibold text-ink">
          {rule.name}
          <span className="rounded-[var(--r-pill)] bg-sunken px-[7px] font-mono text-[10.5px] font-normal text-mute">
            {HINT_LABELS[hint.kategorie]}
          </span>
          {own && (
            <span className="rounded-[var(--r-pill)] bg-cyanS px-[7px] font-mono text-[10.5px] font-normal text-cyan">
              eigene Regel
            </span>
          )}
        </span>
        <span className="font-sans text-[12.5px] text-ink">{hint.text}</span>
        {hint.norm !== undefined && (
          <span className="font-mono text-[11px] text-mute">
            {hint.norm.verweis}
            {hint.norm.stand === 'bestaetigt' ? '' : ' · Verweis zu bestätigen'}
          </span>
        )}
      </div>
    </div>
  );
}

export function RulesTab() {
  const { ownRules, saveRule, deleteRule, ruleRequest, grundstockOff, setGrundstockOn } =
    useAdmin();
  const { index, lv } = useViewer();
  const [selectedId, setSelectedId] = useState<string | null>(
    ruleRequest?.id ?? ownRules[0]?.id ?? GRUNDSTOCK[0]?.id ?? null,
  );
  const [showJson, setShowJson] = useState(false);
  const [query, setQuery] = useState('');
  const [importNote, setImportNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taken = (): Set<string> => new Set([...GRUNDSTOCK, ...ownRules].map((rule) => rule.id));

  // Regel aus einer Markierung im Langtext (schon gespeichert): zeigen, auch bei offenem Fenster.
  const [seenRequest, setSeenRequest] = useState(ruleRequest);
  if (ruleRequest !== seenRequest) {
    setSeenRequest(ruleRequest);
    if (ruleRequest !== null) setSelectedId(ruleRequest.id);
  }

  // Urteile über Verbindungen hängen an `id@version`. Ändert sich Bedingung oder Wirkung,
  // gilt die Regel einmal je Auswahl als neue Version — alte Ja/Nein bleiben bei der alten.
  const [bumpedFor, setBumpedFor] = useState<string | null>(null);
  const [shownId, setShownId] = useState(selectedId);
  if (shownId !== selectedId) {
    setShownId(selectedId);
    setBumpedFor(null);
  }

  // Grundstock mit dem Schalter dieser Firma: abgeschaltet heißt Status `aus` (0089).
  const grundstockRules = useMemo(
    () =>
      GRUNDSTOCK.map((entry): Rule =>
        grundstockOff.has(entry.id) ? { ...entry, status: 'aus' } : entry,
      ),
    [grundstockOff],
  );
  const own = ownRules.find((rule) => rule.id === selectedId);
  const rule = own ?? grundstockRules.find((entry) => entry.id === selectedId) ?? null;
  const grundstock = own === undefined;
  const readOnly = grundstock;
  const positions = index.nodes;
  // Vorschau über alle Positionen hinter dem Tippen herlaufen lassen, nicht je Taste blockieren.
  const preview = useDeferredValue(rule);

  const editRule = (next: Rule): void => {
    if (own === undefined) return;
    const changed = next.bedingung !== own.bedingung || next.wirkung !== own.wirkung;
    if (changed && bumpedFor !== own.id) {
      setBumpedFor(own.id);
      saveRule({ ...next, version: own.version + 1 });
      return;
    }
    saveRule(next);
  };

  const toggle = (entry: Rule): void => {
    const on = entry.status === 'freigegeben';
    if (GRUNDSTOCK.some((base) => base.id === entry.id)) setGrundstockOn(entry.id, !on);
    // Nur der Status ändert sich: keine neue Version, Urteile über Verbindungen bleiben.
    else saveRule({ ...entry, status: on ? 'aus' : 'freigegeben' });
  };

  // Die Kopie ersetzt das Original: Grundstock-Regel aus, Kopie an (Entscheidung 0089).
  const copyAsOwn = (source: Rule): void => {
    const copy = copyOf(source, taken());
    saveRule(copy);
    setGrundstockOn(source.id, false);
    setSelectedId(copy.id);
  };

  const needle = query.trim().toLowerCase();
  const listed = [
    ...grundstockRules.map((entry) => ({ rule: entry, grundstock: true })),
    ...ownRules.map((entry) => ({ rule: entry, grundstock: false })),
  ].filter(({ rule: entry }) => needle === '' || entry.name.toLowerCase().includes(needle));

  const importFile = (file: File): void => {
    void file.text().then(
      (text) => {
        const { rules, total } = parseJsonRules(text);
        const grundstock = new Set(GRUNDSTOCK.map((entry) => entry.id));
        const used = taken();
        // Gleiche Kennung wie eine eigene Regel: als neue Regel daneben, nie überschreiben.
        const added = rules
          .filter((entry) => !grundstock.has(entry.id))
          .map((entry) => {
            const id = used.has(entry.id) ? ruleIdOf(entry.name, used) : entry.id;
            used.add(id);
            return id === entry.id ? entry : { ...entry, id, version: 1 };
          });
        for (const entry of added) saveRule(entry);
        const skipped = total - added.length;
        setImportNote(
          added.length === 0
            ? 'Keine Regeln gefunden. Erwartet wird eine regeln.json (bubble-rule-v1).'
            : `${added.length} Regel${added.length === 1 ? '' : 'n'} übernommen` +
                (skipped > 0 ? `, ${skipped} übersprungen (Grundstock oder unlesbar).` : '.'),
        );
        if (added[0] !== undefined) setSelectedId(added[0].id);
      },
      () => setImportNote('Datei konnte nicht gelesen werden.'),
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-[8px] border-b border-line px-[16px] py-[10px]">
        <button
          type="button"
          onClick={() => {
            const next = newRule(taken());
            saveRule(next);
            setSelectedId(next.id);
          }}
          className={BUTTON}
        >
          + Neue Regel
        </button>
        <span className="flex-1" />
        <button type="button" onClick={() => fileRef.current?.click()} className={BUTTON}>
          Regeln importieren
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Regeln importieren"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) importFile(file);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={ownRules.length === 0}
          onClick={() =>
            downloadText(
              'regeln.json',
              `${JSON.stringify(toRuleFile(ownRules), null, 2)}\n`,
              'json',
            )
          }
          title="Deine eigenen Regeln als Datei regeln.json — zum Weitergeben oder für den Grundstock"
          className={BUTTON}
        >
          Regeln exportieren
        </button>
      </div>
      {importNote !== null && (
        <p className="m-0 border-b border-line px-[16px] py-[6px] font-mono text-[11.5px] text-dim">
          {importNote}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Regeln"
          className="border-b border-line py-[8px] md:border-b-0 md:border-r"
        >
          <div className="px-[14px] pb-[4px] pt-[2px]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Regel suchen"
              placeholder="Regel suchen"
              className="h-[30px] w-full rounded-[var(--r-sm)] border border-line bg-surface px-[8px] font-sans text-[12.5px] text-ink outline-none focus:border-accent"
            />
          </div>
          {GROUPS.map((group) => {
            const entries = listed.filter(({ rule: entry }) => ruleGroupOf(entry) === group);
            if (entries.length === 0) return null;
            const on = entries.filter(({ rule: entry }) => entry.status === 'freigegeben');
            return (
              <section key={group} aria-label={RULE_GROUP_LABELS[group]}>
                <div className="flex justify-between px-[14px] pb-[4px] pt-[12px] font-mono text-[10.5px] uppercase tracking-[0.06em] text-mute">
                  <span>{RULE_GROUP_LABELS[group]}</span>
                  <span>
                    {on.length} von {entries.length} an
                  </span>
                </div>
                <ul className="m-0 list-none p-0">
                  {entries.map(({ rule: entry, grundstock: base }) => (
                    <RuleListItem
                      key={entry.id}
                      rule={entry}
                      label={labelOf(entry, base)}
                      locked={lockedIds.has(entry.id)}
                      selected={entry.id === selectedId}
                      onSelect={() => setSelectedId(entry.id)}
                      onToggle={() => toggle(entry)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          {listed.length === 0 && (
            <p className="m-0 px-[14px] py-[6px] font-sans text-[12px] text-mute">
              Keine Regel mit diesem Namen.
            </p>
          )}
          {ownRules.length === 0 && needle === '' && (
            <p className="m-0 px-[14px] pt-[12px] font-sans text-[12px] text-mute">
              Eigene Regeln: „+ Neue Regel“ oder im Langtext Text markieren → „Als Regel…“ oder
              „Begriff lernen…“.
            </p>
          )}
        </nav>
        <section className="flex min-w-0 flex-col gap-[14px] p-[16px]">
          {rule === null ? (
            <p className="m-0 font-sans text-[13px] text-mute">Links eine Regel wählen.</p>
          ) : (
            <>
              {grundstock && (
                <p className="m-0 flex flex-wrap items-center gap-[10px] rounded-[var(--r-sm)] bg-amberS px-[10px] py-[6px] font-sans text-[12px] text-amber">
                  <span className="min-w-[200px] flex-1">
                    Grundstock-Regel: für alle Firmen gleich. Du kannst sie für deine Firma
                    abschalten oder als eigene Regel kopieren und die Kopie ändern.
                  </span>
                  <button type="button" onClick={() => copyAsOwn(rule)} className={BUTTON}>
                    Als eigene kopieren
                  </button>
                </p>
              )}
              <RuleEditor
                rule={rule}
                readOnly={readOnly}
                label={labelOf(rule, grundstock)}
                locked={lockedIds.has(rule.id)}
                onToggle={() => toggle(rule)}
                onChange={editRule}
              />
              <HintCard rule={rule} own={!grundstock} />
              <div className="flex flex-col gap-[6px] rounded-[var(--r-md)] border border-line p-[12px]">
                <span className="font-display text-[13px] font-semibold text-ink">
                  {positionLinkOf(rule.wirkung) !== null
                    ? 'Vorschläge im geladenen LV'
                    : 'Treffer im geladenen LV'}
                </span>
                {lv === null || preview === null ? (
                  <span className="font-sans text-[12.5px] text-mute">
                    Erst ein LV öffnen, dann stehen hier die Treffer.
                  </span>
                ) : positionLinkOf(preview.wirkung) !== null ? (
                  <LinkPreview rule={preview} positions={positions} />
                ) : (
                  <HitPreview rule={preview} positions={positions} />
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-[8px]">
                <button type="button" onClick={() => setShowJson((on) => !on)} className={BUTTON}>
                  {showJson ? 'JSON ausblenden' : 'JSON zeigen'}
                </button>
                {!grundstock && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteRule(rule.id);
                      setSelectedId(GRUNDSTOCK[0]?.id ?? null);
                    }}
                    className={BUTTON}
                  >
                    Löschen
                  </button>
                )}
              </div>
              {showJson && (
                <pre className="m-0 overflow-x-auto rounded-[var(--r-sm)] bg-sunken p-[10px] font-mono text-[11.5px] leading-[1.5] text-ink">
                  {JSON.stringify(rule, null, 2)}
                </pre>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
