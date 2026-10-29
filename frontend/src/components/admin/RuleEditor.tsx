// Baukasten für eine Regel (Entscheidung 0081): Bausteine wie Legosteine, darüber die Regel
// als Satz. Ändert nur über `onChange` — speichern tut der Reiter „Regeln".

import { SegmentedControl } from '@conocto/design';
import {
  blockKindOf,
  positionLinkOf,
  type Rule,
  type RuleBlock,
  type RuleBlockKind,
  type RuleCondition,
  type RuleHighlight,
  type RuleLinkSame,
  type RuleStatus,
} from '@core';
import { categoryOf } from '../../lib/spanCategories';
import { FIELD_LABELS, HIGHLIGHT_LABELS, ruleSentence } from '../../lib/rules/sentence';

const STATUS_OPTIONS = [
  { value: 'entwurf', label: 'Entwurf', title: 'Nur hier in der Vorschau' },
  { value: 'freigegeben', label: 'Aktiv', title: 'Wirkt im LV' },
  { value: 'aus', label: 'Aus' },
];

const BLOCK_LABELS: Readonly<Record<RuleBlockKind | 'nicht', string>> = {
  begriff: 'Begriff',
  menge: 'Menge',
  norm: 'Norm',
  liste: 'Liste',
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
  liste: 'var(--cyan)',
  einheit: 'var(--violetD)',
  feld: 'var(--dim)',
  eingebaut: 'var(--dim)',
  nicht: 'var(--mute)',
};

const blockOf = (kind: 'begriff' | 'menge' | 'norm'): RuleBlock =>
  kind === 'begriff' ? { begriff: '' } : kind === 'menge' ? { menge: {} } : { norm: {} };

const CHIP =
  'inline-flex h-[24px] min-w-[64px] shrink-0 items-center justify-center rounded-[var(--r-pill)] px-[8px] font-mono text-[11px] font-semibold text-white';
const INPUT =
  'h-[30px] min-w-0 rounded-[var(--r-sm)] border border-line bg-surface px-[8px] font-mono text-[12.5px] text-ink outline-none focus:border-accent disabled:opacity-60';
const ADD =
  'cursor-pointer rounded-[var(--r-pill)] border border-dashed border-line2 bg-transparent px-[10px] py-[3px] font-mono text-[11.5px] text-dim hover:border-ink hover:text-ink disabled:cursor-default disabled:opacity-40';
const LABEL = 'min-w-[72px] font-mono text-[11px] uppercase tracking-[0.06em] text-mute';

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
  return (
    <div className="flex flex-wrap items-center gap-[8px] rounded-[var(--r-sm)] bg-sunken px-[8px] py-[6px]">
      <span className={CHIP} style={{ background: BLOCK_COLORS[kind] }}>
        {BLOCK_LABELS[kind]}
      </span>
      {'begriff' in block ? (
        <input
          type="text"
          value={block.begriff}
          disabled={readOnly}
          aria-label={kind === 'nicht' ? 'Ausgeschlossener Begriff' : 'Begriff'}
          placeholder="z. B. Sichtbeton* oder C#/#"
          onChange={(event) => onChange({ begriff: event.target.value })}
          className={`${INPUT} flex-1`}
        />
      ) : 'menge' in block ? (
        <>
          <span className="font-sans text-[12.5px] text-mute">Zahl mit Einheit</span>
          <input
            type="text"
            value={block.menge.einheit ?? ''}
            disabled={readOnly}
            aria-label="Einheit"
            placeholder="jede Einheit"
            onChange={(event) =>
              onChange({
                menge: event.target.value.trim() === '' ? {} : { einheit: event.target.value },
              })
            }
            className={`${INPUT} w-[110px]`}
          />
        </>
      ) : 'norm' in block ? (
        <span className="flex-1 font-sans text-[12.5px] text-mute">
          Normbezeichnung, z. B. DIN EN 1536
        </span>
      ) : (
        // Neue Bausteine (Entscheidung 0085) zeigt der Editor vorerst nur an.
        <code className="flex-1 truncate font-mono text-[12px] text-dim">
          {JSON.stringify(block)}
        </code>
      )}
      {!readOnly && (
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
        <SegmentedControl
          label="Verknüpfung der Bausteine"
          options={[
            { value: 'alle', label: 'alle', disabled: readOnly },
            { value: 'eines', label: 'eines', disabled: readOnly },
          ]}
          value={all ? 'alle' : 'eines'}
          onChange={(value) => onChange(rebuild(condition, value === 'alle', blocks, nicht))}
        />
        <span className="font-sans text-[12px] text-mute">davon im Text steht</span>
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
      {!readOnly && (
        <div className="flex flex-wrap gap-[6px]">
          {(['begriff', 'menge', 'norm'] as const).map((kind) => (
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
      {withRange && (
        <div className="flex flex-wrap items-center gap-[8px]">
          <span className={LABEL}>Abstand</span>
          <SegmentedControl
            label="Abstand"
            options={[
              { value: 'satz', label: 'gleicher Satz', disabled: readOnly },
              { value: 'zeichen', label: 'Zeichen', disabled: readOnly },
              { value: 'feld', label: 'ganzer Text', disabled: readOnly },
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
        <label className="flex items-center gap-[6px] font-sans text-[12.5px] text-mute opacity-60">
          <input type="checkbox" disabled /> PDF (später)
        </label>
      </div>
    </div>
  );
}

const BOX = 'flex flex-col gap-[10px] rounded-[var(--r-md)] border border-line bg-paper p-[12px]';

export function RuleEditor({
  rule,
  readOnly,
  onChange,
}: {
  rule: Rule;
  readOnly: boolean;
  onChange: (rule: Rule) => void;
}) {
  const link = positionLinkOf(rule.wirkung);
  const highlight = 'hervorheben' in rule.wirkung ? rule.wirkung.hervorheben : null;
  const toggleSame = (same: RuleLinkSame, on: boolean): void => {
    if (link === null) return;
    const gleich = on ? [...link.gleich, same] : link.gleich.filter((entry) => entry !== same);
    onChange({ ...rule, wirkung: { verknuepfen: { ...link, gleich } } });
  };

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
        <SegmentedControl
          label="Status"
          options={STATUS_OPTIONS.map((option) => ({ ...option, disabled: readOnly }))}
          value={rule.status}
          onChange={(value) => onChange({ ...rule, status: value as RuleStatus })}
        />
      </div>
      <p className="m-0 rounded-[var(--r-sm)] bg-sunken px-[12px] py-[9px] font-sans text-[13px] leading-[1.5] text-ink">
        {ruleSentence(rule)}
      </p>
      <div className={BOX}>
        <ConditionEditor
          condition={rule.bedingung}
          readOnly={readOnly}
          withRange
          onChange={(bedingung) => onChange({ ...rule, bedingung })}
        />
      </div>
      <div className={BOX}>
        <div className="flex flex-wrap items-center gap-[8px]">
          <span className={LABEL}>Dann</span>
          <SegmentedControl
            label="Wirkung"
            options={[
              { value: 'hervorheben', label: 'hervorheben', disabled: readOnly },
              { value: 'verknuepfen', label: 'Positionen verbinden', disabled: readOnly },
            ]}
            value={link === null ? 'hervorheben' : 'verknuepfen'}
            onChange={(value) =>
              onChange({
                ...rule,
                wirkung:
                  value === 'hervorheben'
                    ? { hervorheben: 'wichtig' }
                    : {
                        verknuepfen: {
                          ziel: { alle: [{ begriff: '' }], bereich: 'feld', wo: ['kurztext'] },
                          gleich: ['abschnitt'],
                        },
                      },
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
                    disabled={readOnly || (link.gleich.length === 1 && link.gleich.includes(same))}
                    checked={link.gleich.includes(same)}
                    onChange={(event) => toggleSame(same, event.target.checked)}
                  />
                  {text}
                </label>
              ))}
            </div>
          </>
        )}
        <span className="font-sans text-[12px] text-mute opacity-70">Später: Merkmal setzen</span>
      </div>
    </div>
  );
}
