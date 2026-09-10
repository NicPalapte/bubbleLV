// Langtext-Aufbereitung (Issue #41): Exporte schreiben jede Zeile in ein eigenes
// <p>; Einrückung, Textergänzungen und harte Umbrüche dürfen den Text weder
// zerreißen noch mit Leerzeilen durchsetzen.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getGaebParser } from '../../src/lib/gaeb/parser';
import { extractInlineText, extractText, reflowLines } from '../../src/lib/gaeb/text';
import type { ParsedLV, ParsedPosition, ParsedSection } from '../../src/lib/gaeb/types';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURE_DIR, name)));
}

function positionsOf(sections: ParsedSection[]): ParsedPosition[] {
  return sections.flatMap((section) => [...section.positions, ...positionsOf(section.sections)]);
}

function byOz(lv: ParsedLV, oz: string): ParsedPosition {
  const position = lv.lots
    .flatMap((lot) => positionsOf(lot.sections))
    .find((candidate) => candidate.oz === oz);
  if (position === undefined) throw new Error(`Position ${oz} nicht gefunden`);
  return position;
}

function element(xml: string): Element {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return doc.documentElement;
}

describe('reflowLines', () => {
  it('verbindet umbrochene Zeilen mit Leerzeichen', () => {
    expect(reflowLines(['Alle Pläne der Gewerke Rohbau,', 'Haustechnik und Außenanlagen.'])).toBe(
      'Alle Pläne der Gewerke Rohbau, Haustechnik und Außenanlagen.',
    );
  });

  it('lässt kurze Sätze mit Satzzeichen allein stehen', () => {
    expect(reflowLines(['Unterlagen zusammenstellen.', 'Alle Pläne anfordern.'])).toBe(
      'Unterlagen zusammenstellen.\nAlle Pläne anfordern.',
    );
    expect(reflowLines(['Bauwerk:', 'Brücke'])).toBe('Bauwerk:\nBrücke');
  });

  it('verbindet volle Zeilen auch nach einem Satzzeichen', () => {
    const full = 'Ergänzung des Bestandes als Unterlage für die Planung.';
    expect(full.length).toBeGreaterThanOrEqual(45);
    expect(reflowLines([full, 'Gilt für alle Bauzustände.'])).toBe(
      `${full} Gilt für alle Bauzustände.`,
    );
  });

  it('erkennt Abkürzungen nicht als Satzende', () => {
    expect(reflowLines(['Vorhaltedauer ca.', '12 Wochen.'])).toBe('Vorhaltedauer ca. 12 Wochen.');
    expect(reflowLines(['Farbe z. B.', 'grau'])).toBe('Farbe z. B. grau');
  });

  it('hält Listenpunkte auf eigenen Zeilen', () => {
    expect(reflowLines(['Lieferumfang:', '- Grundgerät', '- Befestigungsmaterial'])).toBe(
      'Lieferumfang:\n- Grundgerät\n- Befestigungsmaterial',
    );
    expect(reflowLines(['Ablauf', '1. Prüfung', '2. Abnahme', 'a) Vorab'])).toBe(
      'Ablauf\n1. Prüfung\n2. Abnahme\na) Vorab',
    );
    // Ein Bindestrich ohne Leerzeichen ist kein Listenpunkt.
    expect(reflowLines(['Wert', '-70 mm'])).toBe('Wert -70 mm');
  });

  it('behält bewusste Leerzeilen genau einmal', () => {
    expect(reflowLines(['Erster Absatz', '', '', 'Zweiter Absatz'])).toBe(
      'Erster Absatz\n\nZweiter Absatz',
    );
    expect(reflowLines(['', 'Text', '', ''])).toBe('Text');
  });

  it('bewertet nur die letzte Zeile eines <br>-Blocks', () => {
    expect(reflowLines(['Hersteller:\nTyp:', 'Fabrikat eintragen'])).toBe(
      'Hersteller:\nTyp:\nFabrikat eintragen',
    );
    expect(reflowLines(['Hersteller:\nTyp und', 'Fabrikat eintragen'])).toBe(
      'Hersteller:\nTyp und Fabrikat eintragen',
    );
  });

  it('liefert leer für leere Eingabe', () => {
    expect(reflowLines([])).toBe('');
    expect(reflowLines(['', ''])).toBe('');
  });
});

describe('extractText', () => {
  it('zählt Einrückung zwischen Elementen nicht als Text', () => {
    const el = element(`<Text>
      <p>
       <span>Erste Zeile kurz.</span>
      </p>
      <p>
       <span>Zweite Zeile kurz.</span>
      </p>
    </Text>`);
    expect(extractText(el)).toBe('Erste Zeile kurz.\nZweite Zeile kurz.');
  });

  it('trennt zwei <span> in einem <p> mit genau einem Leerzeichen', () => {
    const el = element(`<Text><p>
      <span>Baustelle einrichten,</span>
      <span>vorhalten und räumen.</span>
    </p></Text>`);
    expect(extractText(el)).toBe('Baustelle einrichten, vorhalten und räumen.');
  });

  it('lässt Textergänzungen im Satz', () => {
    const el = element(`<Text><p>
      <span>Unterlagen digital</span>
      <TextComplement Kind="Owner"><ComplCaption/><ComplBody><span>'-'</span></ComplBody>
        <ComplTail><span>zur Prüfung liefern und </span></ComplTail></TextComplement>
      <span>Anmerkungen einarbeiten.</span>
    </p></Text>`);
    expect(extractText(el)).toBe(
      "Unterlagen digital '-' zur Prüfung liefern und Anmerkungen einarbeiten.",
    );
  });

  it('behält <br> als Umbruch', () => {
    const el = element('<Text><p><span>Hersteller:</span><br/><span>Typ:</span></p></Text>');
    expect(extractText(el)).toBe('Hersteller:\nTyp:');
  });

  it('macht aus dem Kurztext eine Zeile', () => {
    const el = element('<OutlTxt><p><span>Kurz</span><br/><span>Text</span></p></OutlTxt>');
    expect(extractInlineText(el)).toBe('Kurz Text');
  });
});

describe('XmlGaebParser · zeilenumbruch-export.x83 (Issue #41)', () => {
  const lv = getGaebParser().parse(fixture('zeilenumbruch-export.x83'), 'zeilenumbruch-export.x83');

  it('zieht Zeilen zu Absätzen zusammen und behält den bewussten Absatzabstand', () => {
    expect(byOz(lv, '01.0010').longText).toBe(
      [
        'Unterlagen zusammenstellen.',
        'Alle Pläne der Gewerke Rohbau, Ausbau, Haustechnik und Außenanlagen beim ' +
          'Auftraggeber anfordern und mit dem Bestand vor Ort abgleichen.',
        '',
        'Gilt für alle Bauzustände.',
      ].join('\n'),
    );
  });

  it('erzeugt keine Leerzeile mehr nach jeder Zeile', () => {
    for (const position of positionsOf(lv.lots[0].sections)) {
      expect(position.longText).not.toMatch(/\n\n\n/);
      expect(position.longText.split('\n').filter((line) => line === '').length).toBeLessThan(2);
    }
  });

  it('hält Textergänzungen im Satz — auch zwischen zwei <p>', () => {
    const text = byOz(lv, '01.0020').longText;
    expect(text).toContain(
      "Unterlagen digital '-' zur Prüfung liefern und Anmerkungen einarbeiten.",
    );
    expect(text).toContain("Unterlagen nach Freigabe in Papierform '(>3<)' fach liefern.");
    expect(text).toContain('Nachweise aufstellen. Lastannahmen nach Vorgabe des Auftraggebers.');
    expect(text.endsWith('Bauwerk: Brücke.')).toBe(true);
  });

  it('respektiert Listen, <br> und Abkürzungen', () => {
    expect(byOz(lv, '01.0030').longText).toBe(
      [
        'Lieferumfang:',
        '- Grundgerät',
        '- Befestigungsmaterial',
        '1. Prüfung vor Ort',
        '2. Abnahme',
        'Hersteller:',
        'Typ:',
        'Angebotenes Fabrikat vom Bieter einzutragen, Vorhaltedauer ca. 12 Wochen.',
      ].join('\n'),
    );
  });

  it('macht aus einem Kurztext mit <br> eine Zeile', () => {
    expect(byOz(lv, '01.0010').shortText).toBe(
      'Unterlagen zusammenstellen Gewerke Rohbau bis Außenanlagen',
    );
  });
});
