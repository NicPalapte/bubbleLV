// Vorschläge zum Verknüpfen im Begleitdokument (Entscheidung 0080): OZ und Mengen aus
// dem geladenen LV im Seitentext wiederfinden. Ein- und ausgeschaltet und eingestellt
// über die Grundstock-Regeln „OZ im Dokument“ und „Menge im Dokument“ (0087,
// `suggestRules.ts`). Nur exakter Abgleich mit dem LV, keine
// Deutung des Textes — was nicht eindeutig zu genau einer Position passt, wird kein
// Vorschlag. Übernommen wird erst per Klick (KI/Automatik schlägt vor, Mensch entscheidet).
//
// Reine Funktionen; das Verzeichnis lässt sich in den Worker klonen (nur Map/Set/Strings).
// Lage und Text der Vorschläge beziehen sich auf den Seitentext wie bei der Suche
// (`docSearch.ts`), damit die Textebene sie mit `locateOnPage` wiederfindet.

import { sentenceAround } from '@core';
import { canonicalUnit } from '../units';
import { formatNumber } from '../format';

/** Woher eine Verknüpfung kam, wenn nicht von Hand. */
export type LinkSource = 'oz' | 'menge';

export const LINK_SOURCES: readonly LinkSource[] = ['oz', 'menge'];

export function isLinkSource(value: unknown): value is LinkSource {
  return value === 'oz' || value === 'menge';
}

/** Was das Verzeichnis von einer Position braucht. `id` ist die Knoten-ID der Sitzung. */
export interface SuggestPosition {
  readonly id: string;
  readonly oz: string;
  readonly quantity: number | null;
  readonly unit: string | null;
  /** Für den Wortabgleich bei Mengen, die mehrere Positionen treffen. */
  readonly shortText: string;
}

/** `null` als Wert: mehrere Positionen passen, also kein Vorschlag. */
type Unique = ReadonlyMap<string, string | null>;

export interface SuggestIndex {
  /** Volle OZ, Glieder ohne führende Nullen mit `.` verbunden („1.2.30“). */
  readonly full: Unique;
  /** Hintere Glieder einer OZ für Kurzformen nach Kontextwort: `${anzahl}:${schlüssel}`. */
  readonly tail: Unique;
  /** Menge und Einheit: `${wert}|${einheit}`. */
  readonly amount: Unique;
  /** Alle Positionen je Menge und Einheit, für den Wortabgleich. */
  readonly amountIds: ReadonlyMap<string, readonly string[]>;
  /** Wortstämme des Kurztexts je Position. */
  readonly words: ReadonlyMap<string, readonly string[]>;
  /** Menge einer Position für die Anzeige neben einer OZ. */
  readonly amountOf: ReadonlyMap<string, { readonly text: string; readonly key: string }>;
  /** Einheiten, die im LV vorkommen (Vergleichsschlüssel). */
  readonly units: ReadonlySet<string>;
  /** Welche Arten von Vorschlag aktiv sind und mit welchen Werten. */
  readonly rules: SuggestRules;
}

/** Einstellungen aus den Regeln „OZ im Dokument“ und „Menge im Dokument“; `null`: aus. */
export interface SuggestRules {
  readonly oz: { readonly nearOz: number } | null;
  readonly menge: { readonly minInteger: number } | null;
}

export interface DocSuggestion {
  readonly page: number;
  readonly start: number;
  readonly text: string;
  /** Vorgeschlagene Position (Knoten-ID). */
  readonly id: string;
  readonly source: LinkSource;
  /** Nur bei OZ: Menge kurz dahinter im PDF und Menge der Position im LV. */
  readonly amount?: {
    readonly pdf: string;
    readonly lv: string | null;
    readonly same: boolean;
  };
  /** Nur bei Menge: Wörter im Satz, die auch im Kurztext der Position stehen. */
  readonly words?: readonly string[];
}

export { SENTENCE_REACH } from '@core';

// Ersatzwerte, falls die Regel keinen Parameter setzt; gelten tut, was in regeln.json steht.
/** Kleinere ganze Zahlen sind als Menge zu allgemein („2 St“, „1 m“). */
export const AMOUNT_MIN_INTEGER = 10;
/** So viele Zeichen hinter einer OZ zählt eine Menge noch zu ihr. */
export const AMOUNT_NEAR_OZ = 80;
/** Beide Arten an, mit den Ersatzwerten — für Tests und ohne Regeln. */
export const DEFAULT_SUGGEST_RULES: SuggestRules = {
  oz: { nearOz: AMOUNT_NEAR_OZ },
  menge: { minInteger: AMOUNT_MIN_INTEGER },
};
/** Längstes Glied einer OZ; längere Ziffernfolgen sind Telefon-, Auftrags- oder Seriennummern. */
const MAX_PART = 6;

/** Schreibweisen aus Fließtext, die GAEB-LVs so nicht schreiben. */
const PDF_UNIT_SPELLINGS: Readonly<Record<string, string>> = { cbm: 'm3', qm: 'm2' };

/** Kürzeste Länge eines Worts für den Abgleich mit dem Kurztext. */
const MIN_WORD = 4;
/** Ab dieser Länge zählt ein Wort auch als Anfang eines zusammengesetzten Worts. */
const MIN_COMPOUND = 5;

/** Wörter, die in fast jedem Kurztext stehen und nichts über die Leistung sagen. */
const GENERIC_WORDS = new Set(
  `
  liefern einbauen herstellen montieren anbringen ausführen ausfuehren ausführung
  leistung position menge stück stueck bauseits gemäß gemaess sowie oder eines einer
  einem einen dieser diese dieses sind wird werden nach über ueber unter aller alle allem
  inkl einschl einschließlich zulage zuschlag für fuer auch ohne beim bzw ggf mind gesamt
  insgesamt ca etwa zwischen
`
    .trim()
    .split(/\s+/),
);

/** Pauschal ist keine vergleichbare Menge. */
const NO_AMOUNT_UNITS = new Set(['pauschal', 'psch', 'pau', 'pa']);

/** Vergleichsschlüssel einer Einheit aus LV oder PDF. */
export function unitKeyOf(raw: string | null): string | null {
  if (raw === null) return null;
  const plain = raw.trim().replace(/\.+$/, '').toLowerCase();
  const key = canonicalUnit(PDF_UNIT_SPELLINGS[plain] ?? raw);
  return key === null ? null : key.toLowerCase();
}

/** Grober Wortstamm: häufige Endungen ab, damit „Bodens“ und „Boden“ gleich sind. */
function stemOf(word: string): string {
  const stem = word.replace(/(?:en|er|es|em|e|n|s)$/, '');
  return stem.length >= MIN_WORD ? stem : word;
}

interface Word {
  readonly stem: string;
  readonly word: string;
  readonly start: number;
  readonly end: number;
}

/** Wörter eines Texts mit Lage, ohne allgemeine Wörter; Stamm klein geschrieben. */
function wordsIn(text: string, offset = 0): Word[] {
  const out: Word[] = [];
  for (const match of text.matchAll(/\p{L}+/gu)) {
    const word = match[0];
    const lower = word.toLowerCase();
    if (lower.length < MIN_WORD || GENERIC_WORDS.has(lower)) continue;
    const start = offset + match.index;
    out.push({ stem: stemOf(lower), word, start, end: start + word.length });
  }
  return out;
}

/** Gleicher Stamm oder ein langer Stamm als Anfang des anderen („Ortbeton“, „Ortbetonwand“). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= MIN_COMPOUND && long.startsWith(short);
}

function amountKey(value: number, unit: string): string {
  return `${Math.round(value * 1000) / 1000}|${unit}`;
}

/** Glieder einer OZ ohne führende Nullen; `null`, wenn ein Glied keine Zahl ist. */
function ozParts(oz: string): string[] | null {
  const parts = oz.split(/[\s.\-/]+/).filter((part) => part !== '');
  if (parts.length === 0) return null;
  const out: string[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part) || part.length > MAX_PART) return null;
    out.push(String(Number(part)));
  }
  return out;
}

function addUnique(map: Map<string, string | null>, key: string, id: string): void {
  const known = map.get(key);
  if (known === undefined) map.set(key, id);
  else if (known !== id) map.set(key, null);
}

/** Verzeichnis aus den Positionen des LV; einmal je geladenem LV. */
export function suggestIndexOf(
  positions: Iterable<SuggestPosition>,
  rules: SuggestRules = DEFAULT_SUGGEST_RULES,
): SuggestIndex {
  const full = new Map<string, string | null>();
  const tail = new Map<string, string | null>();
  const amount = new Map<string, string | null>();
  const amountIds = new Map<string, string[]>();
  const words = new Map<string, readonly string[]>();
  const amountOf = new Map<string, { text: string; key: string }>();
  const units = new Set<string>();
  for (const position of positions) {
    const parts = ozParts(position.oz);
    if (parts !== null) {
      addUnique(full, parts.join('.'), position.id);
      // Kurzformen nur als echte Teilstücke: „Pos. 30“ oder „Pos. 2.30“ zu „1.2.30“.
      for (let k = 1; k < parts.length; k++) {
        addUnique(tail, `${k}:${parts.slice(-k).join('.')}`, position.id);
      }
    }
    const unit = unitKeyOf(position.unit);
    if (unit !== null) units.add(unit);
    if (position.quantity !== null && Number.isFinite(position.quantity) && unit !== null) {
      const key = amountKey(position.quantity, unit);
      amountOf.set(position.id, {
        text: `${formatNumber(position.quantity)} ${position.unit ?? ''}`.trim(),
        key,
      });
      addUnique(amount, key, position.id);
      const ids = amountIds.get(key);
      if (ids === undefined) amountIds.set(key, [position.id]);
      else ids.push(position.id);
      words.set(position.id, [...new Set(wordsIn(position.shortText).map((w) => w.stem))]);
    }
  }
  return { full, tail, amount, amountIds, words, amountOf, units, rules };
}

interface Run {
  readonly start: number;
  readonly end: number;
  readonly part: string;
}

/** Trenner zwischen zwei Gliedern: ein Zeichen, Leerraum drum herum zählt nicht. */
function separatorOf(gap: string): string | null {
  const punct = /^\s*([.\-/])\s*$/.exec(gap);
  if (punct !== null) return punct[1];
  return /^[ \u00a0]$/.test(gap) ? ' ' : null;
}

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Davor darf nichts kleben, was die Zahl zu einem längeren Wort oder einer Zahl macht. */
function freeBefore(text: string, at: number): boolean {
  const char = text[at - 1];
  return char === undefined || !/[\p{L}\p{N}_.,\-/]/u.test(char);
}

/** Dahinter kein Buchstabe, keine Ziffer, kein Dezimal- oder Gliedanschluss („,5“). */
function freeAfter(text: string, at: number): boolean {
  const char = text[at];
  if (char === undefined) return true;
  if (LETTER_OR_DIGIT.test(char)) return false;
  return !(/[.,\-/]/.test(char) && /\d/.test(text[at + 1] ?? ''));
}

// „Pos.“, „Position“, „OZ“, „Ordnungszahl“, auch mit „Nr.“ — direkt vor der Zahl.
const CONTEXT = /(?:^|[^\p{L}])(?:pos(?:ition)?|oz|ordnungszahl)\.?\s*(?:nr\.?\s*)?$/iu;

function hasContext(text: string, at: number): boolean {
  return CONTEXT.test(text.slice(Math.max(0, at - 24), at));
}

interface Found {
  readonly start: number;
  readonly end: number;
  readonly id: string;
}

/** OZ im Seitentext, die genau eine Position des LV treffen. */
function findOz(text: string, index: SuggestIndex): Found[] {
  const runs: Run[] = [];
  for (const match of text.matchAll(/\d+/g)) {
    const start = match.index;
    runs.push({ start, end: start + match[0].length, part: match[0] });
  }
  const seps = runs.slice(1).map((run, i) => separatorOf(text.slice(runs[i].end, run.start)));
  const out: Found[] = [];
  const used = new Set<number>();
  const take = (from: number, to: number, id: string): void => {
    out.push({ start: runs[from].start, end: runs[to].end, id });
    for (let i = from; i <= to; i++) used.add(i);
  };
  const keyOf = (from: number, to: number): string | null => {
    const parts: string[] = [];
    for (let i = from; i <= to; i++) {
      if (runs[i].part.length > MAX_PART) return null;
      parts.push(String(Number(runs[i].part)));
    }
    return parts.join('.');
  };

  // Ketten mit gleichem Satzzeichen als Trenner: als Ganzes eine volle OZ.
  for (let i = 0; i < runs.length;) {
    const sep = seps[i];
    let j = i;
    if (sep !== null && sep !== undefined && sep !== ' ') {
      while (seps[j] === sep) j++;
    }
    if (j > i && freeBefore(text, runs[i].start) && freeAfter(text, runs[j].end)) {
      const key = keyOf(i, j);
      const id = key === null ? undefined : index.full.get(key);
      if (typeof id === 'string') take(i, j, id);
      else if (key !== null && hasContext(text, runs[i].start)) {
        const short = index.tail.get(`${j - i + 1}:${key}`);
        if (typeof short === 'string') take(i, j, short);
      }
    }
    i = j + 1;
  }

  // Nur mit Leerzeichen getrennt („01 02 0030“): vorn beginnend so viele Glieder wie
  // eine OZ des LV hat — dahinter steht oft gleich die Menge.
  for (let i = 0; i < runs.length; i++) {
    if (used.has(i) || seps[i] !== ' ' || !freeBefore(text, runs[i].start)) continue;
    let j = i;
    while (seps[j] === ' ' && !used.has(j + 1)) j++;
    for (let end = j; end > i; end--) {
      if (!freeAfter(text, runs[end].end)) continue;
      const key = keyOf(i, end);
      const id = key === null ? undefined : index.full.get(key);
      if (typeof id === 'string') {
        take(i, end, id);
        break;
      }
    }
    i = j;
  }

  // Einzelne Zahl nur nach Kontextwort und nur, wenn genau eine Position so endet.
  for (let i = 0; i < runs.length; i++) {
    if (used.has(i) || !hasContext(text, runs[i].start) || !freeAfter(text, runs[i].end)) continue;
    if (seps[i - 1] !== undefined && seps[i - 1] !== null && seps[i - 1] !== ' ') continue;
    const key = keyOf(i, i);
    const id = key === null ? undefined : index.tail.get(`1:${key}`);
    if (typeof id === 'string') take(i, i, id);
  }
  return out.sort((a, b) => a.start - b.start);
}

interface Amount {
  readonly start: number;
  readonly end: number;
  readonly value: number;
  readonly unit: string;
}

// Deutsche Zahl (Tausenderpunkt, Dezimalkomma), dann eine Einheit wie „m³“, „m2“, „St“.
const AMOUNT = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)\s?(\p{L}{1,6}[²³23]?)\.?/gu;

/** Mengen mit einer Einheit, die im LV vorkommt. */
function findAmounts(text: string, index: SuggestIndex): Amount[] {
  const out: Amount[] = [];
  for (const match of text.matchAll(AMOUNT)) {
    const start = match.index;
    const end = start + match[0].length;
    if (!freeBefore(text, start) || LETTER_OR_DIGIT.test(text[end] ?? '')) continue;
    const unit = unitKeyOf(match[2]);
    if (unit === null || !index.units.has(unit) || NO_AMOUNT_UNITS.has(unit)) continue;
    const value = Number(match[1].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(value)) continue;
    out.push({ start, end, value, unit });
  }
  return out;
}

interface Span {
  readonly start: number;
  readonly end: number;
}

interface AmountPick {
  readonly id: string;
  readonly span: Span;
  readonly words: readonly string[];
}

const stemsMatch = (stems: readonly string[], word: Word) =>
  stems.some((own) => sameWord(own, word.stem));

/** Ende vor der nächsten Position: ohne Leerraum, Satzzeichen und „und“, „sowie“, „oder“. */
function trimEnd(text: string, start: number, end: number): number {
  let cut = end;
  for (;;) {
    const rest = text.slice(start, cut);
    const tail = /(?:[\s,;:]+|(?:^|\s)(?:und|sowie|oder|bzw\.?))$/iu.exec(rest);
    if (tail === null || tail[0] === '') return cut;
    cut -= tail[0].length;
  }
}

/**
 * Positionen zu einer Menge. Wert und Einheit eindeutig: diese Position. Sonst jede, von
 * deren Kurztext ein eigenes Wort (nicht auch bei den anderen) im Satzteil steht — auch
 * mehrere („Tragschicht und Deckschicht je 1.050 m²“). Markiert wird je Position ihr
 * Name bis zur Menge; der ganze Satz, wenn nur eine Menge und eine Position darin stehen.
 */
function pickAmount(
  text: string,
  amount: Amount,
  candidates: readonly string[],
  part: Span,
  sentence: Span | null,
  index: SuggestIndex,
): AmountPick[] {
  const found = wordsIn(text.slice(part.start, part.end), part.start);
  const stemsOf = (id: string) => index.words.get(id) ?? [];
  const scored = candidates.map((id) => {
    const others = candidates.filter((other) => other !== id).map(stemsOf);
    const own = found.filter(
      (word) => stemsMatch(stemsOf(id), word) && !others.some((stems) => stemsMatch(stems, word)),
    );
    return { id, own };
  });
  if (scored.length === 1 && scored[0].own.length === 0) {
    return [{ id: scored[0].id, span: amount, words: [] }];
  }
  const distance = (word: Word) =>
    word.end <= amount.start ? amount.start - word.end : word.start - amount.end;
  const all = scored
    .filter((item) => item.own.length > 0)
    .map((item) => ({
      ...item,
      near: item.own.reduce((a, b) => (distance(b) < distance(a) ? b : a)),
    }))
    .sort((a, b) => distance(a.near) - distance(b.near));
  // Mehrere Positionen nur bei Aufzählung vor der Menge oder mit „je“/„jeweils“;
  // sonst ist die nächste gemeint („88 m Rinne neben dem Kabelschutzrohr“).
  const listed =
    all.every((item) => item.near.end <= amount.start) ||
    /(?:^|[^\p{L}])je(?:weils)?(?:[^\p{L}]|$)/iu.test(text.slice(part.start, part.end));
  const nearest = listed ? all : all.slice(0, 1);
  const wordsOf = (own: readonly Word[]) => [...new Set(own.map((word) => word.word))];
  if (nearest.length === 1 && sentence !== null) {
    return [{ id: nearest[0].id, span: sentence, words: wordsOf(nearest[0].own) }];
  }
  const before = nearest
    .filter((item) => item.near.end <= amount.start)
    .sort((a, b) => a.near.start - b.near.start);
  const after = nearest
    .filter((item) => item.near.start >= amount.end)
    .sort((a, b) => a.near.start - b.near.start);
  const out: AmountPick[] = [];
  before.forEach((item, i) => {
    const next = before[i + 1];
    const end = next === undefined ? amount.end : trimEnd(text, item.near.start, next.near.start);
    out.push({ id: item.id, span: { start: item.near.start, end }, words: wordsOf(item.own) });
  });
  after.forEach((item, i) => {
    const start = i === 0 && before.length === 0 ? amount.start : item.near.start;
    out.push({ id: item.id, span: { start, end: item.near.end }, words: wordsOf(item.own) });
  });
  return out;
}

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

/**
 * Vorschläge einer Seite (ab 1). OZ zuerst; eine Menge kurz hinter einer OZ gehört zu
 * ihr und erscheint dort zum Vergleich. Andere Mengen werden nur vorgeschlagen, wenn
 * Wert und Einheit genau eine Position im LV treffen oder Wörter aus dem Kurztext
 * zeigen, welche der Positionen mit dieser Menge gemeint sind (`pickAmount`).
 *
 * Ist eine Art per Regel aus, wird trotzdem alles gesucht und nur ihr Ergebnis
 * weggelassen — die übrigen Vorschläge bleiben so, wie wenn sie an wäre.
 */
export function suggestionsInPage(
  text: string,
  index: SuggestIndex,
  page: number,
): DocSuggestion[] {
  const ozs = findOz(text, index);
  const amounts = findAmounts(text, index).filter((item) => !ozs.some((oz) => overlaps(oz, item)));
  const nearOz = index.rules.oz?.nearOz ?? AMOUNT_NEAR_OZ;
  const minInteger = index.rules.menge?.minInteger ?? AMOUNT_MIN_INTEGER;
  const near = new Set<Amount>();
  const out: DocSuggestion[] = [];
  ozs.forEach((oz, i) => {
    const limit = Math.min(oz.end + nearOz, ozs[i + 1]?.start ?? text.length);
    const amount = amounts.find((item) => item.start >= oz.end && item.start < limit);
    const own = index.amountOf.get(oz.id) ?? null;
    let extra: DocSuggestion['amount'];
    if (amount !== undefined) {
      near.add(amount);
      extra = {
        pdf: text.slice(amount.start, amount.end),
        lv: own?.text ?? null,
        same: own?.key === amountKey(amount.value, amount.unit),
      };
    }
    out.push({
      page,
      start: oz.start,
      text: text.slice(oz.start, oz.end),
      id: oz.id,
      source: 'oz',
      ...(extra === undefined ? {} : { amount: extra }),
    });
  });
  // Belegte Stellen: keine Markierung über eine OZ oder einen anderen Vorschlag hinweg.
  const taken: Span[] = [...ozs];
  for (const amount of amounts) {
    if (near.has(amount)) continue;
    if (Number.isInteger(amount.value) && amount.value < minInteger) continue;
    const candidates = index.amountIds.get(amountKey(amount.value, amount.unit));
    if (candidates === undefined) continue;
    const sentence = sentenceAround(text, amount.start, amount.end);
    // Mehrere Mengen im Satz: jede bekommt nur den Satzteil bis zur Nachbarmenge.
    const inSentence = amounts.filter((other) => overlaps(other, sentence));
    const prev = inSentence.filter((other) => other.end <= amount.start).at(-1);
    const next = inSentence.find((other) => other.start >= amount.end);
    const part = {
      start: Math.max(sentence.start, prev?.end ?? sentence.start),
      end: Math.min(sentence.end, next?.start ?? sentence.end),
    };
    const alone = inSentence.length === 1 ? sentence : null;
    for (const pick of pickAmount(text, amount, candidates, part, alone, index)) {
      let spot: Span = pick.span;
      if (taken.some((other) => overlaps(other, spot))) {
        if (taken.some((other) => overlaps(other, amount))) continue;
        spot = amount;
      }
      taken.push(spot);
      out.push({
        page,
        start: spot.start,
        text: text.slice(spot.start, spot.end),
        id: pick.id,
        source: 'menge',
        ...(pick.words.length === 0 ? {} : { words: pick.words }),
      });
    }
  }
  return out.filter((item) => index.rules[item.source] !== null).sort((a, b) => a.start - b.start);
}
