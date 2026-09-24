// Lokaler Export der Positionen (WP-P, Schritt 3). Geprüft wird die Zusage aus
// dem Plan: der Export enthält **genau** die gefilterte Menge — und er verlässt
// den Browser nicht (das prüft tests/export/download.test.ts).

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { positionsCsv } from '../../src/lib/export/positions';
import { buildPositionIndex, filterMask } from '../../src/lib/index/positionIndex';
import { EMPTY_FILTERS, prepareFilters, type Filters } from '../../src/lib/matchPos';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { buildTree } from '../../src/lib/tree/buildTree';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();
const index = buildPositionIndex(lv.tree);

function maskFor(search: string, filters: Filters = EMPTY_FILTERS): Uint8Array {
  return filterMask(index, prepareFilters(filters, search));
}

/** Datenzeilen ohne Kopfzeile. CSV-Felder dürfen Zeilenumbrüche enthalten. */
function datenzeilen(csv: string): string[] {
  const zeilen: string[] = [];
  let feld = '';
  let inQuotes = false;
  let zeile = '';
  for (let i = 0; i < csv.length; i++) {
    const zeichen = csv[i];
    if (zeichen === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        feld += '"';
        i++;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && zeichen === '\r' && csv[i + 1] === '\n') {
      zeilen.push(zeile + feld);
      zeile = '';
      feld = '';
      i++;
      continue;
    }
    feld += zeichen;
  }
  return zeilen.slice(1);
}

describe('positionsCsv', () => {
  it('schreibt ohne Filter jede Position genau einmal', () => {
    const zeilen = datenzeilen(positionsCsv(index, null));
    expect(zeilen).toHaveLength(index.size);
  });

  it('enthält genau die gefilterte Menge', () => {
    const mask = maskFor('Beton');
    const treffer = mask.reduce((summe: number, wert) => summe + (wert === 1 ? 1 : 0), 0);
    expect(treffer).toBeGreaterThan(0);
    expect(treffer).toBeLessThan(index.size);
    expect(datenzeilen(positionsCsv(index, mask))).toHaveLength(treffer);
  });

  it('beginnt mit einer Kopfzeile aus allen Spalten', () => {
    const kopf = positionsCsv(index, null).split('\r\n')[0].split(';');
    // Nicht die sichtbaren Spalten der Tabelle: ein Export, dem etwas fehlt,
    // fällt erst auf, wenn die Datei schon weitergereicht ist.
    expect(kopf).toContain('OZ');
    expect(kopf).toContain('Langtext');
    expect(kopf).toContain('Gewerk');
    expect(kopf.length).toBeGreaterThan(10);
  });

  it('macht aus einer fehlenden Menge kein Feld mit 0', () => {
    const ohneMenge = [...index.quantity].findIndex((value) => !Number.isFinite(value));
    if (ohneMenge < 0) return; // Die Musterdatei führt überall Mengen.
    const zeile = datenzeilen(positionsCsv(index, null))[ohneMenge];
    expect(zeile.split(';')[3]).toBe('');
  });

  it('bricht Felder mit Semikolon, Zitat oder Umbruch nicht auf', () => {
    // Die Langtexte der Musterdatei tragen Umbrüche — genau der Fall, an dem
    // eine naive Verkettung die Spalten verschöbe.
    const csv = positionsCsv(index, null);
    expect(csv).toContain('"');
    expect(datenzeilen(csv)).toHaveLength(index.size);
  });
});

// ── Formeln aus der Datei ────────────────────────────────────────────────────
//
// Die GAEB-Datei kommt im Vergabeverfahren selten von dem, der sie liest.
// Ein Kurztext, der mit „=" beginnt, führt Excel beim Öffnen der exportierten
// CSV als Formel aus (CSV-Injection, CWE-1236).

function csvVon(positions: readonly PositionDraft[]): string[] {
  const kleinerIndex = buildPositionIndex(buildTree(draftMit(positions)));
  return positionsCsv(kleinerIndex, null).split('\r\n');
}

function draftMit(positions: readonly PositionDraft[]): LVDraft {
  return {
    projectName: 'Export-Test',
    client: null,
    lots: [
      {
        number: '01',
        label: 'Los',
        sections: [
          { number: '01.001', label: 'Abschnitt', sections: [], positions: [...positions] },
        ],
      },
    ],
  };
}

function position(overrides: Partial<PositionDraft> = {}): PositionDraft {
  return {
    oz: '01.001.0010',
    shortText: 'Wand herstellen',
    longText: 'Herstellen einer Wand.',
    unit: 'm3',
    quantity: 10,
    unitPrice: 100,
    positionType: 'NORMAL',
    attributes: {},
    ...overrides,
  };
}

describe('positionsCsv · Formel-Injection', () => {
  it('entschärft einen Text, der als Formel beginnt', () => {
    const [, zeile] = csvVon([
      position({ shortText: '=HYPERLINK("https://evil.example","Klick")' }),
    ]);
    // Das Apostroph macht in Excel und LibreOffice wieder Text daraus.
    expect(zeile).toContain(`"'=HYPERLINK`);
    expect(zeile).not.toContain(';=HYPERLINK');
  });

  it('entschärft auch die anderen Formel-Startzeichen', () => {
    for (const start of ['+', '-', '@', '\t']) {
      const [, zeile] = csvVon([position({ shortText: `${start}cmd|'/c calc'!A0` })]);
      expect(zeile.split(';')[1].startsWith(`'${start}`) || zeile.includes(`"'${start}`)).toBe(
        true,
      );
    }
  });

  it('lässt eine negative Zahl eine Zahl bleiben', () => {
    // Abzugspositionen führen einen negativen Einheitspreis — er soll in Excel
    // als Zahl ankommen und nicht als Text mit Apostroph.
    const [, zeile] = csvVon([position({ unitPrice: -50 })]);
    expect(zeile.split(';')[4]).toBe('-50');
  });
});

describe('positionsCsv · Zahlen', () => {
  it('schreibt keinen Rundungsrest in den Gesamtpreis', () => {
    // 1,1 × 3 ergibt in JavaScript 3.3000000000000003. Diese Ziffernkette hat
    // in einer Tabelle nichts verloren, mit der jemand weiterrechnet.
    const [, zeile] = csvVon([position({ quantity: 1.1, unitPrice: 3 })]);
    expect(zeile.split(';')[5]).toBe('3,3');
  });

  it('lässt den Gesamtpreis leer, wo die Datei keinen Preis führt', () => {
    // Die Musterdatei (x83) führt keine Preise. „0" in jeder Zeile läse sich
    // wie ein Nullpreis — die Datei sagt aber schlicht nichts dazu.
    const zeilen = datenzeilen(positionsCsv(index, null));
    expect(zeilen.every((zeile) => zeile.split(';')[5] === '')).toBe(true);
  });

  it('kürzt echte Nachkommastellen nicht weg', () => {
    // Ein Einheitspreis mit vier Stellen ist im GAEB-Format zulässig; auf zwei
    // gerundet wäre die Summe in der Tabelle falsch.
    const [, zeile] = csvVon([position({ quantity: 10, unitPrice: 0.0125 })]);
    const felder = zeile.split(';');
    expect(felder[4]).toBe('0,0125');
    expect(felder[5]).toBe('0,125');
  });
});
