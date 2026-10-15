// Offene Textergänzungen: Stellen, an denen der Text eine Eingabe erwartet, die
// noch niemand gemacht hat.
//
// Woher sie kommen: GAEB DA XML führt sie als <TextComplement Kind="Bidder">
// mit leerem oder gepunktetem <ComplBody> ("Breite von ........... cm."). Der
// Parser flacht diese Blöcke in den Langtext ab (lib/gaeb/text.ts) — die Lücke
// bleibt als Punkt- oder Unterstrichreihe stehen und ist genau hier zu erkennen.
// Daneben schreiben Ausschreibende die Lücke oft ausformuliert ("Fabrikat:
// vom Bieter einzutragen").
//
// Das ist der Rohstoff für den VOB-Hinweis „unvollständige Leistungsbeschreibung"
// in WP-K; hier wird nur gefunden, nicht bewertet.
//
// Die Wörter stehen als Zeilen V7 in docs/domain/reference/pruefregeln-stichworte.csv.
// Hier bleibt nur die Form: was eine Lücke ist, und dass ein „offenes Feld" ein
// Feldname mit Doppelpunkt vor einer Lücke ist.

import { regelStichworte } from '../../check/referenz';
import { findeStichworte, stichwortQuelle } from '../material/stichwort';
import { collect, tidy, type Hit } from './spans';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

/** Punkt-, Unterstrich- oder Auslassungsreihe ab drei Zeichen — eine Form, kein Wort. */
const LUECKE = /\.{3,}|_{3,}|…+/g;

/** Zeile in pruefregeln-stichworte.csv, deren Wörter Feldnamen vor einer Lücke sind. */
const OFFENES_FELD = 'Offenes Feld';

/** Feldname, Doppelpunkt, danach nichts oder nur eine Lücke. */
function offenesFeld(namen: readonly string[]): RegExp | null {
  const quelle = stichwortQuelle(namen);
  if (quelle === null) return null;
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${quelle})\\s*:\\s*(?=\\s*(?:\\.{3,}|_{3,}|…|$))`,
    'giu',
  );
}

/** Wie viele Zeichen vor der Lücke als Beschriftung dienen. */
const CAPTION_CHARS = 40;

/**
 * Beschriftung einer Lücke: der Text davor bis zum letzten Satz- oder
 * Zeilenanfang. "Breite von ..........." sagt mehr als "...........".
 */
function captionOf(longText: string, start: number): string {
  const before = longText.slice(Math.max(0, start - CAPTION_CHARS), start);
  const cut = Math.max(before.lastIndexOf('. '), before.lastIndexOf('\n'));
  const caption = tidy(cut < 0 ? before : before.slice(cut + 1));
  return caption === '' ? 'Offene Textergänzung' : `${caption} …`;
}

export function findPlatzhalter(longText: string): Hit[] {
  const hits: Hit[] = findLuecken(longText);
  for (const zeile of regelStichworte('V7')) {
    if (zeile.wert === OFFENES_FELD) {
      const pattern = offenesFeld(zeile.stichworte);
      if (pattern === null) continue;
      for (const match of longText.matchAll(pattern)) {
        const start = match.index ?? 0;
        hits.push({
          value: zeile.wert,
          start,
          end: start + match[0].length,
          label: tidy(match[0]),
        });
      }
      continue;
    }
    for (const treffer of findeStichworte(longText, zeile.pattern, zeile.ausser)) {
      hits.push({ value: zeile.wert, start: treffer.start, end: treffer.end, label: treffer.text });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

function findLuecken(longText: string): Hit[] {
  return [...longText.matchAll(LUECKE)].map((match) => {
    const start = match.index ?? 0;
    return {
      value: 'Textergänzung',
      start,
      end: start + match[0].length,
      label: captionOf(longText, start),
    };
  });
}

export const platzhalterExtractor: Extractor = {
  id: 'platzhalter',
  extract(context: ExtractorContext): ExtractorResult {
    const hits = findPlatzhalter(context.longText);
    const { values, spans } = collect('platzhalter', hits);
    if (values.length === 0) return { attributes: {}, spans: [] };
    // Die Anzahl ist die eigentlich interessante Zahl: eine Position mit zwölf
    // offenen Stellen ist etwas anderes als eine mit einer.
    return { attributes: { platzhalter: values, platzhalterAnzahl: hits.length }, spans };
  },
};
