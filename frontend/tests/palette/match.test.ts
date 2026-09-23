// Reihenfolge der Treffer in der Kommandopalette (WP-P, Schritt 1).
// Die Zusage: was vorn anfängt, steht vorn — und was ein Wort der Eingabe gar
// nicht enthält, taucht nicht auf.

import { describe, expect, it } from 'vitest';
import { commandScore, rankCommands } from '../../src/lib/palette/match';
import type { Command } from '../../src/lib/palette/commands';

function command(id: string, label: string, hint?: string): Command {
  return { id, group: 'Filter', label, hint, actions: [] };
}

const LISTE: Command[] = [
  command('a', 'Stahlbetonarbeiten'),
  command('b', 'Betonarbeiten'),
  command('c', 'Gewerk Beton'),
  command('d', 'Abdichtungsarbeiten'),
];

describe('commandScore', () => {
  it('findet unabhängig von Groß- und Kleinschreibung', () => {
    expect(commandScore('BETON', command('x', 'Betonarbeiten'))).not.toBeNull();
  });

  it('gibt null, wenn ein Wort der Eingabe fehlt', () => {
    expect(commandScore('beton stahl', command('x', 'Betonarbeiten'))).toBeNull();
  });

  it('nimmt mehrere Wörter in beliebiger Reihenfolge', () => {
    expect(commandScore('beton gewerk', command('x', 'Gewerk Betonarbeiten'))).not.toBeNull();
  });

  it('sucht auch im Hinweis — dort steht der Kurztext einer Position', () => {
    expect(
      commandScore('sohlplatte', command('x', '01.002.0030', 'Sohlplatte C30/37')),
    ).not.toBeNull();
  });

  it('nimmt eine leere Eingabe als Treffer', () => {
    expect(commandScore('   ', command('x', 'Egal'))).toBe(0);
  });
});

describe('rankCommands', () => {
  it('stellt den Wortanfang vor das bloße Enthaltensein', () => {
    const treffer = rankCommands(LISTE, 'beton', 10).map((eintrag) => eintrag.id);
    // „Betonarbeiten" und „Gewerk Beton" fangen mit dem Wort an,
    // „Stahlbetonarbeiten" hat es nur mittendrin.
    expect(treffer.indexOf('a')).toBeGreaterThan(treffer.indexOf('b'));
    expect(treffer.indexOf('a')).toBeGreaterThan(treffer.indexOf('c'));
  });

  it('lässt weg, was nicht passt', () => {
    expect(rankCommands(LISTE, 'beton', 10).map((eintrag) => eintrag.id)).not.toContain('d');
  });

  it('behält bei gleichem Rang die Reihenfolge der Liste', () => {
    // Ohne Eingabe stehen die Ansichten so, wie sie im Umschalter stehen.
    expect(rankCommands(LISTE, '', 10).map((eintrag) => eintrag.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('gibt nie mehr als die gewünschte Anzahl zurück', () => {
    expect(rankCommands(LISTE, '', 2)).toHaveLength(2);
  });
});
