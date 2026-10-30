// Offene Textergänzungen: Stellen, an denen der Text eine Eingabe erwartet, die
// noch niemand gemacht hat.
//
// Drei Quellen, in dieser Rangfolge:
//  1. Eingabefelder, die die Datei selbst kennzeichnet (`inputFields`, in GAEB
//     die Bieter-Textergänzungen). Sie zählen immer — die Datei sagt es selbst.
//  2. Punkt- oder Unterstrichreihen im übrigen Text. Drei Punkte sind oft nur
//     eine Auslassung („usw. ..."), deshalb zählen sie erst ab der Mindestlänge
//     der Grundstock-Regel V7 (`offene-stelle`, `punktreihe-mindestlaenge`,
//     docs/domain/reference/regeln.json). Fehlt der Wert, zählen nur die Eingabefelder aus 1.
//  3. Ausformulierte Lücken („Fabrikat: vom Bieter einzutragen").
//
// Das ist der Rohstoff für den VOB-Hinweis „unvollständige Leistungsbeschreibung"
// in WP-K; hier wird nur gefunden, nicht bewertet.
//
// Die Wörter stehen als Wortlisten `bieterangabe` und `offenes-feld` in
// docs/domain/reference/wortlisten.csv. Hier bleibt nur die Form: was eine Lücke ist, und
// dass ein „offenes Feld" ein Feldname mit Doppelpunkt vor einer Lücke ist.

import { builtinParameter } from '../../rules/rules';
import { WISSEN } from '../../rules/wissen';
import { compileStichworte, findeStichworte, stichwortQuelle } from '../material/stichwort';
import { collect, tidy, type Hit } from './spans';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

/** Wert für Eingabefelder aus der Datei. */
const FELD = 'Textergänzung';
/** Wert für Punktreihen im Fließtext. */
const PUNKTREIHE = 'Punktreihe';

let luecke: RegExp | null | undefined;

/**
 * Punkt- oder Unterstrichreihe ab der Mindestlänge; ein „…" zählt wie drei
 * Punkte. `null`, wenn die Mindestlänge fehlt oder keine Zahl ist.
 */
function lueckenMuster(): RegExp | null {
  if (luecke !== undefined) return luecke;
  const n = Number(builtinParameter('offene-stelle', 'punktreihe-mindestlaenge'));
  luecke =
    Number.isInteger(n) && n > 0
      ? new RegExp(`\\.{${n},}|_{${n},}|…{${Math.ceil(n / 3)},}`, 'g')
      : null;
  return luecke;
}

/** Wert für Feldnamen vor einer Lücke (Wortliste `offenes-feld`). */
const OFFENES_FELD = 'Offenes Feld';
/** Wert für ausformulierte Aufforderungen (Wortliste `bieterangabe`). */
const BIETERANGABE = 'Bieterangabe';

/** Feldname, Doppelpunkt, danach nichts oder nur eine Lücke. */
function offenesFeld(namen: readonly string[]): RegExp | null {
  const quelle = stichwortQuelle(namen);
  if (quelle === null) return null;
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${quelle})\\s*:\\s*(?=\\s*(?:\\.{3,}|_{3,}|…|$))`,
    'giu',
  );
}

let worte: { bitte: RegExp | null; feld: RegExp | null } | undefined;

function wortMuster(): { bitte: RegExp | null; feld: RegExp | null } {
  const liste = (name: string): readonly string[] => WISSEN.listen?.get(name) ?? [];
  worte ??= {
    bitte: liste('bieterangabe').length === 0 ? null : compileStichworte(liste('bieterangabe')),
    feld: offenesFeld(liste('offenes-feld')),
  };
  return worte;
}

/** Wie viele Zeichen vor der Lücke als Beschriftung dienen. */
const CAPTION_CHARS = 40;

/**
 * Beschriftung einer Lücke: der Text davor bis zum letzten Satz- oder
 * Zeilenanfang. "Breite von ..........." sagt mehr als "...........".
 */
function captionOf(longText: string, start: number): string {
  const caption = tidy(longText.slice(captionStart(longText, start), start));
  return caption === '' ? 'Offene Textergänzung' : `${caption} …`;
}

/** Wo die Beschriftung vor `start` beginnt. */
function captionStart(longText: string, start: number): number {
  const from = Math.max(0, start - CAPTION_CHARS);
  const before = longText.slice(from, start);
  const cut = Math.max(before.lastIndexOf('. '), before.lastIndexOf('\n'));
  return cut < 0 ? from : from + cut + 1;
}

export function findPlatzhalter(
  longText: string,
  inputFields: readonly { start: number; end: number }[] = [],
): Hit[] {
  const hits: Hit[] = [...findFelder(longText, inputFields), ...findLuecken(longText, inputFields)];
  const { bitte, feld } = wortMuster();
  if (bitte !== null) {
    for (const treffer of findeStichworte(longText, bitte, null)) {
      hits.push({
        value: BIETERANGABE,
        start: treffer.start,
        end: treffer.end,
        label: treffer.text,
      });
    }
  }
  if (feld !== null) {
    for (const match of longText.matchAll(feld)) {
      const start = match.index ?? 0;
      hits.push({
        value: OFFENES_FELD,
        start,
        end: start + match[0].length,
        label: tidy(match[0]),
      });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

function findFelder(longText: string, felder: readonly { start: number; end: number }[]): Hit[] {
  return felder.map((feld) => {
    const label = captionOf(longText, feld.start);
    // Ein leeres Feld hat keine Zeichen; als Fundstelle dient dann die
    // Beschriftung davor, damit im Langtext etwas markiert werden kann.
    const leer = feld.end <= feld.start;
    if (!leer) return { value: FELD, start: feld.start, end: feld.end, label };
    let start = captionStart(longText, feld.start);
    while (start < feld.start && /\s/.test(longText[start])) start++;
    return { value: FELD, start, end: feld.start, label };
  });
}

function findLuecken(longText: string, felder: readonly { start: number; end: number }[]): Hit[] {
  const muster = lueckenMuster();
  if (muster === null) return [];
  const hits: Hit[] = [];
  for (const match of longText.matchAll(muster)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    // Punkte in einem Eingabefeld sind schon als Feld gezählt.
    if (felder.some((feld) => start < Math.max(feld.end, feld.start + 1) && end > feld.start)) {
      continue;
    }
    hits.push({ value: PUNKTREIHE, start, end, label: captionOf(longText, start) });
  }
  return hits;
}

export const platzhalterExtractor: Extractor = {
  id: 'platzhalter',
  extract(context: ExtractorContext): ExtractorResult {
    const hits = findPlatzhalter(context.longText, context.inputFields);
    const { values, spans } = collect('platzhalter', hits);
    if (values.length === 0) return { attributes: {}, spans: [] };
    // Die Anzahl ist die eigentlich interessante Zahl: eine Position mit zwölf
    // offenen Stellen ist etwas anderes als eine mit einer.
    return { attributes: { platzhalter: values, platzhalterAnzahl: hits.length }, spans };
  },
};
