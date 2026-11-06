// Dokumentart eines Begleit-PDFs nach einfachen Regeln (Entscheidung 0096): erst der
// Dateiname, dann das Format der ersten Seite, dann ihr Titel. Die Namensregeln sind
// dieselben wie in bauonto `src/bauonto/erkennen/dokumentart.py`; bei einer Änderung dort
// mitziehen (gleiche Testfälle in `packages/core/tests/docs/docKind.test.ts`).
// Reine Namens- und Formatregeln, kein inhaltliches Matching.

export const DOC_KINDS = [
  'baubeschreibung',
  'vorbemerkungen',
  'anhang-baubeschreibung',
  'vertrag',
  'lv',
  'gutachten',
  'plan',
  'terminplan',
  'aia',
  'bap',
  'formblatt',
  'foto',
  'sonstiges',
] as const;

export type DocKind = (typeof DOC_KINDS)[number];

export const DOC_KIND_LABEL: Readonly<Record<DocKind, string>> = {
  baubeschreibung: 'Baubeschreibung',
  vorbemerkungen: 'Vorbemerkungen',
  'anhang-baubeschreibung': 'Anhang Baubeschreibung',
  vertrag: 'Vertrag',
  lv: 'LV',
  gutachten: 'Gutachten',
  plan: 'Plan',
  terminplan: 'Terminplan',
  aia: 'AIA',
  bap: 'BAP',
  formblatt: 'Formblatt',
  foto: 'Foto',
  sonstiges: 'Sonstiges',
};

export function isDocKind(value: unknown): value is DocKind {
  return typeof value === 'string' && (DOC_KINDS as readonly string[]).includes(value);
}

// Reihenfolge zählt: „Vorbemerkungen zur Baubeschreibung“ sind Vorbemerkungen.
// Muster wörtlich wie in bauonto (Python-Regex); `\b` wird unten Unicode-fest gemacht.
const BY_NAME: ReadonlyArray<readonly [DocKind, string]> = [
  ['vorbemerkungen', String.raw`vorbemerk`],
  ['aia', String.raw`\baia\b|informationsanforderung`],
  ['bap', String.raw`\bbap\b|abwicklungsplan`],
  // BE-Plan (Baustelleneinrichtung) steht oft als Anhang, ist aber ein Plan (Owner 05.11.).
  ['plan', String.raw`\bbe\b|baustelleneinrichtung`],
  ['anhang-baubeschreibung', String.raw`\banh[aä]ng|\banlage`],
  ['gutachten', String.raw`gutachten|baugrund|geotechn|schadstoff|kampfmittel|bodenuntersuch`],
  ['terminplan', String.raw`terminplan|bauzeitenplan|bauablaufplan|ablaufplan|\bterminrahmen`],
  ['baubeschreibung', String.raw`baubeschreibung|leistungsbeschreibung|erläuterungsbericht`],
  [
    'vertrag',
    String.raw`\b[zbe]vb\b|vertragsbedingung|\bztv|technische vertragsbedingung|` +
      String.raw`aufforderung zur angebotsabgabe|bewerbungsbedingung|angebotsschreiben`,
  ],
  ['formblatt', String.raw`formblatt|vordruck|\befb\b|erklärung|eigenerklärung`],
  ['lv', String.raw`leistungsverzeichnis|\blv\b`],
  [
    'plan',
    String.raw`plan|pläne|grundriss|schnitt|ansicht|lageplan|übersicht|längsschnitt|` +
      String.raw`querschnitt|bauwerksplan|detail`,
  ],
  ['foto', String.raw`foto|bild|\bimg[_ -]?\d|\bdsc[_ -]?\d`],
];

// JavaScript kennt `\b` nur für a–z; „übe“ hätte sonst eine Wortgrenze vor „be“.
const WORD = String.raw`[\p{L}\p{N}]`;
const BOUNDARY = `(?:(?<!${WORD})(?=${WORD})|(?<=${WORD})(?!${WORD}))`;

const NAME_RULES = BY_NAME.map(
  ([kind, pattern]) =>
    [kind, new RegExp(pattern.replaceAll(String.raw`\b`, BOUNDARY), 'u')] as const,
);

/** Größer als A3 (297 × 420 mm) mit 5 mm Spiel, in Punkt (1 pt = 25,4/72 mm), wie bauonto. */
const A3_SHORT_PT = ((297 + 5) * 72) / 25.4;
const A3_LONG_PT = ((420 + 5) * 72) / 25.4;

/** Unter so vielen Zeichen hat die Seite keinen lesbaren Text (Scan, nur Stempel). */
const MIN_CHARS = 20;
/** Titel = Textteile, deren Schrift mindestens so groß ist wie dieser Anteil der größten. */
const TITLE_SHARE = 0.75;
const TITLE_MIN = 8;
const TITLE_MAX = 160;

/** Was die Erkennung von der ersten Seite braucht. */
export interface FirstPage {
  /** Breite und Höhe in Punkt. */
  readonly width: number;
  readonly height: number;
  /** Titel der Seite, siehe `titleOfPage`; leer, wenn sie keinen Text hat. */
  readonly title: string;
}

export type DocKindRule = 'name' | 'format' | 'titel';

export interface DocKindGuess {
  /** `null`: keine Regel greift („Nicht erkannt“). */
  readonly kind: DocKind | null;
  readonly rule: DocKindRule | null;
  /** Gefundenes Wort aus Name oder Titel, für die Anzeige „Erkannt am Namen: …“. */
  readonly hit: string | null;
}

const NOT_FOUND: DocKindGuess = { kind: null, rule: null, hit: null };

// Trennzeichen in Dateinamen („Baugrund_Gutachten-v2.pdf“) als Wortgrenze lesen.
function words(text: string): string {
  return text.toLocaleLowerCase('de').replace(/[_\-./]+/g, ' ');
}

function withoutExtension(name: string): string {
  return name.replace(/\.pdf$/i, '');
}

const WORD_CHAR = new RegExp(`^${WORD}$`, 'u');

/** Das ganze Wort um einen Treffer („geotechn“ ⇒ „geotechnischer“), für die Anzeige. */
function wordAround(text: string, start: number, length: number): string {
  let from = start;
  let to = start + length;
  while (from > 0 && WORD_CHAR.test(text[from - 1])) from -= 1;
  while (to < text.length && WORD_CHAR.test(text[to])) to += 1;
  return text.slice(from, to);
}

function byWords(text: string, skip: ReadonlySet<DocKind>): { kind: DocKind; hit: string } | null {
  for (const [kind, pattern] of NAME_RULES) {
    if (skip.has(kind)) continue;
    const found = pattern.exec(text);
    if (found !== null) return { kind, hit: wordAround(text, found.index, found[0].length) };
  }
  return null;
}

const NONE = new Set<DocKind>();
// Im Titel ist „Bild“ meist „Bildung“, „Abbildung“ o. Ä., kein Foto.
const NOT_FROM_TITLE = new Set<DocKind>(['foto']);

export function largerThanA3(width: number, height: number): boolean {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  return short > A3_SHORT_PT || long > A3_LONG_PT;
}

/** Erste Regel gewinnt: Dateiname, dann Format der ersten Seite, dann ihr Titel. */
export function guessDocKind(name: string, firstPage: FirstPage | null): DocKindGuess {
  const fromName = byWords(words(withoutExtension(name)), NONE);
  if (fromName !== null) return { ...fromName, rule: 'name' };
  if (firstPage === null) return NOT_FOUND;
  if (largerThanA3(firstPage.width, firstPage.height)) {
    return { kind: 'plan', rule: 'format', hit: null };
  }
  const fromTitle = byWords(words(firstPage.title), NOT_FROM_TITLE);
  return fromTitle === null ? NOT_FOUND : { ...fromTitle, rule: 'titel' };
}

/** Ein Textstück der Seite, wie PDF.js es liefert: Text und Schrifthöhe in Punkt. */
export interface PageTextItem {
  readonly str: string;
  readonly height: number;
}

/** Titel einer Seite: die Textstücke in der größten Schrift, in Lesereihenfolge. */
export function titleOfPage(items: readonly PageTextItem[]): string {
  const parts = items.filter((item) => item.str.trim() !== '' && item.height > 0);
  const chars = parts.reduce((sum, item) => sum + item.str.trim().length, 0);
  if (chars < MIN_CHARS) return '';
  // Ein einzelnes großes Zeichen (Logo, Seitenzahl) ist kein Titel: dann die nächste
  // Schriftgröße dazunehmen, bis genug Text beisammen ist.
  const heights = [...new Set(parts.map((item) => item.height))].sort((a, b) => b - a);
  let title = '';
  for (const height of heights) {
    title = parts
      .filter((item) => item.height >= height * TITLE_SHARE)
      .map((item) => item.str.trim())
      .join(' ')
      .replace(/\s+/g, ' ');
    if (title.length >= TITLE_MIN) break;
  }
  return title.slice(0, TITLE_MAX);
}
