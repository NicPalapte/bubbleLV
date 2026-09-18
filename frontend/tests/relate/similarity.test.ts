// Beziehungen zwischen Positionen (WP-M). Geprüft werden die Abnahmekriterien
// aus docs/implementation-plan.md:
//
//  - eine bekannte Dublette wird gefunden,
//  - bewusst unterschiedliche Positionen landen nicht im selben Cluster,
//  - ein Cluster benennt gemeinsame und unterscheidende Merkmale,
//  - 10.000 Positionen clustern in unter 3 Sekunden — auch dann, wenn jeder
//    Text eigen ist und die Abkürzung über gleiche Texte nicht greift,
//  - eine reale Datei mit wiederkehrenden Leistungen zeigt sie als Cluster.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classifyDraft, getClassifier } from '../../src/lib/classify';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { buildRelations, clusterByPosition, positionSimilarity } from '../../src/lib/relate';
import { relateTokens } from '../../src/lib/relate/text';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { buildTree } from '../../src/lib/tree/buildTree';
import { hardCaseDraft, syntheticDraft } from '../support/syntheticLv';
import type { PositionIndex } from '../../src/lib/index/positionIndex';
import type { RelationResult } from '../../src/lib/relate';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';

const WAND_LANG = [
  'Herstellen einer tragenden Innenwand aus Beton einschließlich Schalung,',
  'Bewehrung und Nachbehandlung. Abrechnung nach Aufmaß.',
].join(' ');

function position(overrides: Partial<PositionDraft>): PositionDraft {
  return {
    oz: '01.001.0010',
    shortText: 'Innenwand herstellen',
    longText: WAND_LANG,
    unit: 'm3',
    quantity: 10,
    unitPrice: 100,
    positionType: 'NORMAL',
    attributes: { gewerk: 'Betonarbeiten', bauteiltyp: 'Wand' },
    ...overrides,
  };
}

function draftOf(positions: PositionDraft[]): LVDraft {
  return {
    projectName: 'Beziehungs-Test',
    client: null,
    lots: [
      {
        number: '01',
        label: 'Los',
        sections: [{ number: '01.001', label: 'Abschnitt', sections: [], positions }],
      },
    ],
  };
}

/**
 * LV durch die ganze Pipeline: die Merkmale, gegen die verglichen wird, stammen
 * aus der Klassifizierung — so, wie es beim Import auch läuft.
 */
function indexOf(positions: PositionDraft[]) {
  return buildPositionIndex(buildTree(classifyDraft(draftOf(positions), getClassifier())));
}

/**
 * LV **ohne** Klassifizierung. Für die Tests der Vorgruppierung: dort müssen
 * Gewerk und Bauteiltyp genau die Werte haben, die der Test setzt — der
 * Klassifizierer würde sie aus dem Text neu ableiten.
 */
function rohIndexOf(positions: PositionDraft[]) {
  return buildPositionIndex(buildTree(draftOf(positions)));
}

function relationsOf(...positions: PositionDraft[]): RelationResult {
  return buildRelations(indexOf(positions));
}

/** Stehen die beiden OZ in derselben Gruppe? */
function zusammen(result: RelationResult, a: string, b: string): boolean {
  return result.clusters.some((cluster) => {
    const ids = cluster.positionIds.join(' ');
    return ids.includes(a) && ids.includes(b);
  });
}

describe('Dubletten und Varianten', () => {
  it('findet die wortgleiche Dublette', () => {
    const result = relationsOf(position({ oz: '01.001.0010' }), position({ oz: '01.001.0020' }));
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].positionIds).toHaveLength(2);
    expect(result.clusters[0].similarity).toBe(1);
    expect(result.clustered).toBe(2);
    expect(result.total).toBe(2);
  });

  it('nimmt die Variante mit anderer Dicke dazu und benennt den Unterschied', () => {
    const result = relationsOf(
      position({ oz: '01.001.0010', longText: `${WAND_LANG} Dicke 24 cm.` }),
      position({ oz: '01.001.0020', longText: `${WAND_LANG} Dicke 30 cm.` }),
    );
    expect(result.clusters).toHaveLength(1);
    const [cluster] = result.clusters;
    // Die Dicke kommt aus dem Extraktor (WP-J) und ist das, was die beiden
    // auseinanderhält; alles andere teilen sie.
    expect(cluster.gemeinsameMerkmale.bauteiltyp).toBe('Wand');
    expect(cluster.gemeinsameMerkmale.einheit).toBe('m³');
    expect(cluster.unterscheidendeMerkmale).toContain('dicke');
    expect(cluster.gemeinsameMerkmale.dicke).toBeUndefined();
  });

  it('merkt sich einen abweichenden Kurztext als Unterschied', () => {
    const result = relationsOf(
      position({ oz: '01.001.0010', shortText: 'Innenwand herstellen' }),
      position({ oz: '01.001.0020', shortText: 'Innenwand herstellen, tragend' }),
    );
    expect(result.clusters[0].unterscheidendeMerkmale).toContain('kurztext');
  });

  it('benennt die Gruppe mit dem häufigsten Kurztext aus der Datei', () => {
    const result = relationsOf(
      position({ oz: '01.001.0010', shortText: 'Innenwand herstellen' }),
      position({ oz: '01.001.0020', shortText: 'Innenwand herstellen' }),
      position({ oz: '01.001.0030', shortText: 'Innenwand herstellen, tragend' }),
    );
    expect(result.clusters[0].label).toBe('Innenwand herstellen');
  });
});

describe('Was nicht zusammengehört, bleibt getrennt', () => {
  it('lässt inhaltlich verschiedene Leistungen auseinander', () => {
    const result = relationsOf(
      position({ oz: '01.001.0010' }),
      position({
        oz: '01.001.0020',
        shortText: 'Baugrube ausheben',
        longText: 'Ausheben der Baugrube in Bodenklasse 3 bis 4, Abtransport und Entsorgung.',
        attributes: { gewerk: 'Betonarbeiten', bauteiltyp: 'Wand' },
      }),
    );
    expect(zusammen(result, '01.001.0010', '01.001.0020')).toBe(false);
  });

  it('vergleicht nie über Gewerk, Einheit oder Bauteiltyp hinweg', () => {
    // Vier wortgleiche Positionen, die sich nur in je einem Gruppenmerkmal
    // unterscheiden — keine zwei davon dürfen zusammenkommen.
    const result = buildRelations(
      rohIndexOf([
        position({ oz: '01.001.0010' }),
        position({ oz: '01.001.0020', unit: 'm2' }),
        position({
          oz: '01.001.0030',
          attributes: { gewerk: 'Mauerarbeiten', bauteiltyp: 'Wand' },
        }),
        position({
          oz: '01.001.0040',
          attributes: { gewerk: 'Betonarbeiten', bauteiltyp: 'Decke' },
        }),
      ]),
    );
    expect(result.clusters).toHaveLength(0);
  });

  it('übergeht Positionen ohne Text, statt sie zu bündeln', () => {
    const result = relationsOf(
      position({ oz: '01.001.0010', shortText: '', longText: '' }),
      position({ oz: '01.001.0020', shortText: '', longText: '' }),
    );
    expect(result.clusters).toHaveLength(0);
    expect(result.total).toBe(2);
  });
});

describe('Schwellwert', () => {
  it('ist einstellbar und trennt bei hoher Anforderung auch Varianten', () => {
    const positions = [
      position({ oz: '01.001.0010', shortText: 'Innenwand herstellen' }),
      position({
        oz: '01.001.0020',
        shortText: 'Innenwand herstellen',
        longText: `${WAND_LANG} Zusätzlich mit Sichtbetonanforderung SB 3 nach Merkblatt.`,
      }),
    ];
    const index = indexOf(positions);
    expect(buildRelations(index, { threshold: 0.5 }).clusters).toHaveLength(1);
    expect(buildRelations(index, { threshold: 0.99 }).clusters).toHaveLength(0);
  });

  it('gibt den verwendeten Schwellwert mit heraus', () => {
    expect(relationsOf(position({})).threshold).toBeGreaterThan(0);
  });
});

describe('Ausreißer', () => {
  /** Vier gleiche Preise plus einer, der weit darüber liegt. */
  function preisgruppe(extra: number): RelationResult {
    return relationsOf(
      position({ oz: '01.001.0010', unitPrice: 100 }),
      position({ oz: '01.001.0020', unitPrice: 105 }),
      position({ oz: '01.001.0030', unitPrice: 110 }),
      position({ oz: '01.001.0040', unitPrice: 115 }),
      position({ oz: '01.001.0050', unitPrice: extra }),
    );
  }

  it('meldet den Einheitspreis, der aus dem Rahmen fällt', () => {
    const [cluster] = preisgruppe(900).clusters;
    const ep = cluster.ausreisser.filter((outlier) => outlier.field === 'ep');
    expect(ep).toHaveLength(1);
    expect(ep[0].positionId).toContain('01.001.0050');
    expect(ep[0].direction).toBe('hoch');
    expect(ep[0].median).toBe(110);
  });

  it('schweigt, solange die Preise beieinanderliegen', () => {
    const [cluster] = preisgruppe(120).clusters;
    expect(cluster.ausreisser.filter((outlier) => outlier.field === 'ep')).toHaveLength(0);
  });

  it('schweigt bei zu kleiner Gruppe — zwei Werte haben keine Quartile', () => {
    const result = relationsOf(
      position({ oz: '01.001.0010', unitPrice: 100 }),
      position({ oz: '01.001.0020', unitPrice: 9000 }),
    );
    expect(result.clusters[0].ausreisser).toHaveLength(0);
  });

  it('meldet auch eine Menge, die aus dem Rahmen fällt', () => {
    const result = relationsOf(
      position({ oz: '01.001.0010', quantity: 10 }),
      position({ oz: '01.001.0020', quantity: 12 }),
      position({ oz: '01.001.0030', quantity: 14 }),
      position({ oz: '01.001.0040', quantity: 16 }),
      position({ oz: '01.001.0050', quantity: 5000 }),
    );
    const mengen = result.clusters[0].ausreisser.filter((outlier) => outlier.field === 'menge');
    expect(mengen).toHaveLength(1);
    expect(mengen[0].positionId).toContain('01.001.0050');
  });

  it('kennt ohne Preise keine Preis-Kennzahlen', () => {
    const result = relationsOf(
      position({ oz: '01.001.0010', unitPrice: null }),
      position({ oz: '01.001.0020', unitPrice: null }),
    );
    expect(result.clusters[0].unitPrice).toBeNull();
    expect(result.clusters[0].quantity).not.toBeNull();
  });
});

describe('positionSimilarity', () => {
  it('gibt 1 für dieselbe Position und weniger für eine andere', () => {
    const index = indexOf([
      position({ oz: '01.001.0010' }),
      position({ oz: '01.001.0020', shortText: 'Baugrube ausheben' }),
    ]);
    const [a, b] = index.positions;
    expect(positionSimilarity(a, a)).toBe(1);
    expect(positionSimilarity(a, b)).toBeLessThan(1);
  });
});

describe('Reale Datei', () => {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  const lv = runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );

  it('zeigt die wiederkehrenden Leistungen der Musterdatei als Gruppen', () => {
    expect(lv.relations.clusters.length).toBeGreaterThan(0);
    expect(lv.relations.total).toBeGreaterThan(0);
    for (const cluster of lv.relations.clusters) {
      expect(cluster.positionIds.length).toBeGreaterThanOrEqual(2);
      // Jede Gruppe sagt, worin ihre Mitglieder übereinstimmen.
      expect(Object.keys(cluster.gemeinsameMerkmale).length).toBeGreaterThan(0);
    }
  });

  it('gibt jedes Sprungziel als Position im Baum her', () => {
    const ids = new Set(lv.relations.clusters.flatMap((cluster) => cluster.positionIds));
    const imBaum = new Set(buildPositionIndex(lv.tree).nodes.map((node) => node.id));
    for (const id of ids) expect(imBaum.has(id)).toBe(true);
  });

  it('ordnet jede Position höchstens einer Gruppe zu', () => {
    const map = clusterByPosition(lv.relations);
    const gezaehlt = lv.relations.clusters.reduce(
      (sum, cluster) => sum + cluster.positionIds.length,
      0,
    );
    expect(map.size).toBe(gezaehlt);
    expect(gezaehlt).toBe(lv.relations.clustered);
  });
});

describe('Laufzeit', () => {
  /** Zusage aus dem Plan: 10k Positionen clustern in unter 3 Sekunden. */
  const BUDGET_MS = 3000;

  /** Verschiedene normalisierte Texte — so viele Stellvertreter entstehen. */
  function signaturen(index: PositionIndex): number {
    const gesehen = new Set<string>();
    for (const position of index.positions) {
      gesehen.add(
        `${relateTokens(position.shortText).join(' ')}|${relateTokens(position.longText).join(' ')}`,
      );
    }
    return gesehen.size;
  }

  it('clustert ein LV mit viel Wiederholung innerhalb des Budgets', () => {
    // Der leichte Weg: dieselben Texte immer wieder. Die Signatur-Stufe fasst
    // sie zusammen, bevor überhaupt verglichen wird.
    const index = buildPositionIndex(buildTree(syntheticDraft(10_000)));
    const started = performance.now();
    const result = buildRelations(index);
    const dauer = performance.now() - started;
    expect(dauer).toBeLessThan(BUDGET_MS);
    expect(result.clusters.length).toBeGreaterThan(0);
  });

  it('clustert 10.000 verschiedene Texte in einer Vorgruppe im Budget', () => {
    // Der teure Weg, und der einzige, der den invertierten Index wirklich
    // fordert: 300 Wandtypen à 33 Varianten, alle unter demselben Gewerk, in
    // derselben Einheit und mit demselben Bauteiltyp — und **jeder Text
    // eigen**. Genau hier wäre ein All-Paare-Vergleich unbezahlbar.
    const index = buildPositionIndex(buildTree(hardCaseDraft(300, 33)));

    // Die Voraussetzung selbst prüfen: kollabieren die Texte doch wieder auf
    // wenige Signaturen, misst der Test nicht mehr, was er behauptet.
    expect(signaturen(index)).toBe(index.size);
    expect(index.size).toBe(9900);

    const started = performance.now();
    const result = buildRelations(index);
    expect(performance.now() - started).toBeLessThan(BUDGET_MS);

    // Und das Ergebnis stimmt: jede Familie wird eine Gruppe, keine zwei
    // Familien fallen zusammen.
    expect(result.clusters).toHaveLength(300);
    expect(result.clustered).toBe(index.size);
  });
});
