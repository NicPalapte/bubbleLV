// Befehle der Kommandopalette (WP-P, Schritt 1). Geprüft wird, was ein Befehl
// **tut** — die Aktionen stehen als Daten im Befehl, dafür braucht es keine
// Oberfläche.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildCommands,
  groupOrder,
  positionCommand,
  type Command,
} from '../../src/lib/palette/commands';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { EMPTY_FILTERS, type Filters } from '../../src/lib/matchPos';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();
const index = buildPositionIndex(lv.tree);

function befehle(overrides: Partial<Parameters<typeof buildCommands>[0]> = {}): Command[] {
  return buildCommands({
    summary: lv.summary,
    filters: EMPTY_FILTERS,
    search: '',
    hideMode: 'dim',
    view: 'overview',
    ...overrides,
  });
}

function mitId(liste: Command[], id: string): Command {
  const command = liste.find((eintrag) => eintrag.id === id);
  expect(command, `Befehl ${id} fehlt`).toBeDefined();
  return command as Command;
}

describe('buildCommands · Ansicht', () => {
  it('bietet jede der sieben Ansichten an', () => {
    const ansichten = befehle().filter((command) => command.group === 'Ansicht');
    expect(ansichten.map((command) => command.label)).toEqual([
      'Überblick',
      'Graph',
      'Tabelle',
      'Matrix',
      'Ähnlichkeit',
      'Vergleich',
      'Prüfung',
    ]);
  });

  it('wechselt die Ansicht und lässt Filter und Auswahl in Ruhe', () => {
    // Ein Ansichtswechsel ändert nie Filter, Suche oder Auswahl
    // (.claude/CLAUDE.md#kritische-constraints).
    expect(mitId(befehle(), 'view:matrix').actions).toEqual([
      { type: 'setViewMode', mode: 'matrix' },
    ]);
  });

  it('markiert die Ansicht, in der man schon steht', () => {
    const command = mitId(befehle({ view: 'graph' }), 'view:graph');
    expect(command.on).toBe(true);
    expect(command.hint).toBe('aktiv');
  });
});

describe('buildCommands · Filter', () => {
  it('bietet jeden Facettenwert mit seiner Anzahl an', () => {
    const gewerke = lv.summary.facets.get('gewerk');
    expect(gewerke, 'Fixture ohne Gewerke').toBeDefined();
    const [wert, anzahl] = [...(gewerke as ReadonlyMap<string, number>)][0];
    const command = mitId(befehle(), `facet:gewerk:${wert}`);
    expect(command.label).toContain(wert);
    expect(command.label).toContain('Gewerk');
    expect(command.hint).toBe(String(anzahl));
  });

  it('schaltet einen gesetzten Wert wieder ab', () => {
    const gewerke = [...(lv.summary.facets.get('gewerk') as ReadonlyMap<string, number>)];
    const [erster] = gewerke[0];
    const gesetzt: Filters = { facets: { gewerk: new Set([erster]) }, menge: null };
    const command = mitId(befehle({ filters: gesetzt }), `facet:gewerk:${erster}`);
    expect(command.on).toBe(true);
    expect(command.actions).toEqual([{ type: 'setFacet', facetId: 'gewerk', values: new Set() }]);
  });

  it('nimmt einen zweiten Wert derselben Facette dazu, statt ihn zu ersetzen', () => {
    const gewerke = [...(lv.summary.facets.get('gewerk') as ReadonlyMap<string, number>)];
    if (gewerke.length < 2) return;
    const [erster] = gewerke[0];
    const [zweiter] = gewerke[1];
    const gesetzt: Filters = { facets: { gewerk: new Set([erster]) }, menge: null };
    const command = mitId(befehle({ filters: gesetzt }), `facet:gewerk:${zweiter}`);
    expect(command.actions).toEqual([
      { type: 'setFacet', facetId: 'gewerk', values: new Set([erster, zweiter]) },
    ]);
  });

  it('bietet das Zurücksetzen erst an, wenn es etwas zurückzusetzen gibt', () => {
    expect(befehle().some((command) => command.id === 'filter:reset')).toBe(false);
    const gesetzt: Filters = { facets: { einheit: new Set(['m3']) }, menge: null };
    expect(mitId(befehle({ filters: gesetzt }), 'filter:reset').actions).toEqual([
      { type: 'resetFilters' },
    ]);
  });

  it('bietet das Leeren der Suche erst an, wenn eine Suche läuft', () => {
    expect(befehle().some((command) => command.id === 'filter:clearSearch')).toBe(false);
    const command = mitId(befehle({ search: 'Beton' }), 'filter:clearSearch');
    expect(command.hint).toBe('Beton');
    expect(command.actions).toEqual([{ type: 'search', value: '' }]);
  });

  it('bietet immer den jeweils anderen Umgang mit Nicht-Treffern an', () => {
    expect(mitId(befehle({ hideMode: 'dim' }), 'filter:hideMode:hide').label).toBe(
      'Nicht-Treffer ausblenden',
    );
    expect(mitId(befehle({ hideMode: 'hide' }), 'filter:hideMode:dim').label).toBe(
      'Nicht-Treffer dämpfen',
    );
  });
});

describe('positionCommand', () => {
  const node = index.nodes[0];

  it('wählt die Position und geht in die Tabelle — sonst bliebe der Sprung unsichtbar', () => {
    const command = positionCommand(node, null, 'matrix');
    expect(command.actions).toEqual([
      { type: 'selectPosition', nodeId: null, positionId: node.id },
      { type: 'setViewMode', mode: 'table' },
    ]);
  });

  it('bleibt im Graphen, der die Auswahl selbst zeigt', () => {
    expect(positionCommand(node, null, 'graph').actions).toEqual([
      { type: 'selectPosition', nodeId: null, positionId: node.id },
    ]);
  });

  it('trägt OZ und Kurztext im Text — getippt wird mal das eine, mal das andere', () => {
    const command = positionCommand(node, null, 'table');
    expect(command.label).toContain(node.position?.oz);
    expect(command.label).toContain(node.position?.shortText.slice(0, 8));
  });
});

describe('groupOrder', () => {
  it('stellt Positionen nach vorn, sobald eine Nummer getippt wird', () => {
    expect(groupOrder('001.004')[0]).toBe('Position');
    expect(groupOrder('  7')[0]).toBe('Position');
  });

  it('stellt sonst die Befehle nach vorn', () => {
    // „gewerk" meint den Gewerkefilter, nicht die Position, in deren Kurztext
    // zufällig „Baunebengewerk" steht.
    expect(groupOrder('gewerk')[0]).toBe('Ansicht');
    expect(groupOrder('')[0]).toBe('Ansicht');
  });
});
