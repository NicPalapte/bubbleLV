import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAEBParseError, GAEBValidationError, GAEBVersionError } from '../../src/lib/gaeb/errors';
import { getGaebParser } from '../../src/lib/gaeb/parser';
import type { ParsedLV, ParsedPosition, ParsedSection } from '../../src/lib/gaeb/types';

const parser = getGaebParser();

// Vitest läuft mit `frontend/` als Arbeitsverzeichnis (vite.config.ts).
const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURE_DIR, name)));
}

function positionsOf(sections: ParsedSection[]): ParsedPosition[] {
  return sections.flatMap((section) => [...section.positions, ...positionsOf(section.sections)]);
}

function allPositions(lv: ParsedLV): ParsedPosition[] {
  return lv.lots.flatMap((lot) => positionsOf(lot.sections));
}

function byOz(lv: ParsedLV, oz: string): ParsedPosition {
  const position = allPositions(lv).find((candidate) => candidate.oz === oz);
  if (position === undefined) throw new Error(`Position ${oz} nicht gefunden`);
  return position;
}

describe('XmlGaebParser · sample.X83 (Los-Ebene, mit Einheitspreisen)', () => {
  const lv = parser.parse(fixture('sample.X83'), 'sample.X83');

  it('liest die Kopfdaten', () => {
    expect(lv.gaebVersion).toBe('3.3');
    expect(lv.dataPhase).toBe('83');
    expect(lv.projectId).toBe('TEST-001');
    expect(lv.projectName).toBe('Testprojekt Umbau');
    expect(lv.client).toBe('Muster AG');
    expect(lv.deadline).toBe('2026-08-01');
  });

  it('bildet die Los-Ebene aus BoQBkdn Type="Lot" ab', () => {
    expect(lv.lots).toHaveLength(1);
    expect(lv.lots[0].number).toBe('01');
    expect(lv.lots[0].label).toBe('Los 1 - Rohbau');
    expect(lv.lots[0].sections.map((section) => section.number)).toEqual(['01.01', '01.02']);
    expect(lv.lots[0].sections.map((section) => section.label)).toEqual([
      'Erdarbeiten',
      'Betonarbeiten',
    ]);
  });

  it('setzt die OZ aus allen Gliederungsebenen zusammen', () => {
    expect(allPositions(lv).map((position) => position.oz)).toEqual([
      '01.01.0010',
      '01.01.0020',
      '01.02.0010',
    ]);
  });

  it('mappt Mengen, Einheit, Einheitspreis und Texte', () => {
    const position = byOz(lv, '01.01.0010');
    expect(position.shortText).toBe('Oberboden abtragen');
    expect(position.longText).toBe(
      'Oberboden abtragen und seitlich lagern, Schichtdicke ca. 30 cm.',
    );
    expect(position.unit).toBe('m3');
    expect(position.quantity).toBe(100);
    expect(position.unitPrice).toBe(12.5);
    expect(position.itemType).toBe('Normal');
  });

  it('erkennt Pauschalpositionen (<LumpSumItem>)', () => {
    expect(byOz(lv, '01.02.0010').itemType).toBe('LumpSum');
  });
});

describe('XmlGaebParser · gaeb-xml-beispiel.x83 (BVBS-Musterdatei)', () => {
  const lv = parser.parse(fixture('gaeb-xml-beispiel.x83'), 'gaeb-xml-beispiel.x83');

  it('liest die Kopfdaten ohne Auftraggeber-Adresse', () => {
    expect(lv.gaebVersion).toBe('3.3');
    expect(lv.dataPhase).toBe('83');
    expect(lv.projectName).toBe('BVBS GAEB Musterdatei 3.3');
    expect(lv.client).toBeNull();
  });

  it('legt ohne Los-Ebene ein implizites Los an', () => {
    expect(lv.lots).toHaveLength(1);
    expect(lv.lots[0].number).toBe('');
    expect(lv.lots[0].label).toBe('BVBS GAEB Musterdatei Bauausführung');
  });

  it('erhält die verschachtelten LV-Bereiche', () => {
    const top = lv.lots[0].sections;
    expect(top.map((section) => section.number)).toEqual(['001', '002', '999']);
    expect(top[0].label).toBe('Bauhauptgewerke');
    expect(top[0].sections.map((section) => section.number)).toEqual([
      '001.001',
      '001.002',
      '001.003',
      '001.004',
    ]);
    expect(top[0].sections[0].label).toBe('Baustelleneinrichtung');
    // Bereiche mit Unterbereichen tragen selbst keine Positionen.
    expect(top[0].positions).toHaveLength(0);
  });

  it('parst alle Positionen inklusive Zuschlagsposition', () => {
    expect(allPositions(lv)).toHaveLength(28);
  });

  it('macht Indexpositionen über die OZ unterscheidbar', () => {
    const ozs = allPositions(lv).map((position) => position.oz);
    expect(ozs).toContain('001.001.0010');
    expect(ozs).toContain('001.001.0010.1');
    expect(ozs).toContain('001.001.0010.A');
    expect(new Set(ozs).size).toBe(ozs.length);
  });

  it('leitet die Positionsart aus den GAEB-Kennzeichen ab', () => {
    // ALNSerNo 0 = Grundposition, ALNSerNo 1 = alternative Ausführung.
    expect(byOz(lv, '001.002.0040').itemType).toBe('Normal');
    expect(byOz(lv, '001.002.0050').itemType).toBe('Alternative');
    // <Provis>WithTotal</Provis> = Bedarfsposition mit Gesamtbetrag.
    expect(byOz(lv, '001.001.0010.1').itemType).toBe('Eventual');
    expect(byOz(lv, '002.001.0030').itemType).toBe('Markup');
  });

  it('extrahiert Kurz- und Langtext aus den p/span-Strukturen', () => {
    const position = byOz(lv, '001.001.0010.A');
    expect(position.shortText).toBe('Betreiben der Wasserhaltungsanlage mit Überwachung');
    expect(position.longText).toContain(
      'Betreiben der Wasserhaltungsanlage mit allen Wasserfördereinrichtungen,',
    );
    expect(position.longText).toContain('Indexposition mit Index "A"');
    // Leere Absätze werden nicht zu Leerzeilen-Kaskaden.
    expect(position.longText).not.toMatch(/\n{3}/);
  });

  it('hängt Unterbeschreibungen an den Langtext der Position an', () => {
    const position = byOz(lv, '002.003.0010');
    expect(position.shortText).toContain('Gas-Kombi-Wasserheizer');
    expect(position.longText).toContain('01 Heizgerät für raumluftunabhängigen Betrieb');
    expect(position.longText).toContain('02 Membran-Druckausdehnungsgefäß');
  });

  it('liefert Mengen und Einheiten, aber keine Preise (x83 ohne UP)', () => {
    const position = byOz(lv, '001.002.0040');
    expect(position.quantity).toBe(1245);
    expect(position.unit).toBe('m2');
    expect(position.unitPrice).toBeNull();
  });
});

describe('XmlGaebParser · Fehlerfälle', () => {
  it('wirft GAEBVersionError bei nicht unterstützter Version', () => {
    const file = 'unsupported-version.x83';
    expect(() => parser.parse(fixture(file), file)).toThrow(GAEBVersionError);
  });

  it('wirft GAEBParseError bei nicht wohlgeformtem XML', () => {
    expect(() => parser.parse('<GAEB><Award></GAEB>', 'kaputt.x83')).toThrow(GAEBParseError);
  });

  it('wirft GAEBValidationError bei fremdem Wurzelelement', () => {
    expect(() => parser.parse('<?xml version="1.0"?><Rechnung/>', 'fremd.xml')).toThrow(
      GAEBValidationError,
    );
  });

  it('wirft GAEBValidationError ohne Leistungsverzeichnis', () => {
    const xml =
      '<?xml version="1.0"?><GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3">' +
      '<GAEBInfo><Version>3.3</Version></GAEBInfo></GAEB>';
    expect(() => parser.parse(xml, 'ohne-lv.x83')).toThrow(GAEBValidationError);
  });
});

describe('XmlGaebParser · Encoding', () => {
  it('dekodiert ISO-8859-1 anhand der XML-Deklaration', () => {
    const xml = readFileSync(resolve(FIXTURE_DIR, 'sample.X83'), 'utf-8').replace(
      '<?xml version="1.0" encoding="utf-8"?>',
      '<?xml version="1.0" encoding="ISO-8859-1"?>',
    );
    const latin1 = new Uint8Array(Buffer.from(xml, 'latin1'));

    const lv = parser.parse(latin1, 'latin1.x83');
    expect(byOz(lv, '01.02.0010').longText).toBe(
      'Ortbeton C25/30 für Streifenfundament einbauen.',
    );
  });
});
