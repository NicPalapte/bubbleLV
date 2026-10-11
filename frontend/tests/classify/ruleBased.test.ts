import { describe, expect, it } from 'vitest';
import { getClassifier } from '../../src/lib/classify';
import type { ClassifierInput } from '../../src/lib/classify';

function input(partial: Partial<ClassifierInput>): ClassifierInput {
  return { oz: '01.010', shortText: '', longText: '', unit: null, ...partial };
}

// Ohne Leistungsbereich (Entscheidung 0044): was gilt, steht im Text der Position.
describe('RuleBasedClassifier — Bauteil aus dem Text', () => {
  const classifier = getClassifier();

  it('klassifiziert eine Stahlbetonwand ohne Gewerk', () => {
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
    expect(attributes.bauteiltyp).toBe('Wand');
    expect(attributes.beton).toBe('C30/37');
    expect(attributes.expo).toEqual(['XC2', 'XD1']);
    expect(attributes.dicke).toBe('30 cm');
    expect(meta.classifier).toBe('rule');
    expect(meta.ruleset).toBe('fallback');
    expect(meta.confidence).toBe(1);
  });

  it('setzt weder Gewerk noch Leistungsbereich noch `tragend`', () => {
    const { attributes } = classifier.classify(
      input({ shortText: 'Wand aus Beton C25/30', longText: 'Tragende Wand.', unit: 'm3' }),
    );
    expect(attributes).not.toHaveProperty('gewerk');
    expect(attributes).not.toHaveProperty('gewerkLb');
    // `tragend` ist eine Deutung — sie kommt mit dem Materialwissen, nicht von hier.
    expect(attributes).not.toHaveProperty('tragend');
    expect(attributes.beton).toBe('C25/30');
  });

  it('erkennt Stundenlohn als Personal und wählt dessen Ruleset', () => {
    const { attributes, meta } = classifier.classify(
      input({ shortText: 'Stundenlohnarbeiten Facharbeiter', unit: 'h' }),
    );
    expect(attributes.positionsart).toBe('personal');
    expect(attributes.qualifikation).toBe('Facharbeiter');
    expect(attributes.zeiteinheit).toBe('h');
    expect(attributes.bauteiltyp).toBeUndefined();
    expect(meta.ruleset).toBe('personal');
  });

  it('lässt Klassen weg, die nicht im Text stehen', () => {
    const { attributes } = classifier.classify(
      input({ shortText: 'Dachfläche', longText: 'Arbeiten am Dach, Höhe 4 m.', unit: 'm2' }),
    );
    expect(attributes.bauteiltyp).toBe('Dach');
    expect(attributes.hoehe).toBe('4 m');
    // Ohne genormte Klasse im Text bleibt der Key ganz weg statt auf null zu stehen.
    expect(attributes.beton).toBeUndefined();
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

describe('RuleBasedClassifier — Heuristik', () => {
  const classifier = getClassifier();

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
