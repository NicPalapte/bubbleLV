import { describe, expect, it } from 'vitest';
import { graphEdgeId, graphNodeId } from '../../src/model/graph';

describe('graphNodeId', () => {
  it('setzt Art und Schlüssel zusammen', () => {
    expect(graphNodeId('norm', 'DIN EN 1536')).toBe('norm:DIN EN 1536');
  });

  it('zieht Leerraum zusammen, damit gleiche Normen gleich heißen', () => {
    expect(graphNodeId('norm', '  DIN  EN\n1536 ')).toBe('norm:DIN EN 1536');
  });
});

describe('graphEdgeId', () => {
  it('behält die Richtung bei gerichteten Kanten', () => {
    expect(graphEdgeId('verweist_auf', 'position:b', 'kapitel:a')).toBe(
      'verweist_auf|position:b|kapitel:a',
    );
  });

  it('ist bei ungerichteten Kanten unabhängig von der Reihenfolge', () => {
    expect(graphEdgeId('widerspricht', 'position:b', 'kapitel:a')).toBe(
      graphEdgeId('widerspricht', 'kapitel:a', 'position:b'),
    );
  });
});
