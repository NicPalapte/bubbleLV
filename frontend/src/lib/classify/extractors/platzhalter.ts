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

import { collect, tidy, type Hit } from './spans';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

/** Punkt-, Unterstrich- oder Auslassungsreihe ab drei Zeichen. */
const LUECKE = /\.{3,}|_{3,}|…+/g;

/** Ausformulierte Aufforderung an den Bieter. */
const BIETERANGABE =
  /\b(?:bieterangabe|vom\s+bieter\s+(?:ein)?zutragen|vom\s+bieter\s+anzugeben|durch\s+den\s+bieter\s+(?:ein)?zutragen|bieter\s+trägt\s+ein)\b/gi;

/** Feldnamen, die typischerweise offen bleiben. */
const OFFENES_FELD = /\b(?:fabrikat|hersteller|typ|erzeugnis)\s*:\s*(?=\s*(?:\.{3,}|_{3,}|…|$))/gi;

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
  const hits: Hit[] = [
    ...findLuecken(longText),
    ...[...longText.matchAll(BIETERANGABE)].map((match) => {
      const start = match.index ?? 0;
      return {
        value: 'Bieterangabe',
        start,
        end: start + match[0].length,
        label: tidy(match[0]),
      };
    }),
    ...[...longText.matchAll(OFFENES_FELD)].map((match) => {
      const start = match.index ?? 0;
      return {
        value: 'Offenes Feld',
        start,
        end: start + match[0].length,
        label: tidy(match[0]),
      };
    }),
  ];
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
