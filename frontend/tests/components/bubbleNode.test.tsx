// Knoten-Darstellung im Graphen (Issue #41, WP-41-4): Positionen einheitlich
// ohne Rand, Nummern auch bei kleinen Bubbles lesbar, nur die eigene Ebene.

import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BubbleNode } from '../../src/components/graph/BubbleNode';
import { MARK_AT_PX, RADII, marksVisible } from '../../src/lib/graph/constants';
import type { FlagSeverity } from '../../src/lib/check';
import { codeLabelFor } from '../../src/lib/graph/labels';
import type { PlacedNode } from '../../src/lib/graph/layoutRadial';
import type { LVNode } from '../../src/types/lvNode';

/** Wie `BubbleNode` den Klick meldet — mit den Zusatztasten (WP-N). */
type BubbleClick = (event: { ctrlKey: boolean; metaKey: boolean }) => void;

function node(kind: LVNode['kind'], code: string, ownCode: string, label: string | null): LVNode {
  return {
    id: `${kind}:${code}`,
    kind,
    code,
    ownCode,
    label,
    positionCount: 1,
    totalPrice: 0,
    children: [],
    position:
      kind === 'position'
        ? {
            oz: code,
            shortText: label ?? '',
            longText: '',
            unit: null,
            quantity: null,
            unitPrice: null,
            positionType: 'NORMAL',
            attributes: {},
          }
        : null,
  };
}

function placed(id: string, tier: PlacedNode['tier']): PlacedNode {
  return {
    id,
    node: null,
    tier,
    cx: 0,
    cy: 0,
    angle: 0,
    radius: 0,
    depth: 1,
    cloudOf: null,
    clusterOf: null,
    clusterCount: 0,
  };
}

const noop = (): void => {};

function renderBubble(
  target: LVNode,
  tier: PlacedNode['tier'],
  zoom: number,
  radius: number,
  onClick: BubbleClick = noop,
  hint?: FlagSeverity,
) {
  return render(
    <svg>
      <BubbleNode
        placed={placed(target.id, tier)}
        node={target}
        zoom={zoom}
        dimmed={false}
        hidden={false}
        hovered={false}
        focused={false}
        onHover={noop}
        onClick={onClick}
        radius={radius}
        subLabel="3 Pos."
        hint={hint}
      />
    </svg>,
  );
}

describe('codeLabelFor', () => {
  it('zeigt nur die Nummer der eigenen Ebene', () => {
    expect(codeLabelFor(node('section', '01.07', '07', 'Verbau'), 'subsection')).toBe('§ 07');
    expect(codeLabelFor(node('lot', '001', '001', 'Los'), 'lot')).toBe('LOS 001');
    expect(codeLabelFor(node('lot', '', '', 'Los'), 'lot')).toBe('LOS');
    expect(codeLabelFor(node('position', '01.07.0010', '0010', 'Pos'), 'position')).toBe('0010');
  });
});

describe('BubbleNode', () => {
  it('zeichnet eine Position als gefüllten Kreis ohne Rand', () => {
    const { container } = renderBubble(
      node('position', '01.07.0010', '0010', 'Wand'),
      'position',
      1,
      8,
    );
    const circle = container.querySelector('circle');
    expect(circle).not.toBeNull();
    expect(circle?.getAttribute('fill')).toBe('var(--bub-position-line)');
    expect(circle?.getAttribute('stroke')).toBe('none');
  });

  it('beschriftet eine kleine Bubble außen mit ihrer Nummer, bildschirmfest', () => {
    // Radius 22 bei Zoom 0,2 = 4,4 px auf dem Schirm — innen passt keine Schrift.
    const { container } = renderBubble(
      node('section', '01.07', '07', 'Verbauten und Baubehelfe'),
      'subsection',
      0.2,
      22,
    );
    const texts = [...container.querySelectorAll('text')];
    const code = texts.find((text) => text.textContent === '§ 07');
    expect(code).toBeDefined();
    // 10 px auf dem Schirm ⇒ 50 Welteinheiten bei Zoom 0,2; unterhalb der Bubble.
    expect(Number(code?.getAttribute('font-size'))).toBeCloseTo(50, 5);
    expect(Number(code?.getAttribute('y'))).toBeGreaterThan(22);
    // Der Titel bliebe bei so kleinem Zoom weg — er stünde über den Nachbarn.
    expect(texts.some((text) => text.textContent?.startsWith('Verbauten'))).toBe(false);
  });

  it('meldet Strg- und Cmd-Klick weiter (WP-N)', () => {
    // Der Graph unterscheidet daran, ob eine Position in den Vergleich soll
    // oder die Auswahlkarte aufgeht.
    const klicks: Array<{ ctrlKey: boolean; metaKey: boolean }> = [];
    const position = node('position', '01.07.0010', '0010', 'Estrichdämmung verlegen');
    const { container } = renderBubble(position, 'position', 1, RADII.position, (event) =>
      klicks.push({ ctrlKey: event.ctrlKey, metaKey: event.metaKey }),
    );
    const bubble = container.querySelector('[data-tier="position"]') as SVGGElement;

    fireEvent.click(bubble);
    fireEvent.click(bubble, { ctrlKey: true });
    fireEvent.click(bubble, { metaKey: true });

    expect(klicks).toEqual([
      { ctrlKey: false, metaKey: false },
      { ctrlKey: true, metaKey: false },
      { ctrlKey: false, metaKey: true },
    ]);
  });

  it('schreibt ab genug Abstand ein Stichwort an die Position (WP-Q)', () => {
    // CLOUD_SPACING (17,6) × Zoom muss über KEYWORD_AT_PX (40) liegen.
    const position = node('position', '01.07.0010', '0010', 'Estrichdämmung verlegen');
    const { container } = renderBubble(position, 'position', 3, RADII.position);
    const texts = [...container.querySelectorAll('text')].map((text) => text.textContent);
    expect(texts).toContain('Estrichdämmung');
  });

  it('lässt das Stichwort weg, solange die Punkte zu dicht stehen', () => {
    const position = node('position', '01.07.0010', '0010', 'Estrichdämmung verlegen');
    const { container } = renderBubble(position, 'position', 1, RADII.position);
    const texts = [...container.querySelectorAll('text')].map((text) => text.textContent);
    expect(texts).not.toContain('Estrichdämmung');
  });

  it('zeigt die Nummer innen, sobald die Bubble groß genug ist', () => {
    const { container } = renderBubble(
      node('section', '01.07', '07', 'Verbauten und Baubehelfe'),
      'subsection',
      1,
      22,
    );
    const texts = [...container.querySelectorAll('text')];
    expect(texts.map((text) => text.textContent)).toContain('§ 07');
    expect(texts.some((text) => text.textContent?.startsWith('Verbauten'))).toBe(true);
  });
});

// ── Hinweis-Ring (WP-R, R1; decisions/0029): Farbe steht im Graphen für das
// Gewerk, deshalb liegt der Hinweis als Ring außen und färbt die Bubble nicht um.
describe('Hinweis-Ring', () => {
  const position = node('position', '01.07.0010', '0010', 'Wand');

  it('bleibt weg, solange die Position keinen Hinweis trägt', () => {
    const { container } = renderBubble(position, 'position', 1, RADII.position);
    expect(container.querySelector('[data-hint]')).toBeNull();
  });

  it('zeichnet einen Ring außerhalb der Bubble, ohne ihre Füllung zu ändern', () => {
    const { container } = renderBubble(position, 'position', 1, RADII.position, noop, 'beachten');
    const ring = container.querySelector('[data-hint]');
    expect(ring?.getAttribute('fill')).toBe('none');
    expect(Number(ring?.getAttribute('r'))).toBeGreaterThan(RADII.position);
    // Die Bubble selbst behält ihre Farbe — die gehört dem Gewerk (0013).
    const fill = container.querySelector('circle');
    expect(fill?.getAttribute('fill')).toBe('var(--bub-position-line)');
  });

  it('färbt den Ring nach Schwere, nicht nach Kategorie', () => {
    const beachten = renderBubble(position, 'position', 1, RADII.position, noop, 'beachten');
    const ring = beachten.container.querySelector('[data-hint]');
    expect(ring?.getAttribute('stroke')).toBe('var(--amber)');

    const hinweis = renderBubble(position, 'position', 1, RADII.position, noop, 'hinweis');
    const zweiter = hinweis.container.querySelectorAll('[data-hint]');
    expect(zweiter[zweiter.length - 1]?.getAttribute('stroke')).toBe('var(--mute)');
  });
});

describe('marksVisible', () => {
  it('trägt Markierungen erst, wenn die Bubble groß genug für einen Ring ist', () => {
    const schwelle = MARK_AT_PX / RADII.position;
    expect(marksVisible(schwelle)).toBe(true);
    expect(marksVisible(schwelle * 0.99)).toBe(false);
  });

  it('lässt sie beim weitesten Rauszoomen weg — dort ist die Bubble ein Punkt', () => {
    expect(marksVisible(0.12)).toBe(false);
  });
});
