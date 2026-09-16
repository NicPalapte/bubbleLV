import { describe, expect, it } from 'vitest';
import { getClassifier } from '../../src/lib/classify';
import { parseStlbCsv } from '../../src/lib/classify/stlbCatalog';
import type { ClassifierInput } from '../../src/lib/classify';

/** Referenzkatalog mit gepflegten Stichworten — so, wie ihn ein Maintainer füllt. */
const CATALOG = parseStlbCsv(
  [
    'lb_nummer,lb_bezeichnung,positionsart_default,keywords,quelle_version',
    '000,"Baustelleneinrichtungen, Sicherheitseinrichtungen",baustelleneinrichtung,baustelleneinrichtung,2023',
    '012,Mauerarbeiten,,mauerarbeiten|mauerwerk,2023',
    '013,"Beton- und Stahlbetonarbeiten",,betonarbeiten|stahlbetonarbeiten,2023',
    '091,Stundenlohnarbeiten,personal,stundenlohnarbeiten,2023',
  ].join('\n'),
);

function input(partial: Partial<ClassifierInput>): ClassifierInput {
  return { oz: '01.010', shortText: '', longText: '', unit: null, ...partial };
}

describe('RuleBasedClassifier — Stufe 0 mit Referenzkatalog', () => {
  const classifier = getClassifier({ catalog: CATALOG });

  it('klassifiziert eine Wand aus Stahlbetonarbeiten vollständig', () => {
    const { attributes, meta } = classifier.classify(
      input({
        shortText: 'Stahlbetonwand herstellen',
        longText:
          'Stahlbetonarbeiten: Tragende Wand aus Ortbeton C30/37, ' +
          'Expositionsklassen XC2, XD1, Dicke 30 cm.',
        unit: 'm3',
      }),
    );

    expect(attributes.positionsart).toBe('bauteil');
    expect(attributes.gewerkLb).toBe('013');
    expect(attributes.gewerk).toBe('Beton- und Stahlbetonarbeiten');
    expect(attributes.bauteiltyp).toBe('Wand');
    expect(attributes.beton).toBe('C30/37');
    expect(attributes.expo).toEqual(['XC2', 'XD1']);
    expect(attributes.tragend).toBe(true);
    expect(attributes.dicke).toBe('30 cm');
    expect(meta.classifier).toBe('rule');
    expect(meta.ruleset).toBe('013_beton');
    expect(meta.confidence).toBe(1);
  });

  it('erkennt nichttragende Bauteile explizit', () => {
    const { attributes } = classifier.classify(
      input({
        shortText: 'Nichttragende Wand',
        longText: 'Betonarbeiten, nichttragende Wand aus C20/25.',
        unit: 'm2',
      }),
    );
    expect(attributes.tragend).toBe(false);
    expect(attributes.beton).toBe('C20/25');
  });

  it('nutzt den LB-Default für eindeutig nicht-physische Leistungsbereiche', () => {
    const { attributes, meta } = classifier.classify(
      input({ shortText: 'Stundenlohnarbeiten Facharbeiter', unit: 'h' }),
    );
    expect(attributes.positionsart).toBe('personal');
    expect(attributes.gewerkLb).toBe('091');
    expect(attributes.qualifikation).toBe('Facharbeiter');
    expect(attributes.zeiteinheit).toBe('h');
    expect(attributes.bauteiltyp).toBeUndefined();
    expect(meta.ruleset).toBe('personal');
  });

  it('wählt das Mauerwerks-Ruleset über die LB-Nummer', () => {
    const { attributes, meta } = classifier.classify(
      input({
        shortText: 'Mauerwerk Innenwand',
        longText: 'Mauerarbeiten: tragende Wand aus Kalksandstein, Dicke 24 cm.',
        unit: 'm2',
      }),
    );
    expect(attributes.gewerkLb).toBe('012');
    expect(attributes.steinart).toBe('Kalksandstein');
    expect(attributes.dicke).toBe('24 cm');
    expect(meta.ruleset).toBe('012_mauerwerk');
  });

  it('fällt auf das Fallback-Ruleset zurück, wenn (Bauteiltyp, LB) unbekannt ist', () => {
    const { attributes, meta } = classifier.classify(
      input({
        shortText: 'Dachfläche',
        longText: 'Mauerarbeiten am Dach, Höhe 4 m.',
        unit: 'm2',
      }),
    );
    expect(attributes.bauteiltyp).toBe('Dach');
    expect(attributes.gewerkLb).toBe('012');
    expect(meta.ruleset).toBe('fallback');
    expect(attributes.hoehe).toBe('4 m');
    // Ohne genormte Klasse im Text bleibt der Key ganz weg statt auf null zu stehen.
    expect(attributes.beton).toBeUndefined();
    expect(attributes.tragend).toBeUndefined();
  });

  it('setzt Besonderheiten für jede Position', () => {
    const { attributes } = classifier.classify(
      input({
        shortText: 'Bodenplatte',
        longText: 'Betonarbeiten, WU-Beton nach DIN EN 206 mit CEM III/A.',
        unit: 'm3',
      }),
    );
    expect(attributes.keywords).toContain('WU-Beton');
    expect(attributes.keywords).toContain('CEM III/A');
    // Normverweise stehen seit WP-J im eigenen Key, nicht mehr unter
    // „Besonderheiten" — sonst stünde "DIN EN 206" zweimal im Panel.
    expect(attributes.keywords).not.toContain('DIN EN 206');
    expect(attributes.normen).toContain('DIN EN 206');
  });
});

describe('RuleBasedClassifier — Fallback ohne Referenzkatalog', () => {
  const classifier = getClassifier({ catalog: [] });

  it('klassifiziert ohne LB-Treffer über die Heuristik, ohne Fehler', () => {
    const { attributes, meta } = classifier.classify(
      input({ shortText: 'Wand aus Beton C25/30', longText: 'Tragende Wand.', unit: 'm3' }),
    );
    expect(attributes.gewerkLb).toBeNull();
    expect(attributes.gewerk).toBeNull();
    expect(attributes.positionsart).toBe('bauteil');
    expect(attributes.bauteiltyp).toBe('Wand');
    // Ohne LB gibt es keinen Ruleset-Key → Basis-Attribute statt Betonlogik.
    expect(meta.ruleset).toBe('fallback');
    // Genormte Kurzbezeichnungen liefert auch der Fallback (DIN EN 206) …
    expect(attributes.beton).toBe('C25/30');
    // … die gewerkespezifische Aussage `tragend` dagegen nicht.
    expect(attributes.tragend).toBeUndefined();
  });

  it('erkennt Baustelleneinrichtung, Planung und Personal über Stichworte', () => {
    expect(
      classifier.classify(input({ shortText: 'Baustelleneinrichtung vorhalten', unit: 'Wo' }))
        .attributes.positionsart,
    ).toBe('baustelleneinrichtung');
    expect(
      classifier.classify(input({ shortText: 'Statische Berechnung erstellen', unit: 'psch' }))
        .attributes.positionsart,
    ).toBe('planung');
    expect(
      classifier.classify(input({ shortText: 'Regiestunde Polier', unit: 'h' })).attributes
        .positionsart,
    ).toBe('personal');
  });

  it('lässt sich von Nachbarbauteilen im Langtext nicht in die Irre führen', () => {
    // Reale Erdarbeiten-Position aus gaeb-xml-beispiel.x83: der Langtext nennt
    // die Böschungswände der Baugrube, das Bauteil ist aber keine Wand.
    const { attributes } = classifier.classify(
      input({
        shortText: 'Boden für Baugrube, BK 3',
        longText:
          'Boden für Baugruben ab Baugrubensohle profilgerecht lösen, ' +
          'Ausführung mit geböschten Wänden, Aushubtiefe bis 2,8 m.',
        unit: 'm3',
      }),
    );
    expect(attributes.bauteiltyp).toBeNull();
  });

  it('leitet die Positionsart nicht aus Verweisen im Langtext ab', () => {
    const { attributes } = classifier.classify(
      input({
        shortText: 'Boden Graben Kanal Tiefe bis 1,45 m lösen',
        longText: 'Boden der Gräben profilgerecht lösen, Bodenklassen gemäß Gutachten.',
        unit: 'm3',
      }),
    );
    expect(attributes.positionsart).toBe('bauteil');
  });

  it('nutzt den Langtext weiterhin für Eigenschaften', () => {
    const { attributes } = classifier.classify(
      input({
        shortText: 'Ortbeton Deckenplatte',
        longText: 'Ortbeton der Deckenplatten, Normalbeton C 20/25 DIN EN 206-1, Dicke 20 cm.',
        unit: 'm2',
      }),
    );
    expect(attributes.bauteiltyp).toBe('Decke');
    expect(attributes.dicke).toBe('20 cm');
    expect(attributes.keywords).toContain('Ortbeton');
  });

  it('fällt auf "sonstige" zurück, wenn weder Stichwort noch Einheit tragen', () => {
    const { attributes } = classifier.classify(input({ shortText: 'Titel', unit: null }));
    expect(attributes.positionsart).toBe('sonstige');
    expect(attributes.bauteiltyp).toBeUndefined();
  });
});

// In realen LVs steht das Gewerk regelmäßig nur in der Titel-Überschrift und
// nicht in jeder Positionszeile. Stufe 0 greift deshalb auf die Überschriften
// der übergeordneten Abschnitte zurück — mit demselben Katalog, und sichtbar
// als geerbt (`meta.gewerkQuelle`).
describe('RuleBasedClassifier — Gewerk aus der Abschnittsüberschrift', () => {
  const classifier = getClassifier({ catalog: CATALOG });

  it('erbt den Leistungsbereich, wenn der Positionstext keinen nennt', () => {
    const { attributes, meta } = classifier.classify(
      input({
        shortText: 'Wand herstellen, d = 24 cm',
        longText: 'Wand aus Ortbeton C25/30 herstellen.',
        unit: 'm3',
        headings: ['Titel 02 Betonarbeiten', 'Los 1 Rohbau'],
      }),
    );

    expect(attributes.gewerkLb).toBe('013');
    expect(attributes.gewerk).toBe('Beton- und Stahlbetonarbeiten');
    expect(meta.gewerkQuelle).toBe('abschnitt');
  });

  it('lässt den Positionstext gewinnen — er ist genauer als die Überschrift', () => {
    const { attributes, meta } = classifier.classify(
      input({
        shortText: 'Mauerwerk herstellen',
        longText: 'Mauerarbeiten: Innenwand aus Kalksandstein.',
        unit: 'm2',
        headings: ['Titel 02 Betonarbeiten'],
      }),
    );

    expect(attributes.gewerkLb).toBe('012');
    expect(meta.gewerkQuelle).toBe('position');
  });

  it('nimmt die nächstgelegene Überschrift, nicht die oberste', () => {
    const { attributes } = classifier.classify(
      input({
        shortText: 'Wand herstellen',
        headings: ['Abschnitt 2.1 Mauerarbeiten', 'Titel 02 Betonarbeiten'],
      }),
    );

    expect(attributes.gewerkLb).toBe('012');
  });

  it('erfindet nichts: eine Überschrift ohne Leistungsbereich bleibt folgenlos', () => {
    const { attributes, meta } = classifier.classify(
      input({
        shortText: 'Vorhaltung Bauzaun',
        headings: ['Titel 09 Allgemeines', 'Los 1'],
      }),
    );

    expect(attributes.gewerk).toBeNull();
    expect(attributes.gewerkLb).toBeNull();
    expect(meta.gewerkQuelle).toBeNull();
  });

  it('macht aus einem geerbten Gewerk kein Bauteil', () => {
    // Unter „Betonarbeiten" stehen auch Stundenlohn- und Vorhalteleistungen.
    const { attributes } = classifier.classify(
      input({
        shortText: 'Stundenlohnarbeiten Facharbeiter',
        longText: 'Abrechnung nach Aufwand.',
        unit: 'Std',
        headings: ['Titel 02 Betonarbeiten'],
      }),
    );

    expect(attributes.positionsart).toBe('personal');
  });

  it('erbt auch ohne eigene Abschnitts-Überschrift aus dem Los', () => {
    const { attributes, meta } = classifier.classify(
      input({ shortText: 'Wand herstellen', headings: ['Los 3 Mauerarbeiten'] }),
    );

    expect(attributes.gewerkLb).toBe('012');
    expect(meta.gewerkQuelle).toBe('abschnitt');
  });
});
