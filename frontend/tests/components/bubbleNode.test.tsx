// Knoten-Darstellung im Graphen (Issue #41, WP-41-4): Positionen einheitlich
// ohne Rand, Nummern auch bei kleinen Bubbles lesbar, nur die eigene Ebene.

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BubbleNode } from '../../src/components/graph/BubbleNode';
import { codeLabelFor } from '../../src/lib/graph/labels';
import type { PlacedNode } from '../../src/lib/graph/layoutRadial';
import type { LVNode } from '../../src/types/lvNode';

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
    dotted: false,
    clusterOf: null,
    clusterCount: 0,
  };
}

const noop = (): void => {};

function renderBubble(target: LVNode, tier: PlacedNode['tier'], zoom: number, radius: number) {
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
        onClick={noop}
        radius={radius}
        subLabel="3 Pos."
        collapsible
        isCollapsed={false}
        childCount={3}
        onToggleCollapse={noop}
        onOpenTable={noop}
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
