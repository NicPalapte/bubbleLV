// Regelformat `bubble-rule-v1` (Entscheidung 0081): eine Regel ist ein kleiner JSON-Eintrag,
// den Doc im Browser und bauonto per Befehl gleich auswerten. Eine Regel enthält nur
// Begriffe, Muster und Einstellungen — nie Text aus einem LV oder einer Baubeschreibung.
//
// Bedingung = Bausteine (Begriff, Menge, Norm) + „alle“/„eines“ + Ausschluss „nicht“,
// dazu wie nah die Teile stehen müssen (Satz, Zeichenabstand, ganzer Text) und in
// welchem Text gesucht wird. Wirkung = hervorheben oder Positionen verknüpfen.

export const RULE_SCHEMA = 'bubble-rule-v1';

/** Ein Baustein der Bedingung. Schreibweise des Begriffs wie in den Materialtabellen. */
export type RuleBlock =
  | { readonly begriff: string }
  /** Zahl mit Mengeneinheit; mit `einheit` nur diese Einheit. */
  | { readonly menge: { readonly einheit?: string } }
  /** Normbezeichnung; die Fundstellen liefert der Aufrufer (`RuleText.normen`). */
  | { readonly norm: Record<string, never> };

export type RuleField = 'kurztext' | 'langtext';

export const RULE_FIELDS: readonly RuleField[] = ['kurztext', 'langtext'];

/** Wie nah die Teile beieinander stehen müssen. */
export type RuleRange = 'satz' | 'feld' | { readonly zeichen: number };

export interface RuleCondition {
  /** Genau eines von `alle` und `eines` ist gesetzt. */
  readonly alle?: readonly RuleBlock[];
  readonly eines?: readonly RuleBlock[];
  /** Steht einer dieser Bausteine im selben Bereich, zählt der Treffer nicht. */
  readonly nicht?: readonly RuleBlock[];
  readonly bereich: RuleRange;
  readonly wo: readonly RuleField[];
}

export type RuleHighlight = 'wichtig' | 'material' | 'masse';

export const RULE_HIGHLIGHTS: readonly RuleHighlight[] = ['wichtig', 'material', 'masse'];

/** Was zwei verknüpfte Positionen gemeinsam haben müssen. Vorgruppierung, kein All-Paare. */
export type RuleLinkSame = 'abschnitt' | 'einheit';

export type RuleEffect =
  | { readonly hervorheben: RuleHighlight }
  /** Positionen, die `bedingung` treffen, mit Positionen verknüpfen, die `ziel` treffen. */
  | {
      readonly verknuepfen: {
        readonly ziel: RuleCondition;
        readonly gleich: readonly RuleLinkSame[];
      };
    };

/** `allgemein` = Grundstock für alle Firmen, `unternehmen` = eigene Regel. */
export type RuleScope = 'allgemein' | 'unternehmen';

export type RuleStatus = 'entwurf' | 'freigegeben' | 'aus';

export type RuleOrigin = 'nutzer' | 'mining' | 'ki';

export interface Rule {
  readonly schema: typeof RULE_SCHEMA;
  /** Kleinbuchstaben, Ziffern und `-`; mit `version` die Kennung `id@version`. */
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly bedingung: RuleCondition;
  readonly wirkung: RuleEffect;
  readonly geltung: RuleScope;
  readonly status: RuleStatus;
  readonly herkunft: RuleOrigin;
  readonly bemerkung?: string;
}

/** Datei `regeln.json`: Grundstock im Repo und Austausch zwischen Browsern. */
export interface RuleFile {
  readonly schema: typeof RULE_SCHEMA;
  readonly regeln: readonly Rule[];
}

/** Kennung für `producer` an Verknüpfungen, z. B. „bauteil-menge@1“. */
export function ruleKey(rule: Pick<Rule, 'id' | 'version'>): string {
  return `${rule.id}@${rule.version}`;
}

export function blocksOf(condition: RuleCondition): readonly RuleBlock[] {
  return condition.alle ?? condition.eines ?? [];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const RULE_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_BLOCKS = 12;
const MAX_TEXT = 200;
const MAX_REACH = 2000;

function toBlock(value: unknown): RuleBlock | null {
  if (!isObject(value)) return null;
  if (typeof value.begriff === 'string') {
    const begriff = value.begriff.trim();
    return begriff.length <= MAX_TEXT ? { begriff } : null;
  }
  if (isObject(value.menge)) {
    const { einheit } = value.menge;
    if (typeof einheit === 'string' && einheit.trim() !== '') {
      return { menge: { einheit: einheit.trim().slice(0, 20) } };
    }
    return { menge: {} };
  }
  if (isObject(value.norm)) return { norm: {} };
  return null;
}

function toBlocks(value: unknown): RuleBlock[] | null {
  if (!Array.isArray(value) || value.length > MAX_BLOCKS) return null;
  const blocks = value.map(toBlock);
  return blocks.every((block): block is RuleBlock => block !== null) ? blocks : null;
}

function toRange(value: unknown): RuleRange | null {
  if (value === 'satz' || value === 'feld') return value;
  if (isObject(value) && typeof value.zeichen === 'number' && Number.isInteger(value.zeichen)) {
    return value.zeichen >= 1 && value.zeichen <= MAX_REACH ? { zeichen: value.zeichen } : null;
  }
  return null;
}

/** Eine Bedingung aus JSON; Unbrauchbares wird `null`. */
export function toCondition(value: unknown): RuleCondition | null {
  if (!isObject(value)) return null;
  const alle = value.alle === undefined ? undefined : toBlocks(value.alle);
  const eines = value.eines === undefined ? undefined : toBlocks(value.eines);
  if (alle === null || eines === null) return null;
  if ((alle === undefined) === (eines === undefined)) return null;
  const nicht = value.nicht === undefined ? [] : toBlocks(value.nicht);
  const bereich = toRange(value.bereich);
  const wo = Array.isArray(value.wo)
    ? RULE_FIELDS.filter((field) => (value.wo as unknown[]).includes(field))
    : [];
  if (nicht === null || bereich === null || wo.length === 0) return null;
  return {
    ...(alle === undefined ? { eines } : { alle }),
    ...(nicht.length > 0 ? { nicht } : {}),
    bereich,
    wo,
  };
}

function toEffect(value: unknown): RuleEffect | null {
  if (!isObject(value)) return null;
  const { hervorheben, verknuepfen } = value;
  if (typeof hervorheben === 'string') {
    const category = RULE_HIGHLIGHTS.find((entry) => entry === hervorheben);
    return category === undefined ? null : { hervorheben: category };
  }
  if (isObject(verknuepfen)) {
    const ziel = toCondition(verknuepfen.ziel);
    if (ziel === null) return null;
    const gleich = Array.isArray(verknuepfen.gleich)
      ? (['abschnitt', 'einheit'] as const).filter((same) =>
          (verknuepfen.gleich as unknown[]).includes(same),
        )
      : [];
    return { verknuepfen: { ziel, gleich } };
  }
  return null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.find((entry) => entry === value) ?? null;
}

/** Eine Regel aus JSON (Datei, Speicher); Unbrauchbares wird `null`. */
export function toRule(value: unknown): Rule | null {
  if (!isObject(value) || value.schema !== RULE_SCHEMA) return null;
  const { id, version, name, bemerkung } = value;
  if (typeof id !== 'string' || !RULE_ID.test(id)) return null;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  const bedingung = toCondition(value.bedingung);
  const wirkung = toEffect(value.wirkung);
  const geltung = oneOf(value.geltung, ['allgemein', 'unternehmen'] as const);
  const status = oneOf(value.status, ['entwurf', 'freigegeben', 'aus'] as const);
  const herkunft = oneOf(value.herkunft, ['nutzer', 'mining', 'ki'] as const) ?? 'nutzer';
  if (bedingung === null || wirkung === null || geltung === null || status === null) return null;
  return {
    schema: RULE_SCHEMA,
    id,
    version,
    name: name.trim().slice(0, MAX_TEXT),
    bedingung,
    wirkung,
    geltung,
    status,
    herkunft,
    ...(typeof bemerkung === 'string' && bemerkung.trim() !== ''
      ? { bemerkung: bemerkung.trim().slice(0, 1000) }
      : {}),
  };
}

/** Regeln aus einer `regeln.json`; unbrauchbare Einträge fallen weg, gleiche `id` nur einmal. */
export function parseRuleFile(value: unknown): Rule[] {
  if (!isObject(value) || value.schema !== RULE_SCHEMA || !Array.isArray(value.regeln)) return [];
  const out: Rule[] = [];
  for (const entry of value.regeln) {
    const rule = toRule(entry);
    if (rule !== null && !out.some((other) => other.id === rule.id)) out.push(rule);
  }
  return out;
}

export function toRuleFile(rules: readonly Rule[]): RuleFile {
  return { schema: RULE_SCHEMA, regeln: rules };
}

/** Kennung aus einem Namen: „Nachtrag ausgeschlossen“ → „nachtrag-ausgeschlossen“. */
export function ruleIdOf(name: string, taken: ReadonlySet<string> = new Set()): string {
  const base =
    name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'regel';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
