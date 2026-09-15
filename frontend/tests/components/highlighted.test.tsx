// Fundstellen im Langtext (WP-J, Schritt 4): mehrere Kategorien gleichzeitig,
// je Kategorie eine Farbe, einzeln abschaltbar. Geprüft wird, dass der Text
// vollständig bleibt — eine Markierung darf nie Zeichen schlucken oder doppeln.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Highlighted } from '../../src/components/common/Highlighted';
import type { Span } from '../../src/lib/classify';

const TEXT = 'Beton C30/37 nach DIN EN 206, d = 30 cm, Fertigstellung bis 14.05.2026.';

const SPANS: Span[] = [
  {
    key: 'normen',
    start: TEXT.indexOf('DIN EN 206'),
    end: TEXT.indexOf('DIN EN 206') + 10,
    label: 'DIN EN 206',
  },
  {
    key: 'dicke',
    start: TEXT.indexOf('d = 30 cm'),
    end: TEXT.indexOf('d = 30 cm') + 9,
    label: 'd = 30 cm',
  },
  {
    key: 'fristen',
    start: TEXT.indexOf('14.05.2026'),
    end: TEXT.indexOf('14.05.2026') + 10,
    label: '14.05.2026',
  },
];

function markedKeys(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-span-key]')].map(
    (element) => element.getAttribute('data-span-key') ?? '',
  );
}

describe('Highlighted mit Fundstellen', () => {
  it('zeichnet mehrere Kategorien gleichzeitig, ohne den Text zu verändern', () => {
    const { container } = render(<Highlighted text={TEXT} spans={SPANS} />);
    expect(container.textContent).toBe(TEXT);
    expect(markedKeys(container)).toEqual(['normen', 'dicke', 'fristen']);
  });

  it('erklärt jede Fundstelle über den Titel', () => {
    render(<Highlighted text={TEXT} spans={SPANS} />);
    expect(screen.getByTitle('Normen: DIN EN 206')).toHaveTextContent('DIN EN 206');
    expect(screen.getByTitle('Zeitbezug: 14.05.2026')).toHaveTextContent('14.05.2026');
  });

  it('blendet abgeschaltete Kategorien aus, der Text bleibt vollständig', () => {
    const { container } = render(
      <Highlighted text={TEXT} spans={SPANS} activeKeys={new Set(['normen'])} />,
    );
    expect(container.textContent).toBe(TEXT);
    expect(markedKeys(container)).toEqual(['normen']);
  });

  it('zeigt ohne Fundstellen denselben Text wie bisher', () => {
    const { container } = render(<Highlighted text={TEXT} />);
    expect(container.textContent).toBe(TEXT);
    expect(markedKeys(container)).toEqual([]);
  });

  it('hebt Suchbegriff und `**…**` neben den Fundstellen weiter hervor', () => {
    const { container } = render(<Highlighted text={TEXT} spans={SPANS} query="beton" />);
    expect(container.textContent).toBe(TEXT);
    const marks = [...container.querySelectorAll('mark')];
    expect(marks.some((mark) => mark.textContent === 'Beton')).toBe(true);

    const mitStern = render(<Highlighted text="Vorher **wichtig** nachher" />);
    expect(mitStern.container.textContent).toBe('Vorher wichtig nachher');
  });

  it('hebt den Suchbegriff auch **innerhalb** einer Fundstelle hervor', () => {
    // Regression: der Inhalt einer Fundstelle wurde roh eingefügt. Wer nach
    // "din" suchte, sah den Treffer in "DIN EN 206" als einzigen im Text nicht.
    const { container } = render(<Highlighted text={TEXT} spans={SPANS} query="din" />);
    expect(container.textContent).toBe(TEXT);
    const treffer = [...container.querySelectorAll('mark')].filter(
      (mark) => mark.textContent?.toLowerCase() === 'din',
    );
    expect(treffer).toHaveLength(1);
    // Die Markierung liegt in der Fundstelle, nicht daneben.
    expect(treffer[0].closest('[data-span-key]')?.getAttribute('data-span-key')).toBe('normen');
  });

  it('überspringt Fundstellen außerhalb des Textes, statt ihn abzuschneiden', () => {
    const kaputt: Span[] = [{ key: 'normen', start: 500, end: 520, label: 'weit weg' }];
    const { container } = render(<Highlighted text={TEXT} spans={kaputt} />);
    expect(container.textContent).toBe(TEXT);
    expect(markedKeys(container)).toEqual([]);
  });
});
