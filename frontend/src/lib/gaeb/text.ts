// Textextraktion aus GAEB-Textelementen (tgMLText & Co.): der Inhalt steckt in
// verschachtelten <p>/<span>/<br>-Knoten, Textergänzungen zusätzlich in
// <TextComplement>-Blöcken. Formatierung (style/class) ist für Anzeige, Suche
// und Klassifizierung irrelevant und wird verworfen.
//
// Exporte aus Kalkulationsprogrammen (z. B. iTWO) schreiben jede *Zeile* eines
// Satzes in ein eigenes <p> — ein Erbe des zeilenorientierten GAEB-90-Formats
// mit festen 55 Zeichen je Zeile. Ohne Gegenmaßnahme erschiene jede Zeile als
// eigener Absatz (Issue #41). `reflowLines` zieht solche Zeilen wieder zu
// Absätzen zusammen; echte Absatzgrenzen (leere <p/>, kurze Sätze, Listen)
// bleiben erhalten.

const NODE_TEXT = 3;
const NODE_CDATA = 4;
const NODE_ELEMENT = 1;

/** Elemente, deren Inhalt einen eigenen Absatz bildet. */
const BLOCK_ELEMENTS = new Set(['p', 'div']);

/**
 * Teile einer Textergänzung (<TextComplement>): Vortext, Platzhalter/Eingabe,
 * Nachtext. Sie stehen mitten im Satz und dürfen ihn nicht zerreißen — nur ein
 * Leerzeichen trennt sie, falls der Export keines liefert.
 */
const INLINE_PARTS = new Set(['ComplCaption', 'ComplBody', 'ComplTail']);

/** Interner Marker für ein Absatzende — nie Teil des Ergebnisses. */
const PARAGRAPH_END = ' ';

function walk(node: Node, out: string[]): void {
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === NODE_TEXT || child.nodeType === NODE_CDATA) {
      const value = child.nodeValue ?? '';
      // Einrückung zwischen Elementen ist kein Text. Sie enthält einen
      // Zeilenumbruch und erzeugte so nach jedem <p> eine Leerzeile (Issue #41).
      // Als Leerzeichen bleibt sie Trenner zwischen zwei <span> in einem <p>.
      out.push(value.includes('\n') && value.trim() === '' ? ' ' : value);
      continue;
    }
    if (child.nodeType !== NODE_ELEMENT) continue;

    const el = child as Element;
    if (el.localName === 'br') {
      out.push('\n');
      continue;
    }
    // <image> transportiert nur Binärdaten/Verweise, kein Text.
    if (el.localName === 'image') continue;

    walk(el, out);
    if (BLOCK_ELEMENTS.has(el.localName)) out.push(PARAGRAPH_END);
    else if (INLINE_PARTS.has(el.localName)) out.push(' ');
  }
}

function collapseSpaces(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

/**
 * Ein <p> als Block: seine Zeilen (getrennt durch <br>), jeweils ohne
 * überflüssigen Leerraum. Ein Block ohne Inhalt ist eine bewusste Leerzeile.
 */
function toBlocks(raw: string): string[] {
  return raw.split(PARAGRAPH_END).map((block) => {
    const lines = block.split('\n').map(collapseSpaces);
    while (lines.length > 0 && lines[0] === '') lines.shift();
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  });
}

/**
 * Ab dieser Länge gilt eine Zeile als „voll", also als vom Export umbrochen —
 * auch wenn sie mit einem Satzzeichen endet. Exporte brechen bei rund 55
 * Zeichen um; kürzere Zeilen mit Satzende sind bewusst gesetzt.
 */
const FULL_LINE = 45;

const SENTENCE_END = /[.:!?]$/;

/** Abkürzungen, deren Punkt kein Satzende ist. */
const ABBREVIATION_END =
  /(^|\s)(ca|inkl|exkl|bzw|ggf|zzgl|gem|max|min|Nr|Pos|Abs|evtl|vgl|St|Stk|Stck|Std|z\.\s?B|u\.\s?a|d\.\s?h|i\.\s?d\.\s?R)\.$/i;

/** Listenpunkte am Zeilenanfang: „- ", „• ", „1. ", „a) ", „(1) ". */
const LIST_START = /^([-–•*]|\d+[.)]|\(\d+\)|[a-zA-Z][.)])\s/;

/**
 * Ob `next` die zuletzt angehängte Quellzeile `last` fortsetzt statt neu zu
 * beginnen. Bewertet wird die einzelne Zeile aus dem Export, nicht der bereits
 * zusammengezogene Absatz — sonst würde ein einmal „voller" Absatz alles
 * Folgende schlucken.
 */
function continues(last: string, next: string): boolean {
  if (LIST_START.test(next)) return false;
  // Ein kurzer Listenpunkt endet mit seiner Zeile; nur ein langer ist umbrochen.
  if (LIST_START.test(last) && last.length < FULL_LINE) return false;
  if (last.length >= FULL_LINE) return true;
  if (!SENTENCE_END.test(last)) return true;
  return ABBREVIATION_END.test(last);
}

/** Letzte Zeile eines Eintrags — nur sie zählt für die Fortsetzung. */
function lastLineOf(entry: string): string {
  return entry.slice(entry.lastIndexOf('\n') + 1);
}

/**
 * Zieht hart umbrochene Zeilen zu Absätzen zusammen.
 *
 * Eingabe: je <p> ein Eintrag (Zeilenumbrüche aus <br> bleiben darin als `\n`
 * stehen), leerer Eintrag = bewusste Leerzeile. Zwei aufeinanderfolgende
 * Einträge werden mit Leerzeichen verbunden, **außer**
 * - der erste ist kurz (< 45 Zeichen) und endet mit `.`, `:`, `!` oder `?`,
 * - der zweite beginnt wie ein Listenpunkt,
 * - ein leerer Eintrag liegt dazwischen (echter Absatz).
 *
 * Ergebnis: Absätze durch `\n` getrennt, bewusste Leerzeilen als `\n\n`
 * (mehrere hintereinander zu einer zusammengefasst).
 */
export function reflowLines(lines: readonly string[]): string {
  const paragraphs: string[] = [];
  let current: string | null = null;
  let lastLine = '';
  let blankPending = false;

  for (const line of lines) {
    if (line === '') {
      if (current !== null) {
        paragraphs.push(current);
        current = null;
      }
      blankPending = paragraphs.length > 0;
      continue;
    }
    if (blankPending) {
      paragraphs.push('');
      blankPending = false;
    }
    if (current === null) current = line;
    else if (continues(lastLine, line)) current = `${current} ${line}`;
    else {
      paragraphs.push(current);
      current = line;
    }
    lastLine = lastLineOf(line);
  }
  if (current !== null) paragraphs.push(current);

  return paragraphs.join('\n');
}

/** Mehrzeiliger Text mit erhaltenen Absätzen (Langtext, Hinweistexte). */
export function extractText(el: Element | null): string {
  if (el === null) return '';
  const out: string[] = [];
  walk(el, out);
  return reflowLines(toBlocks(out.join('')));
}

/** Einzeiliger Text (Kurztext, Bereichsbezeichnung) — Umbrüche werden zu Leerzeichen. */
export function extractInlineText(el: Element | null): string {
  return extractText(el).replace(/\s+/g, ' ').trim();
}
