// Modell der Ansicht „Matrix" (WP-O). Geprüft werden die Zusagen aus dem Plan:
// zwei frei wählbare Achsen, umschaltbarer Zellwert, leere Zellen bleiben leer
// — und die beiden Rückfälle, die die Zahlen ehrlich halten.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildMatrix,
  cellKey,
  COLLECTED_KEY,
  MAX_AXIS_VALUES,
  NO_VALUE_KEY,
  type MatrixModel,
} from '../../src/lib/matrix/model';
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

function maskFor(filters: Filters = EMPTY_FILTERS, search = ''): Uint8Array {
  return filterMask(index, prepareFilters(filters, search));
}

function matrix(
  rowFacetId = 'gewerk',
  colFacetId = 'bauteiltyp',
  measure: 'anzahl' | 'menge' | 'summe' = 'anzahl',
  mask: Uint8Array | null = null,
): MatrixModel {
  return buildMatrix({ index, mask, rowFacetId, colFacetId, measure });
}

/** Wert einer Zelle über die Beschriftungen der Achsen. */
function zelle(model: MatrixModel, row: string, col: string) {
  const r = model.rows.findIndex((entry) => entry.label === row);
  const c = model.cols.findIndex((entry) => entry.label === col);
  return model.cells.get(cellKey(r, c));
}

describe('buildMatrix · Musterdatei', () => {
  it('spannt beide Achsen aus den vorkommenden Facettenwerten auf', () => {
    const model = matrix();
    expect(model.rows.length).toBeGreaterThan(0);
    expect(model.cols.length).toBeGreaterThan(0);
    expect(model.positions).toBe(index.size);
  });

  it('zählt jede Position genau einmal, solange beide Achsen einwertig sind', () => {
    const model = matrix('gewerk', 'einheit');
    const summe = [...model.cells.values()].reduce((sum, cell) => sum + cell.count, 0);
    expect(summe).toBe(index.size);
    expect(model.multiValued).toBe(false);
  });

  it('lässt leere Zellen leer, statt sie mit 0 zu füllen', () => {
    const model = matrix();
    // Ein volles Raster hätte Zeilen × Spalten Zellen; ein LV füllt nie alle.
    expect(model.cells.size).toBeLessThan(model.rows.length * model.cols.length);
    // Und die fehlenden Zellen stehen nicht als 0 im Modell.
    expect([...model.cells.values()].every((cell) => cell.count > 0)).toBe(true);
  });

  it('rechnet nur über die gefilterte Menge', () => {
    const ganz = matrix();
    const gefiltert = matrix('gewerk', 'bauteiltyp', 'anzahl', maskFor(EMPTY_FILTERS, 'Beton'));
    expect(gefiltert.positions).toBeGreaterThan(0);
    expect(gefiltert.positions).toBeLessThan(ganz.positions);
  });

  it('ordnet die Achsen nach Positionszahl, nicht nach dem Zellwert', () => {
    const nachAnzahl = matrix('gewerk', 'bauteiltyp', 'anzahl');
    const nachSumme = matrix('gewerk', 'bauteiltyp', 'summe');
    // Der Zellwert wechselt, die Achsen bleiben stehen — sonst verlöre man
    // beim Umschalten die Stelle, die man gerade ansieht.
    expect(nachSumme.rows.map((entry) => entry.label)).toEqual(
      nachAnzahl.rows.map((entry) => entry.label),
    );
  });
});

// ── Ohne Angabe, Sammelzeile, Rückfälle ──────────────────────────────────────

function position(oz: string, overrides: Partial<PositionDraft> = {}): PositionDraft {
  return {
    oz,
    shortText: 'Wand herstellen',
    longText: 'Herstellen einer Wand.',
    unit: 'm3',
    quantity: 10,
    unitPrice: 100,
    positionType: 'NORMAL',
    attributes: { gewerk: 'Betonarbeiten', bauteiltyp: 'Wand' },
    ...overrides,
  };
}

function draft(positions: readonly PositionDraft[]): LVDraft {
  return {
    projectName: 'Matrix-Test',
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

function modelOf(
  positions: readonly PositionDraft[],
  rowFacetId = 'gewerk',
  colFacetId = 'bauteiltyp',
  measure: 'anzahl' | 'menge' | 'summe' = 'anzahl',
): MatrixModel {
  // Baum direkt statt über `classifyAndBuild`: die Klassifizierung ersetzt
  // `attributes` komplett durch ihr eigenes Ergebnis — die Facettenwerte, um
  // die es hier geht, wären dann nicht mehr die gesetzten.
  const kleinerIndex = buildPositionIndex(buildTree(draft(positions)));
  return buildMatrix({ index: kleinerIndex, mask: null, rowFacetId, colFacetId, measure });
}

describe('buildMatrix · Ohne Angabe und Sammelwerte', () => {
  it('gibt Positionen ohne Wert eine eigene Zeile statt sie wegzulassen', () => {
    const model = modelOf([
      position('001.0010'),
      position('001.0020', { attributes: { bauteiltyp: 'Wand' } }),
    ]);
    const ohne = model.rows.find((entry) => entry.key === NO_VALUE_KEY);
    expect(ohne?.label).toBe('Ohne Angabe');
    expect(ohne?.count).toBe(1);
    // …und sie ist nicht als Filter setzbar: es gibt keinen Facettenwert dafür.
    expect(ohne?.filterable).toBe(false);
  });

  it('fasst zusammen, was über die Achsengrenze hinausgeht', () => {
    const viele = Array.from({ length: MAX_AXIS_VALUES + 3 }, (_, i) =>
      position(`001.00${10 + i}`, {
        attributes: { gewerk: `Gewerk ${String(i).padStart(2, '0')}`, bauteiltyp: 'Wand' },
      }),
    );
    const model = modelOf(viele);
    expect(model.rows).toHaveLength(MAX_AXIS_VALUES + 1);
    const sammel = model.rows[model.rows.length - 1];
    expect(sammel.key).toBe(COLLECTED_KEY);
    expect(sammel.count).toBe(3);
    expect(sammel.filterable).toBe(false);
  });

  it('zählt den Beitrag je Achse einmal, nicht je Zellkombination', () => {
    const model = modelOf(
      [position('001.0010', { attributes: { gewerk: 'Betonarbeiten', expo: ['XC1', 'XF3'] } })],
      'expo',
      'gewerk',
    );
    // Die Spalte ist einwertig: ihre Randsumme ist 1, auch wenn die Position
    // in zwei Zeilen steht.
    expect(model.cols.map((entry) => entry.value)).toEqual([1]);
    // Die mehrwertige Achse trägt in jeder ihrer Zeilen — so ist die Regel.
    expect(model.rows.map((entry) => entry.value)).toEqual([1, 1]);
    // Und die Gesamtsumme zählt die Position genau einmal.
    expect(model.total).toBe(1);
  });

  it('zählt auch Geldsummen am Rand nur einmal je Position', () => {
    const model = modelOf(
      [
        position('001.0010', {
          quantity: 2,
          unitPrice: 50,
          attributes: { gewerk: 'Betonarbeiten', expo: ['XC1', 'XF3'] },
        }),
      ],
      'expo',
      'gewerk',
      'summe',
    );
    expect(model.cols[0].value).toBe(100);
    expect(model.total).toBe(100);
  });

  it('zählt eine Position in jeder Zeile, in die sie gehört — und sagt es', () => {
    const model = modelOf(
      [position('001.0010', { attributes: { gewerk: 'Betonarbeiten', expo: ['XC1', 'XF3'] } })],
      'expo',
      'gewerk',
    );
    expect(model.multiValued).toBe(true);
    expect(model.positions).toBe(1);
    const summe = [...model.cells.values()].reduce((sum, cell) => sum + cell.count, 0);
    expect(summe).toBe(2);
  });
});

describe('buildMatrix · Rückfälle des Zellwerts', () => {
  it('fällt ohne Treffer gar nicht zurück — dort gibt es nichts zu begründen', () => {
    const leer = maskFor(EMPTY_FILTERS, 'zzz-kein-treffer-zzz');
    const model = matrix('gewerk', 'bauteiltyp', 'summe', leer);
    expect(model.positions).toBe(0);
    // Ohne Position ist weder „mischt Einheiten" noch „führt keine Preise"
    // der Grund — der Leerzustand sagt den richtigen.
    expect(model.measure).toBe('summe');
  });

  it('fällt auf Anzahl zurück, sobald mehrere Einheiten im Filter stehen', () => {
    const model = modelOf(
      [position('001.0010'), position('001.0020', { unit: 'm2' })],
      'gewerk',
      'bauteiltyp',
      'menge',
    );
    // m³ und m² zu einer Zahl zu addieren ergäbe nichts (Entscheidung 0019).
    expect(model.measure).toBe('anzahl');
    expect(model.unit).toBeNull();
  });

  it('rechnet Mengen, solange nur eine Einheit vorkommt', () => {
    const model = modelOf(
      [position('001.0010'), position('001.0020', { quantity: 5 })],
      'gewerk',
      'bauteiltyp',
      'menge',
    );
    expect(model.measure).toBe('menge');
    expect(model.unit).toBe('m³');
    expect(zelle(model, 'Betonarbeiten', 'Wand')?.value).toBe(15);
  });

  it('fällt auf Anzahl zurück, wenn die Datei keine Preise führt', () => {
    const model = modelOf(
      [position('001.0010', { unitPrice: null }), position('001.0020', { unitPrice: null })],
      'gewerk',
      'bauteiltyp',
      'summe',
    );
    expect(model.hasPrices).toBe(false);
    expect(model.measure).toBe('anzahl');
  });

  it('summiert Menge × Einheitspreis, wenn die Datei Preise führt', () => {
    const model = modelOf(
      [position('001.0010'), position('001.0020', { quantity: 2, unitPrice: 50 })],
      'gewerk',
      'bauteiltyp',
      'summe',
    );
    expect(model.measure).toBe('summe');
    expect(zelle(model, 'Betonarbeiten', 'Wand')?.value).toBe(1100);
  });

  it('zählt eine fehlende Menge nicht als 0 mit', () => {
    const model = modelOf(
      [position('001.0010'), position('001.0020', { quantity: null })],
      'gewerk',
      'bauteiltyp',
      'menge',
    );
    const zell = zelle(model, 'Betonarbeiten', 'Wand');
    expect(zell?.count).toBe(2);
    expect(zell?.value).toBe(10);
  });
});
