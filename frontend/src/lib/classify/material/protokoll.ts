// Treffer-Protokoll der Materialtabellen: welche Zeile welches Stichwort in
// welchem Text getroffen hat. Zum Prüfen der Tabellen, nicht für die Ansicht —
// es läuft erst beim Export, nicht beim Laden.
//
// Eine Konfidenz gibt es nicht: eine Zeile trifft oder nicht. Stattdessen nennt
// das Protokoll Auffälligkeiten, an denen sich Tabellenfehler zeigen:
//  - verworfen: das Stichwort traf, aber `ausser` schloss die Fundstelle aus
//  - nicht gesucht: ein Merkmal traf, das Material wurde aber nicht erkannt
//  - mehrere Werte: ein Merkmal bekam zwei Werte (Ortbeton und Fertigteil)
//  - nur über Muster erkannt: kein Wort, nur eine Klasse wie „C#/#"
//
// Die Regeln, was zählt, sind dieselben wie in extractors/material.ts.

import { tidy } from '../extractors/spans';
import type { Matcher, MaterialDefinition } from './katalog';
import { compileAusser } from './stichwort';

export type TrefferStatus = 'gezählt' | 'verworfen (ausser)' | 'nicht gesucht';

export interface ProtokollZeile {
  material: string;
  /** „Erkennung" oder der Name des Merkmals. */
  merkmal: string;
  /** Leer bei „Erkennung". */
  wert: string;
  fundtext: string;
  /** Das Stichwort der Zelle, das getroffen hat, z. B. „beton*". */
  stichwort: string;
  tabelle: string;
  zeile: number;
  ort: 'Kurztext' | 'Langtext';
  status: TrefferStatus;
  auffaellig: string;
}

const ERKENNUNG = 'Erkennung';

/** Einzeln übersetzte Stichworte, damit sich die Fundstelle einem zuordnen lässt. */
const einzeln = new Map<string, RegExp | null>();

function welchesStichwort(matcher: Matcher, fundtext: string): string {
  // Längere zuerst, wie im Suchmuster: „stahlbeton*" vor „beton*".
  const kandidaten = [...matcher.stichworte].sort((a, b) => b.length - a.length);
  for (const stichwort of kandidaten) {
    let pattern = einzeln.get(stichwort);
    if (pattern === undefined) {
      pattern = compileAusser([stichwort]);
      einzeln.set(stichwort, pattern);
    }
    if (pattern?.test(fundtext) === true) return stichwort;
  }
  return matcher.stichworte.join('|');
}

interface Fund {
  fundtext: string;
  stichwort: string;
  ort: ProtokollZeile['ort'];
  verworfen: boolean;
}

function funde(texte: Texte, matcher: Matcher): Fund[] {
  const out: Fund[] = [];
  for (const ort of ['Kurztext', 'Langtext'] as const) {
    const text = ort === 'Kurztext' ? texte.shortText : texte.longText;
    for (const match of text.matchAll(matcher.pattern)) {
      const fundtext = tidy(match[0]);
      out.push({
        fundtext,
        stichwort: welchesStichwort(matcher, fundtext),
        ort,
        verworfen: matcher.ausser?.test(fundtext) === true,
      });
    }
  }
  return out;
}

interface Texte {
  shortText: string;
  longText: string;
}

/** Alle Treffer einer Position, auch die, die nicht zählen. */
export function trefferProtokoll(
  texte: Texte,
  materials: readonly MaterialDefinition[],
): ProtokollZeile[] {
  const zeilen: ProtokollZeile[] = [];

  for (const material of materials) {
    const basis = { material: material.name, tabelle: material.datei };
    const erkennung = material.erkennung.flatMap((matcher) =>
      funde(texte, matcher).map((fund) => ({ fund, zeile: matcher.zeile })),
    );
    const gezaehlt = erkennung.filter(({ fund }) => !fund.verworfen);
    const erkannt = gezaehlt.length > 0;
    const nurMuster = erkannt && gezaehlt.every(({ fund }) => fund.stichwort.includes('#'));

    for (const { fund, zeile } of erkennung) {
      zeilen.push({
        ...basis,
        merkmal: ERKENNUNG,
        wert: '',
        fundtext: fund.fundtext,
        stichwort: fund.stichwort,
        zeile,
        ort: fund.ort,
        status: fund.verworfen ? 'verworfen (ausser)' : 'gezählt',
        auffaellig: !fund.verworfen && nurMuster ? 'nur über Muster erkannt' : '',
      });
    }

    for (const merkmal of material.merkmale) {
      const eigene: ProtokollZeile[] = [];
      for (const { wert, matcher } of merkmal.werte) {
        for (const fund of funde(texte, matcher)) {
          eigene.push({
            ...basis,
            merkmal: merkmal.name,
            wert: wert ?? fund.fundtext,
            fundtext: fund.fundtext,
            stichwort: fund.stichwort,
            zeile: matcher.zeile,
            ort: fund.ort,
            status: fund.verworfen ? 'verworfen (ausser)' : erkannt ? 'gezählt' : 'nicht gesucht',
            auffaellig: '',
          });
        }
      }
      const werte = [...new Set(eigene.filter((z) => z.status === 'gezählt').map((z) => z.wert))];
      if (werte.length > 1) {
        for (const zeile of eigene) {
          if (zeile.status === 'gezählt') zeile.auffaellig = `mehrere Werte: ${werte.join(', ')}`;
        }
      }
      zeilen.push(...eigene);
    }
  }
  return zeilen;
}
