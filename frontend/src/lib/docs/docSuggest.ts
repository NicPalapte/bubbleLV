// Vorschläge zum Verknüpfen im Begleitdokument (Entscheidung 0080): OZ und Mengen aus
// dem geladenen LV im Seitentext wiederfinden. Nur exakter Abgleich mit dem LV, keine
// Deutung des Textes — was nicht eindeutig zu genau einer Position passt, wird kein
// Vorschlag. Übernommen wird erst per Klick (KI/Automatik schlägt vor, Mensch entscheidet).
//
// Reine Funktionen; das Verzeichnis lässt sich in den Worker klonen (nur Map/Set/Strings).
// Lage und Text der Vorschläge beziehen sich auf den Seitentext wie bei der Suche
// (`docSearch.ts`), damit die Textebene sie mit `locateOnPage` wiederfindet.

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

/** Kleinere ganze Zahlen sind als Menge zu allgemein („2 St“, „1 m“). */
export const AMOUNT_MIN_INTEGER = 10;
/** So viele Zeichen hinter einer OZ zählt eine Menge noch zu ihr. */
export const AMOUNT_NEAR_OZ = 80;
/** Längstes Glied einer OZ; längere Ziffernfolgen sind Telefon-, Auftrags- oder Seriennummern. */
const MAX_PART = 6;

/** Schreibweisen aus Fließtext, die GAEB-LVs so nicht schreiben. */
const PDF_UNIT_SPELLINGS: Readonly<Record<string, string>> = { cbm: 'm3', qm: 'm2' };

/** So weit reicht der Satz um eine Menge höchstens in jede Richtung. */
export const SENTENCE_REACH = 200;
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

/** Wörter eines Texts mit Lage, ohne allgemeine Wörter; Stamm klein geschrieben. */
function wordsIn(text: string): { readonly stem: string; readonly word: string }[] {
  const out: { stem: string; word: string }[] = [];
  for (const match of text.matchAll(/\p{L}+/gu)) {
    const word = match[0];
    const lower = word.toLowerCase();
    if (lower.length < MIN_WORD || GENERIC_WORDS.has(lower)) continue;
    out.push({ stem: stemOf(lower), word });
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
export function suggestIndexOf(positions: Iterable<SuggestPosition>): SuggestIndex {
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
  return { full, tail, amount, amountIds, words, amountOf, units };
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

/**
 * Satz um eine Menge: bis zu Satzzeichen mit Leerraum und folgendem Großbuchstaben
 * (Punkte in Zahlen und „ca. 200“ trennen nicht), höchstens `SENTENCE_REACH` Zeichen.
 */
function sentenceAround(text: string, from: number, to: number): { start: number; end: number } {
  let start = Math.max(0, from - SENTENCE_REACH);
  const before = text.slice(start, from);
  const breaks = [...before.matchAll(/[.!?;:]\s+(?=\p{Lu})/gu)];
  const last = breaks.at(-1);
  if (last !== undefined) start += last.index + last[0].length;
  else if (start > 0) start += before.search(/\s\S/) + 1;
  const limit = Math.min(text.length, to + SENTENCE_REACH);
  const after = text.slice(to, limit);
  const stop = /[.!?;](?=\s|$)/.exec(after);
  let end = stop === null ? limit : to + stop.index + 1;
  if (stop === null && limit < text.length) {
    const space = after.lastIndexOf(' ');
    if (space > 0) end = to + space;
  }
  while (start < from && /\s/.test(text[start])) start++;
  while (end > to && /\s/.test(text[end - 1])) end--;
  return { start, end };
}

/** Wörter des Satzes, die im Kurztext stehen, in der Schreibweise des PDF. */
function sharedWords(sentence: string, stems: readonly string[]): string[] {
  const out: string[] = [];
  for (const { stem, word } of wordsIn(sentence)) {
    if (stems.some((own) => sameWord(own, stem)) && !out.includes(word)) out.push(word);
  }
  return out;
}

/**
 * Position zu einer Menge: eindeutig über Wert und Einheit, sonst die eine mit den
 * meisten gemeinsamen Wörtern im Satz (mindestens eins, ohne Gleichstand).
 */
function pickByWords(
  candidates: readonly string[],
  sentence: string,
  index: SuggestIndex,
): { id: string; words: string[] } | null {
  const scored = candidates.map((id) => ({
    id,
    words: sharedWords(sentence, index.words.get(id) ?? []),
  }));
  if (scored.length === 1) return scored[0];
  scored.sort((a, b) => b.words.length - a.words.length);
  const [best, next] = scored;
  if (best === undefined || best.words.length === 0) return null;
  return next !== undefined && next.words.length === best.words.length ? null : best;
}

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

/**
 * Vorschläge einer Seite (ab 1). OZ zuerst; eine Menge kurz hinter einer OZ gehört zu
 * ihr und erscheint dort zum Vergleich. Andere Mengen werden nur vorgeschlagen, wenn
 * Wert und Einheit genau eine Position im LV treffen oder unter mehreren genau eine die
 * meisten Wörter mit dem Satz teilt. Mit gemeinsamen Wörtern wird der ganze Satz markiert.
 */
export function suggestionsInPage(
  text: string,
  index: SuggestIndex,
  page: number,
): DocSuggestion[] {
  const ozs = findOz(text, index);
  const amounts = findAmounts(text, index).filter((item) => !ozs.some((oz) => overlaps(oz, item)));
  const near = new Set<Amount>();
  const out: DocSuggestion[] = [];
  ozs.forEach((oz, i) => {
    const limit = Math.min(oz.end + AMOUNT_NEAR_OZ, ozs[i + 1]?.start ?? text.length);
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
  // Belegte Stellen: ein Satz wird nur einmal und nie über eine OZ hinweg markiert.
  const taken: { start: number; end: number }[] = [...ozs];
  for (const amount of amounts) {
    if (near.has(amount)) continue;
    if (Number.isInteger(amount.value) && amount.value < AMOUNT_MIN_INTEGER) continue;
    const candidates = index.amountIds.get(amountKey(amount.value, amount.unit));
    if (candidates === undefined) continue;
    const sentence = sentenceAround(text, amount.start, amount.end);
    const picked = pickByWords(candidates, text.slice(sentence.start, sentence.end), index);
    if (picked === null) continue;
    // Stehen mehrere Mengen im Satz, gehört er keiner allein: dann nur die Menge.
    const whole =
      picked.words.length > 0 &&
      !amounts.some((other) => other !== amount && overlaps(other, sentence)) &&
      !taken.some((spot) => overlaps(spot, sentence));
    const spot = whole ? sentence : amount;
    taken.push(spot);
    out.push({
      page,
      start: spot.start,
      text: text.slice(spot.start, spot.end),
      id: picked.id,
      source: 'menge',
      ...(picked.words.length === 0 ? {} : { words: picked.words }),
    });
  }
  return out.sort((a, b) => a.start - b.start);
}
