import { describe, expect, it } from 'vitest';
import { graphEdgeId, graphNodeId } from '../../src/model/graph';

describe('graphNodeId', () => {
  it('setzt Art und Schlüssel zusammen', () => {
    expect(graphNodeId('norm', 'DIN EN 1536')).toBe('norm:DIN EN 1536');
  });

  it('zieht Leerraum zusammen, damit gleiche Normen gleich heißen', () => {
    expect(graphNodeId('norm', '  DIN  EN\n1536 ')).toBe('norm:DIN EN 1536');
  });

  it('ignoriert Groß-/Kleinschreibung bei Normen', () => {
    expect(graphNodeId('norm', 'din en 1536')).toBe(graphNodeId('norm', 'DIN EN 1536'));
  });

  it('lässt Groß-/Kleinschreibung bei anderen Arten stehen', () => {
    expect(graphNodeId('position', 'aB12')).toBe('position:aB12');
  });

  it('maskiert das Kanten-Trennzeichen im Schlüssel', () => {
    expect(graphNodeId('kapitel', 'a|b')).toBe('kapitel:a%7Cb');
    expect(graphNodeId('kapitel', 'a%7Cb')).toBe('kapitel:a%257Cb');
  });
});

describe('graphEdgeId', () => {
  it('behält die Richtung bei gerichteten Kanten', () => {
    expect(graphEdgeId('verweist_auf', 'position:b', 'kapitel:a')).toBe(
      'verweist_auf|position:b|kapitel:a',
    );
  });

  it('ist bei ungerichteten Kanten unabhängig von der Reihenfolge', () => {
    expect(graphEdgeId('weicht_ab_von', 'position:b', 'kapitel:a')).toBe(
      graphEdgeId('weicht_ab_von', 'kapitel:a', 'position:b'),
    );
  });

  it('bildet verschiedene Kanten nie auf dieselbe ID ab', () => {
    const a = graphEdgeId(
      'verweist_auf',
      graphNodeId('kapitel', 'x|y'),
      graphNodeId('kapitel', 'z'),
    );
    const b = graphEdgeId(
      'verweist_auf',
      graphNodeId('kapitel', 'x'),
      graphNodeId('kapitel', 'y|z'),
    );
    expect(a).not.toBe(b);
  });
});
