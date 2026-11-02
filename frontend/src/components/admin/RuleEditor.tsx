// Baukasten für eine Regel (Entscheidungen 0081, 0089): Bausteine wie Legosteine, darüber die
// Regel als Satz. Ändert nur über `onChange` — speichern tut der Reiter „Regeln". Jede Regel
// hat einen Schalter an/aus; Grundstock-Regeln lassen sich nur schalten, nicht ändern.

import { useState } from 'react';
import { SegmentedControl } from '@conocto/design';
import {
  blockKindOf,
  blocksOf,
  positionLinkOf,
  RULE_HINT_CATEGORIES,
  RULE_POSITION_KINDS,
  type Rule,
  type RuleBlock,
  type RuleBlockKind,
  type RuleCheckHint,
  type RuleCondition,
  type RuleFact,
  type RuleHighlight,
  type RuleLinkSame,
  type RuleParam,
  type RulePositionKind,
} from '@core';
import { RuleSwitch } from './RuleSwitch';
import { categoryOf } from '../../lib/spanCategories';
import { builtinInfoOf } from '../../lib/rules/builtinInfo';
import { builtinParameter, RULE_CONTEXT } from '../../lib/rules/rules';
import {
  FIELD_LABELS,
  HIGHLIGHT_LABELS,
  HINT_LABELS,
  ruleSentence,
} from '../../lib/rules/sentence';

const BLOCK_LABELS: Readonly<Record<RuleBlockKind | 'nicht', string>> = {
  begriff: 'Begriff',
  menge: 'Menge',
  norm: 'Norm',
  liste: 'Wortliste',
  einheit: 'Einheit',
  feld: 'Angabe',
  eingebaut: 'Eingebaut',
  nicht: 'nicht',
};
type BlockKind = keyof typeof BLOCK_LABELS;

// Farbe je Baustein aus den Fundstellen-Kategorien, damit Vorschau und Langtext gleich lesen.
const BLOCK_COLORS: Readonly<Record<BlockKind, string>> = {
  begriff: 'var(--cyan)',
  menge: 'var(--violetD)',
  norm: 'var(--accent-ink)',
  liste: 'var(--greenD)',
  einheit: 'var(--violetD)',
  feld: 'var(--dim)',
  eingebaut: 'var(--dim)',
  nicht: 'var(--mute)',
};

const FACT_LABELS: Readonly<Record<RuleFact, string>> = {
  menge: 'Menge',
  einheit: 'Einheit',
  art: 'Positionsart',
};

const KIND_LABELS: Readonly<Record<RulePositionKind, string>> = {
  normal: 'Normalposition',
  bedarf: 'Bedarfsposition',
  alternativ: 'Alternativposition',
  zulage: 'Zulage',
};

const LIST_NAMES: readonly string[] = [...(RULE_CONTEXT.listen?.keys() ?? [])];
const UNIT_GROUPS: readonly string[] = [...(RULE_CONTEXT.einheitGruppen?.keys() ?? [])];

/** Neue Bausteine aus den Knöpfen „+ …“. */
type AddKind = 'begriff' | 'menge' | 'norm' | 'liste' | 'einheit' | 'feld';
const ADD_KINDS: readonly AddKind[] = ['begriff', 'menge', 'norm', 'liste', 'einheit', 'feld'];

function blockOf(kind: AddKind): RuleBlock {
  switch (kind) {
    case 'begriff':
      return { begriff: '' };
    case 'menge':
      return { menge: {} };
    case 'norm':
      return { norm: {} };
    case 'liste':
      return { liste: LIST_NAMES[0] ?? 'risiko' };
    case 'einheit':
      return { einheit: { gruppe: UNIT_GROUPS[0] ?? 'Stunde' } };
    case 'feld':
      return { feld: 'menge', ist: 'leer' };
  }
}

/** Werte, die eine Angabe haben kann; `leer` = fehlt. */
function factValues(fact: RuleFact): ReadonlyArray<readonly [string, string]> {
  if (fact === 'art') return RULE_POSITION_KINDS.map((kind) => [kind, KIND_LABELS[kind]]);
  if (fact === 'menge') {
    return [
      ['leer', 'leer'],
      ['0', '0'],
    ];
  }
  return [['leer', 'leer']];
}

function factBlock(fact: RuleFact, value: string): RuleBlock {
  return value === 'leer' ? { feld: fact, ist: 'leer' } : { feld: fact, ist: [value] };
}

const CHIP =
  'inline-flex h-[24px] min-w-[72px] shrink-0 items-center justify-center rounded-[var(--r-pill)] px-[8px] font-mono text-[11px] font-semibold text-white';
const INPUT =
  'h-[30px] min-w-0 rounded-[var(--r-sm)] border border-line bg-surface px-[8px] font-mono text-[12.5px] text-ink outline-none focus:border-accent disabled:opacity-60';
const ADD =
  'cursor-pointer rounded-[var(--r-pill)] border border-dashed border-line2 bg-transparent px-[10px] py-[3px] font-mono text-[11.5px] text-dim hover:border-ink hover:text-ink disabled:cursor-default disabled:opacity-40';
const LABEL = 'min-w-[72px] font-mono text-[11px] uppercase tracking-[0.06em] text-mute';
const NOTE = 'font-sans text-[12px] text-mute';

function BlockRow({
  kind,
  block,
  readOnly,
  onChange,
  onRemove,
}: {
  kind: BlockKind;
  block: RuleBlock;
  readOnly: boolean;
  onChange: (block: RuleBlock) => void;
  onRemove: () => void;
}) {
  let body;
  if ('begriff' in block) {
    body = (
      <input
        type="text"
        value={block.begriff}
        disabled={readOnly}
        aria-label={kind === 'nicht' ? 'Ausgeschlossener Begriff' : 'Begriff'}
        placeholder="z. B. Sichtbeton* oder C#/#"
        onChange={(event) => onChange({ begriff: event.target.value })}
        className={`${INPUT} flex-1`}
      />
    );
  } else if ('menge' in block) {
    body = (
      <>
        <span className="font-sans text-[12.5px] text-mute">Zahl mit Einheit</span>
        <input
          type="text"
          value={block.menge.einheit ?? ''}
          disabled={readOnly}
          aria-label="Einheit der Menge"
          placeholder="jede Einheit"
          onChange={(event) =>
            onChange({
              menge: event.target.value.trim() === '' ? {} : { einheit: event.target.value },
            })
          }
          className={`${INPUT} w-[110px]`}
        />
      </>
    );
  } else if ('norm' in block) {
    body = (
      <span className="flex-1 font-sans text-[12.5px] text-mute">
        Normbezeichnung, z. B. DIN EN 1536
      </span>
    );
  } else if ('liste' in block) {
    const words = RULE_CONTEXT.listen?.get(block.liste) ?? [];
    body = (
      <>
        <select
          value={block.liste}
          disabled={readOnly}
          aria-label="Wortliste"
          onChange={(event) => onChange({ liste: event.target.value })}
          className={INPUT}
        >
          {/* Eine Liste aus einer importierten Regel, die es hier nicht gibt, bleibt wählbar. */}
          {[...new Set([block.liste, ...LIST_NAMES])].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className={NOTE}>{words.length} Wörter</span>
      </>
    );
  } else if ('einheit' in block) {
    const spellings = RULE_CONTEXT.einheitGruppen?.get(block.einheit.gruppe) ?? [];
    body = (
      <>
        <select
          value={block.einheit.gruppe}
          disabled={readOnly}
          aria-label="Einheiten-Gruppe"
          onChange={(event) => onChange({ einheit: { gruppe: event.target.value } })}
          className={INPUT}
        >
          {[...new Set([block.einheit.gruppe, ...UNIT_GROUPS])].map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        <span className={`${NOTE} truncate`}>{spellings.join(' · ')}</span>
      </>
    );
  } else if ('feld' in block) {
    const value = block.ist === 'leer' ? 'leer' : (block.ist[0] ?? 'leer');
    body = (
      <>
        <select
          value={block.feld}
          disabled={readOnly}
          aria-label="Angabe"
          onChange={(event) => {
            const fact = event.target.value as RuleFact;
            onChange(factBlock(fact, factValues(fact)[0][0]));
          }}
          className={INPUT}
        >
          {(Object.keys(FACT_LABELS) as RuleFact[]).map((fact) => (
            <option key={fact} value={fact}>
              {FACT_LABELS[fact]}
            </option>
          ))}
        </select>
        <span className={NOTE}>ist</span>
        <select
          value={value}
          disabled={readOnly}
          aria-label="Wert der Angabe"
          onChange={(event) => onChange(factBlock(block.feld, event.target.value))}
          className={INPUT}
        >
          {factValues(block.feld).map(([option, text]) => (
            <option key={option} value={option}>
              {text}
            </option>
          ))}
        </select>
      </>
    );
  } else {
    body = (
      <>
        <span className="font-sans text-[12.5px] text-ink">
          {builtinInfoOf(block.eingebaut).name}
        </span>
        <span className={NOTE}>feste Logik der App, nur die Werte sind änderbar</span>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-[8px] rounded-[var(--r-sm)] bg-sunken px-[8px] py-[6px]">
      <span className={CHIP} style={{ background: BLOCK_COLORS[kind] }}>
        {BLOCK_LABELS[kind]}
      </span>
      {body}
      {!readOnly && kind !== 'eingebaut' && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Baustein löschen"
          title="Baustein löschen"
          className="ml-auto cursor-pointer border-none bg-transparent px-[4px] text-mute hover:text-ink"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Bedingung neu zusammensetzen: genau eines von `alle`/`eines`, `nicht` nur wenn nötig. */
function rebuild(
  condition: RuleCondition,
  all: boolean,
  blocks: readonly RuleBlock[],
  nicht: readonly RuleBlock[],
): RuleCondition {
  return {
    ...(all ? { alle: blocks } : { eines: blocks }),
    ...(nicht.length > 0 ? { nicht } : {}),
    bereich: condition.bereich,
    wo: condition.wo,
  };
}

/** Bausteine + „alle/eines“ + Abstand + Text einer Bedingung. */
function ConditionEditor({
  condition,
  readOnly,
  withRange,
  onChange,
}: {
  condition: RuleCondition;
  readOnly: boolean;
  /** Abstand nur bei der Bedingung, die die Fundstellen liefert. */
  withRange: boolean;
  onChange: (condition: RuleCondition) => void;
}) {
  const all = condition.alle !== undefined;
  const blocks = condition.alle ?? condition.eines ?? [];
  const nicht = condition.nicht ?? [];
  // Ein eingebauter Baustein steht laut Format allein (`toCondition` im Kern).
  const builtin = blocks.some((block) => 'eingebaut' in block);
  const withBlocks = (next: readonly RuleBlock[]): RuleCondition =>
    rebuild(condition, all, next, nicht);
  const withNicht = (next: readonly RuleBlock[]): RuleCondition =>
    rebuild(condition, all, blocks, next);
  const range =
    condition.bereich === 'satz' || condition.bereich === 'feld' ? condition.bereich : 'zeichen';

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex flex-wrap items-center gap-[8px]">
        <span className={LABEL}>Wenn</span>
        {!builtin && (
          <>
            <SegmentedControl
              label="Verknüpfung der Bausteine"
              options={[
                { value: 'alle', label: 'alle', disabled: frozen(readOnly, all, true) },
                { value: 'eines', label: 'eines', disabled: frozen(readOnly, all, false) },
              ]}
              value={all ? 'alle' : 'eines'}
              onChange={(value) => onChange(rebuild(condition, value === 'alle', blocks, nicht))}
            />
            <span className="font-sans text-[12px] text-mute">davon zutrifft</span>
          </>
        )}
      </div>
      {blocks.map((block, i) => (
        <BlockRow
          key={`b-${i}`}
          kind={blockKindOf(block)}
          block={block}
          readOnly={readOnly}
          onChange={(next) => onChange(withBlocks(blocks.map((b, j) => (j === i ? next : b))))}
          onRemove={() => onChange(withBlocks(blocks.filter((_, j) => j !== i)))}
        />
      ))}
      {nicht.map((block, i) => (
        <BlockRow
          key={`n-${i}`}
          kind="nicht"
          block={block}
          readOnly={readOnly}
          onChange={(next) => onChange(withNicht(nicht.map((b, j) => (j === i ? next : b))))}
          onRemove={() => onChange(withNicht(nicht.filter((_, j) => j !== i)))}
        />
      ))}
      {!readOnly && !builtin && (
        <div className="flex flex-wrap gap-[6px]">
          {ADD_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onChange(withBlocks([...blocks, blockOf(kind)]))}
              className={ADD}
            >
              + {BLOCK_LABELS[kind]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(withNicht([...nicht, { begriff: '' }]))}
            className={ADD}
          >
            + nicht (Ausschluss)
          </button>
        </div>
      )}
      {!readOnly && !builtin && (
        <span className={NOTE}>
          # = eine Zahl · * = beliebige Buchstaben · Groß/klein egal · Angabe = Wert aus der
          GAEB-Datei (Menge, Einheit, Positionsart)
        </span>
      )}
      {withRange && (
        <div className="flex flex-wrap items-center gap-[8px]">
          <span className={LABEL}>Abstand</span>
          <SegmentedControl
            label="Abstand"
            options={[
              { value: 'satz', label: 'gleicher Satz', disabled: frozen(readOnly, range, 'satz') },
              { value: 'zeichen', label: 'Zeichen', disabled: frozen(readOnly, range, 'zeichen') },
              { value: 'feld', label: 'ganzer Text', disabled: frozen(readOnly, range, 'feld') },
            ]}
            value={range}
            onChange={(value) =>
              onChange({
                ...condition,
                bereich: value === 'zeichen' ? { zeichen: 80 } : value === 'satz' ? 'satz' : 'feld',
              })
            }
          />
          {typeof condition.bereich === 'object' && (
            <input
              type="number"
              min={1}
              max={2000}
              value={condition.bereich.zeichen}
              disabled={readOnly}
              aria-label="Höchstens so viele Zeichen auseinander"
              onChange={(event) => {
                const zeichen = Math.round(Number(event.target.value));
                if (Number.isFinite(zeichen) && zeichen >= 1 && zeichen <= 2000) {
                  onChange({ ...condition, bereich: { zeichen } });
                }
              }}
              className={`${INPUT} w-[80px]`}
            />
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-[12px]">
        <span className={LABEL}>Text</span>
        {(['kurztext', 'langtext'] as const).map((field) => (
          <label
            key={field}
            className="flex items-center gap-[6px] font-sans text-[12.5px] text-dim"
          >
            <input
              type="checkbox"
              disabled={readOnly}
              checked={condition.wo.includes(field)}
              onChange={(event) => {
                const wo = event.target.checked
                  ? [...condition.wo, field]
                  : condition.wo.filter((entry) => entry !== field);
                // Ohne Text sucht die Regel nirgends — mindestens einer bleibt an.
                if (wo.length > 0) onChange({ ...condition, wo });
              }}
            />
            {FIELD_LABELS[field]}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Werte eines eingebauten Bausteins; der Grundstock-Wert steht daneben. */
function BuiltinParams({
  block,
  readOnly,
  onChange,
}: {
  block: Extract<RuleBlock, { eingebaut: string }>;
  readOnly: boolean;
  onChange: (block: RuleBlock) => void;
}) {
  const params = Object.entries(builtinInfoOf(block.eingebaut).params);
  if (params.length === 0) return null;
  const atLoad = params.some(([, info]) => info.atLoad === true);
  return (
    <div className="flex flex-col gap-[8px]">
      <span className="font-display text-[13px] font-semibold text-ink">
        Werte der eingebauten Prüfung
      </span>
      {params.map(([key, info]) => {
        const value = block.parameter?.[key];
        const base = builtinParameter(block.eingebaut, key);
        return (
          <label key={key} className="flex flex-wrap items-center gap-[10px]">
            <span className="min-w-[260px] font-sans text-[12.5px] text-dim">{info.label}</span>
            <input
              type="number"
              min={info.min}
              max={info.max}
              value={typeof value === 'number' ? value : ''}
              disabled={readOnly || info.atLoad === true}
              onChange={(event) => {
                const next = Math.round(Number(event.target.value));
                if (!Number.isFinite(next) || next < info.min || next > info.max) return;
                const parameter: Record<string, RuleParam> = { ...block.parameter, [key]: next };
                onChange({ eingebaut: block.eingebaut, parameter });
              }}
              className={`${INPUT} w-[90px]`}
            />
            {base !== undefined && <span className={NOTE}>Grundstock: {String(base)}</span>}
          </label>
        );
      })}
      {atLoad && (
        <span className={NOTE}>
          Dieser Wert wirkt schon beim Einlesen der Datei und lässt sich hier noch nicht ändern.
        </span>
      )}
      {readOnly && !atLoad && (
        <span className={NOTE}>
          Ändern geht in einer eigenen Kopie. Die Kopie ersetzt dann die Grundstock-Regel.
        </span>
      )}
    </div>
  );
}

/** Text des Prüfhinweises: leer lässt das Format nicht zu, darum erst beim Verlassen prüfen. */
function HintText({
  text,
  readOnly,
  onChange,
}: {
  text: string;
  readOnly: boolean;
  onChange: (text: string) => void;
}) {
  const [draft, setDraft] = useState(text);
  const [seen, setSeen] = useState(text);
  if (text !== seen) {
    setSeen(text);
    setDraft(text);
  }
  return (
    <textarea
      value={draft}
      disabled={readOnly}
      aria-label="Text des Prüfhinweises"
      placeholder="Was soll in „Prüfung“ stehen?"
      rows={2}
      onChange={(event) => {
        setDraft(event.target.value);
        if (event.target.value.trim() !== '') onChange(event.target.value);
      }}
      onBlur={() => {
        if (draft.trim() === '') setDraft(text);
      }}
      className="min-h-[54px] min-w-0 flex-1 resize-y rounded-[var(--r-sm)] border border-line bg-surface px-[8px] py-[6px] font-sans text-[13px] leading-[1.45] text-ink outline-none focus:border-accent disabled:opacity-60"
    />
  );
}

function HintEditor({
  hint,
  readOnly,
  onChange,
}: {
  hint: RuleCheckHint;
  readOnly: boolean;
  onChange: (hint: RuleCheckHint) => void;
}) {
  const verweis = hint.norm?.verweis ?? '';
  const withNorm = (text: string, confirmed: boolean): RuleCheckHint => {
    const rest: RuleCheckHint = {
      kategorie: hint.kategorie,
      schwere: hint.schwere,
      text: hint.text,
    };
    return text.trim() === ''
      ? rest
      : { ...rest, norm: { verweis: text, stand: confirmed ? 'bestaetigt' : 'zu_bestaetigen' } };
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-[8px]">
        <span className={LABEL}>Art</span>
        <SegmentedControl
          label="Art des Hinweises"
          options={RULE_HINT_CATEGORIES.map((category) => ({
            value: category,
            label: HINT_LABELS[category],
            disabled: frozen(readOnly, hint.kategorie, category),
          }))}
          value={hint.kategorie}
          onChange={(value) =>
            onChange({ ...hint, kategorie: value as RuleCheckHint['kategorie'] })
          }
        />
        <SegmentedControl
          label="Gewicht des Hinweises"
          options={[
            {
              value: 'hinweis',
              label: 'Hinweis',
              disabled: frozen(readOnly, hint.schwere, 'hinweis'),
            },
            {
              value: 'beachten',
              label: 'Beachten',
              disabled: frozen(readOnly, hint.schwere, 'beachten'),
            },
          ]}
          value={hint.schwere}
          onChange={(value) => onChange({ ...hint, schwere: value as RuleCheckHint['schwere'] })}
        />
      </div>
      <div className="flex flex-wrap items-start gap-[8px]">
        <span className={`${LABEL} pt-[8px]`}>Text</span>
        <HintText
          text={hint.text}
          readOnly={readOnly}
          onChange={(text) => onChange({ ...hint, text })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-[8px]">
        <span className={LABEL}>Norm</span>
        <input
          type="text"
          value={verweis}
          disabled={readOnly}
          aria-label="Norm-Verweis"
          placeholder="freiwillig, z. B. VOB/A § 7 Abs. 1 Nr. 3"
          onChange={(event) =>
            onChange(withNorm(event.target.value, hint.norm?.stand === 'bestaetigt'))
          }
          className={`${INPUT} min-w-[200px] flex-1`}
        />
        {verweis.trim() !== '' && (
          <label className="flex items-center gap-[6px] font-sans text-[12.5px] text-dim">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={hint.norm?.stand === 'bestaetigt'}
              onChange={(event) => onChange(withNorm(verweis, event.target.checked))}
            />
            Verweis geprüft
          </label>
        )}
      </div>
      {!readOnly && (
        <span className={NOTE}>
          Nur eine Norm eintragen, die du geprüft hast. Ohne Häkchen steht in „Prüfung“ „Verweis zu
          bestätigen“.
        </span>
      )}
    </>
  );
}

/**
 * Nur lesen: die gewählte Option bleibt bedienbar (ändert ja nichts), damit der Schalter sie
 * weiter als gewählt zeigt; alle anderen sind gesperrt.
 */
function frozen<T>(readOnly: boolean, current: T, option: T): boolean {
  return readOnly && current !== option;
}

const BOX = 'flex flex-col gap-[10px] rounded-[var(--r-md)] border border-line bg-paper p-[12px]';

const NEW_LINK = {
  verknuepfen: {
    ziel: { alle: [{ begriff: '' }], bereich: 'feld', wo: ['kurztext'] },
    gleich: ['abschnitt'],
  },
} as const satisfies Rule['wirkung'];

type EffectKind = 'hervorheben' | 'pruefhinweis' | 'verknuepfen';

export function RuleEditor({
  rule,
  readOnly,
  label,
  locked,
  onToggle,
  onChange,
}: {
  rule: Rule;
  readOnly: boolean;
  /** „eigene“ oder „gelernt“ neben dem Namen; Grundstock ohne. */
  label: string | null;
  /** Schalter gesperrt: Grundstock-Regel, die schon im Grundstock aus ist. */
  locked: boolean;
  onToggle: () => void;
  onChange: (rule: Rule) => void;
}) {
  const link = positionLinkOf(rule.wirkung);
  const highlight = 'hervorheben' in rule.wirkung ? rule.wirkung.hervorheben : null;
  const hint = 'pruefhinweis' in rule.wirkung ? rule.wirkung.pruefhinweis : null;
  const pdf = rule.bedingung.wo.includes('pdf');
  const builtin = blocksOf(rule.bedingung).find(
    (block): block is Extract<RuleBlock, { eingebaut: string }> => 'eingebaut' in block,
  );
  const on = rule.status === 'freigegeben';
  const effect: EffectKind =
    highlight !== null ? 'hervorheben' : hint !== null ? 'pruefhinweis' : 'verknuepfen';
  const toggleSame = (same: RuleLinkSame, checked: boolean): void => {
    if (link === null) return;
    const gleich = checked ? [...link.gleich, same] : link.gleich.filter((entry) => entry !== same);
    onChange({ ...rule, wirkung: { verknuepfen: { ...link, gleich } } });
  };
  const setBuiltin = (next: RuleBlock): void =>
    onChange({
      ...rule,
      bedingung: rebuild(rule.bedingung, rule.bedingung.alle !== undefined, [next], []),
    });

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <input
          type="text"
          value={rule.name}
          disabled={readOnly}
          aria-label="Name der Regel"
          onChange={(event) => onChange({ ...rule, name: event.target.value })}
          className="h-[34px] min-w-[180px] flex-1 rounded-[var(--r-sm)] border border-transparent bg-transparent px-[4px] font-display text-[16px] font-semibold text-ink outline-none hover:border-line focus:border-accent disabled:opacity-100"
        />
        {label !== null && (
          <span className="rounded-[var(--r-pill)] bg-cyanS px-[8px] py-[1px] font-mono text-[10.5px] text-cyan">
            {label}
          </span>
        )}
        <span className="font-mono text-[11.5px] text-mute">{on ? 'an' : 'aus'}</span>
        <RuleSwitch on={on} label={rule.name} locked={locked} onToggle={onToggle} />
      </div>
      {!on && !readOnly && (
        <span className={NOTE}>
          Aus: Die Treffer unten siehst du trotzdem. Im LV wirkt die Regel erst, wenn du sie
          anschaltest.
        </span>
      )}
      <p className="m-0 rounded-[var(--r-sm)] bg-sunken px-[12px] py-[9px] font-sans text-[13px] leading-[1.5] text-ink">
        {ruleSentence(rule)}
      </p>
      {pdf ? (
        <div className={BOX}>
          <span className={NOTE}>
            Sucht nur im Begleit-PDF (Bereich „Dokument“) und schlägt Stellen zum Verknüpfen vor.
            Aus heißt: Diese Vorschläge gibt es für deine Firma nicht. Der Schalter im Dokument gilt
            dagegen nur für das geöffnete Projekt.
          </span>
          {builtin !== undefined && (
            <BuiltinParams block={builtin} readOnly={readOnly} onChange={setBuiltin} />
          )}
        </div>
      ) : (
        <>
          <div className={BOX}>
            <ConditionEditor
              condition={rule.bedingung}
              readOnly={readOnly}
              withRange
              onChange={(bedingung) => onChange({ ...rule, bedingung })}
            />
          </div>
          {builtin !== undefined &&
            Object.keys(builtinInfoOf(builtin.eingebaut).params).length > 0 && (
              <div className={BOX}>
                <BuiltinParams block={builtin} readOnly={readOnly} onChange={setBuiltin} />
              </div>
            )}
          <div className={BOX}>
            <div className="flex flex-wrap items-center gap-[8px]">
              <span className={LABEL}>Dann</span>
              <SegmentedControl
                label="Wirkung"
                options={[
                  {
                    value: 'hervorheben',
                    label: 'hervorheben',
                    disabled: frozen(readOnly, effect, 'hervorheben'),
                  },
                  {
                    value: 'pruefhinweis',
                    label: 'Prüfhinweis',
                    disabled: frozen(readOnly, effect, 'pruefhinweis'),
                  },
                  {
                    value: 'verknuepfen',
                    label: 'Positionen verbinden',
                    // Eingebaute Prüfungen liefern nur Hinweise, keine Fundstellen zum Verbinden.
                    disabled: frozen(readOnly, effect, 'verknuepfen') || builtin !== undefined,
                  },
                ]}
                value={effect}
                onChange={(value) =>
                  onChange({
                    ...rule,
                    wirkung:
                      value === 'hervorheben'
                        ? { hervorheben: 'wichtig' }
                        : value === 'pruefhinweis'
                          ? {
                              pruefhinweis: {
                                kategorie: 'risiko',
                                schwere: 'hinweis',
                                text: rule.name,
                              },
                            }
                          : NEW_LINK,
                  })
                }
              />
            </div>
            {highlight !== null && (
              <div className="flex flex-wrap items-center gap-[8px]">
                <span className={LABEL}>Als</span>
                {(Object.keys(HIGHLIGHT_LABELS) as RuleHighlight[]).map((category) => (
                  <button
                    key={category}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={highlight === category}
                    onClick={() => onChange({ ...rule, wirkung: { hervorheben: category } })}
                    className="inline-flex h-[26px] cursor-pointer items-center rounded-[var(--r-pill)] border px-[10px] font-mono text-[11.5px] disabled:cursor-default"
                    style={{
                      borderColor: highlight === category ? 'transparent' : 'var(--line)',
                      background:
                        highlight === category ? categoryOf(category).background : 'transparent',
                      color: highlight === category ? categoryOf(category).color : 'var(--dim)',
                    }}
                  >
                    {HIGHLIGHT_LABELS[category]}
                  </button>
                ))}
              </div>
            )}
            {hint !== null && (
              <HintEditor
                hint={hint}
                readOnly={readOnly}
                onChange={(pruefhinweis) => onChange({ ...rule, wirkung: { pruefhinweis } })}
              />
            )}
            {link !== null && (
              <>
                <span className="font-sans text-[12.5px] text-dim">
                  mit Positionen, in denen Folgendes steht:
                </span>
                <ConditionEditor
                  condition={link.ziel}
                  readOnly={readOnly}
                  withRange={false}
                  onChange={(ziel) =>
                    onChange({ ...rule, wirkung: { verknuepfen: { ...link, ziel } } })
                  }
                />
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className={LABEL}>Nur mit</span>
                  {(
                    [
                      ['abschnitt', 'gleichem Abschnitt'],
                      ['einheit', 'gleicher Einheit'],
                    ] as const
                  ).map(([same, text]) => (
                    <label
                      key={same}
                      className="flex items-center gap-[6px] font-sans text-[12.5px] text-dim"
                    >
                      <input
                        type="checkbox"
                        // Das letzte Häkchen bleibt: ohne Vorgruppierung wären es alle Paare.
                        disabled={
                          readOnly || (link.gleich.length === 1 && link.gleich.includes(same))
                        }
                        checked={link.gleich.includes(same)}
                        onChange={(event) => toggleSame(same, event.target.checked)}
                      />
                      {text}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
