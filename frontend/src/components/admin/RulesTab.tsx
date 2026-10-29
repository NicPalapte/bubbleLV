// Reiter „Regeln" der Admin-Werkzeuge (Entscheidung 0081): links Grundstock und eigene
// Regeln, rechts der Baukasten und die Treffer im geladenen LV. Eigene Regeln speichern
// sich bei jeder Änderung im Browser; der Grundstock (docs/domain/reference/regeln.json)
// ist nur lesbar und lässt sich als eigene Regel kopieren. Austausch über `regeln.json`.

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
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
import { useJumpToPosition } from '../common/useJumpToPosition';
import { downloadText } from '../../lib/export/download';
import { linkOf } from '../../lib/positionLinks';
import {
  GRUNDSTOCK,
  isEditable,
  linkCandidatesOf,
  newRule,
  ruleTextOf,
} from '../../lib/rules/rules';
import { useAdmin } from '../../state/admin';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** So viele Treffer bzw. Paare zeigt die Vorschau; die Zahl darüber zählt alle. */
const PREVIEW_LIMIT = 40;
/** So viel Text steht um einen Treffer herum in der Vorschau. */
const SNIPPET = 140;

const BUTTON =
  'inline-flex h-[28px] cursor-pointer items-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] font-mono text-[11.5px] text-ink hover:border-line2 disabled:cursor-default disabled:opacity-40';

const STATUS_LABEL: Readonly<Record<Rule['status'], string>> = {
  entwurf: 'Entwurf',
  freigegeben: 'aktiv',
  aus: 'aus',
};

/** Kurz, was die Regel tut — in der Liste neben dem Status. */
function effectLabel(rule: Rule): string {
  if ('hervorheben' in rule.wirkung) return 'hervorheben';
  if ('pruefhinweis' in rule.wirkung) return 'prüfen';
  return positionLinkOf(rule.wirkung) === null ? 'mit PDF verknüpfen' : 'verbinden';
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
  const hits = useMemo(() => {
    const out: Array<{ node: LVNode; hit: RuleHit }> = [];
    for (const node of positions) {
      if (node.position === null) continue;
      const hit = matchCondition(rule.bedingung, ruleTextOf(node.position))[0];
      if (hit !== undefined) out.push({ node, hit });
    }
    return out;
  }, [rule.bedingung, positions]);

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
              <Snippet
                text={
                  hit.feld === 'kurztext'
                    ? (node.position?.shortText ?? '')
                    : (node.position?.longText ?? '')
                }
                hit={hit}
              />
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
  const links = annotations.links ?? [];
  const result = useMemo(() => {
    const link = positionLinkOf(rule.wirkung);
    if (link === null) return { pairs: [], truncated: false };
    const { ziel, gleich } = link;
    return suggestLinks(rule.bedingung, ziel, gleich, linkCandidatesOf(positions, parents));
  }, [rule.bedingung, rule.wirkung, positions, parents]);
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
  selected,
  onSelect,
}: {
  rule: Rule;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={selected}
        onClick={onSelect}
        className={`flex w-full cursor-pointer flex-col gap-[2px] border-0 border-l-[3px] px-[14px] py-[7px] text-left ${
          selected
            ? 'border-accent bg-accent-soft'
            : 'border-transparent bg-transparent hover:bg-sunken'
        }`}
      >
        <span className="font-sans text-[13px] text-ink">{rule.name}</span>
        <span className="font-mono text-[11px] text-mute">
          <span className={rule.status === 'freigegeben' ? 'text-greenD' : undefined}>
            {STATUS_LABEL[rule.status]}
          </span>
          {' · '}
          {effectLabel(rule)}
        </span>
      </button>
    </li>
  );
}

export function RulesTab() {
  const { ownRules, saveRule, deleteRule, ruleRequest } = useAdmin();
  const { index, lv } = useViewer();
  const [selectedId, setSelectedId] = useState<string | null>(
    ruleRequest?.id ?? ownRules[0]?.id ?? GRUNDSTOCK[0]?.id ?? null,
  );
  const [showJson, setShowJson] = useState(false);
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

  const own = ownRules.find((rule) => rule.id === selectedId);
  const rule = own ?? GRUNDSTOCK.find((entry) => entry.id === selectedId) ?? null;
  const grundstock = own === undefined;
  // Regeln mit Teilen, die der Editor noch nicht kennt (0085), nur lesen.
  const readOnly = grundstock || (rule !== null && !isEditable(rule));
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

  const copyAsOwn = (source: Rule): void => {
    const name = `${source.name} (eigene)`;
    const copy: Rule = {
      ...source,
      id: ruleIdOf(name, taken()),
      version: 1,
      name,
      geltung: 'unternehmen',
      status: 'entwurf',
    };
    saveRule(copy);
    setSelectedId(copy.id);
  };

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
          regeln.json laden
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="regeln.json laden"
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
          title="Deine eigenen Regeln als Datei — zum Weitergeben oder für den Grundstock"
          className={BUTTON}
        >
          regeln.json herunterladen
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
          <div className="flex justify-between px-[14px] pb-[4px] pt-[6px] font-mono text-[10.5px] uppercase tracking-[0.06em] text-mute">
            <span>Grundstock</span>
            <span>alle Firmen</span>
          </div>
          <ul className="m-0 list-none p-0">
            {GRUNDSTOCK.map((entry) => (
              <RuleListItem
                key={entry.id}
                rule={entry}
                selected={entry.id === selectedId}
                onSelect={() => setSelectedId(entry.id)}
              />
            ))}
          </ul>
          <div className="flex justify-between px-[14px] pb-[4px] pt-[12px] font-mono text-[10.5px] uppercase tracking-[0.06em] text-mute">
            <span>Eigene Regeln</span>
            <span>deine Firma</span>
          </div>
          {ownRules.length === 0 ? (
            <p className="m-0 px-[14px] py-[6px] font-sans text-[12px] text-mute">
              Noch keine. „+ Neue Regel“ oder im Langtext Text markieren → „Als Regel…“.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {ownRules.map((entry) => (
                <RuleListItem
                  key={entry.id}
                  rule={entry}
                  selected={entry.id === selectedId}
                  onSelect={() => setSelectedId(entry.id)}
                />
              ))}
            </ul>
          )}
        </nav>
        <section className="flex min-w-0 flex-col gap-[14px] p-[16px]">
          {rule === null ? (
            <p className="m-0 font-sans text-[13px] text-mute">Links eine Regel wählen.</p>
          ) : (
            <>
              {readOnly && (
                <p className="m-0 rounded-[var(--r-sm)] bg-amberS px-[10px] py-[6px] font-sans text-[12px] text-amber">
                  {grundstock
                    ? 'Grundstock-Regel: für alle Firmen gleich, hier nur lesbar.'
                    : 'Diese Regel nutzt Bausteine, die der Editor noch nicht bearbeiten kann.'}
                </p>
              )}
              <RuleEditor rule={rule} readOnly={readOnly} onChange={editRule} />
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
                {grundstock ? (
                  <button type="button" onClick={() => copyAsOwn(rule)} className={BUTTON}>
                    Als eigene kopieren
                  </button>
                ) : (
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
