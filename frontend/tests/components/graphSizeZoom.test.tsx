// Blasengröße umschalten (Issue #152): der Ausschnitt bleibt stehen. Nur eine
// neue Gliederung passt den Graphen neu ein.

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BubbleGraph } from '../../src/components/graph/BubbleGraph';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';

const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
const lv = runPipeline(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  'beispiel.x83',
);

function Harness({ slot = 0 }: { slot?: number }) {
  const dispatch = useViewerDispatch();
  const { index } = useViewer();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          dispatch({ type: 'selectPosition', nodeId: null, positionId: index.nodes[slot].id })
        }
      >
        Position wählen
      </button>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch({ type: 'sizeMode', value: 'uniform' })}>
        gleich groß
      </button>
      <button type="button" onClick={() => dispatch({ type: 'graphLayout', value: 'matrix' })}>
        Matrix
      </button>
      <BubbleGraph root={lv.tree} />
    </>
  );
}

function worldTransform(container: HTMLElement): string {
  return (container.querySelector('.graph-world') as SVGGElement).style.transform;
}

function numbers(transform: string): number[] {
  return [...transform.matchAll(/-?[\d.]+(?:e-?\d+)?/g)].map((match) => Number(match[0]));
}

function worldPoints(container: HTMLElement): Map<string, string> {
  const dots = container.querySelectorAll<SVGGElement>('[data-slot]');
  return new Map([...dots].map((dot) => [dot.dataset.slot ?? '', dot.style.transform]));
}

/** Bildschirmpunkt einer Position: Weltlage × Zoom + Verschiebung. */
function screenPoint(container: HTMLElement, slot: number): [number, number] {
  const [tx, ty, k] = numbers(worldTransform(container));
  const dot = container.querySelector(`[data-slot="${slot}"]`) as SVGGElement;
  const [wx, wy] = numbers(dot.style.transform);
  return [wx * k + tx, wy * k + ty];
}

/** Eigener Ausschnitt statt des eingepassten — den soll der Wechsel nicht verwerfen. */
function hineinzoomen(): void {
  const graph = screen.getByLabelText(/^Bubble-Graph/);
  fireEvent.wheel(graph, { deltaY: -400, clientX: 300, clientY: 200 });
}

describe('Blasengröße wechseln', () => {
  beforeEach(() => {
    // jsdom misst 0×0 — ohne Größe passt der Graph sich nie ein.
    Element.prototype.getBoundingClientRect = function rect(): DOMRect {
      return {
        width: 1200,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: 1200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
  });

  function renderGraph(slot?: number) {
    const result = render(
      // StrictMode wie in `src/main.tsx`: doppelter Render darf nicht doppelt verschieben.
      <StrictMode>
        <ViewerProvider>
          <Harness slot={slot} />
        </ViewerProvider>
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    return result;
  }

  it('lässt Zoom und Ausschnitt stehen', () => {
    const { container } = renderGraph();
    hineinzoomen();
    const vorher = worldTransform(container);
    fireEvent.click(screen.getByRole('button', { name: 'gleich groß' }));
    expect(worldTransform(container)).toBe(vorher);
  });

  it('hält eine gewählte Position am selben Bildschirmpunkt', () => {
    // Eine Position suchen, die beim Neupacken in der Welt wirklich wandert.
    const probe = renderGraph();
    const before = worldPoints(probe.container);
    fireEvent.click(screen.getByRole('button', { name: 'gleich groß' }));
    const after = worldPoints(probe.container);
    const moved = [...before].find(([slot, at]) => after.has(slot) && after.get(slot) !== at);
    expect(moved).toBeDefined();
    const slot = Number(moved?.[0]);
    probe.unmount();

    const { container } = renderGraph(slot);
    fireEvent.click(screen.getByRole('button', { name: 'Position wählen' }));
    const [x0, y0] = screenPoint(container, slot);
    const [, , k0] = numbers(worldTransform(container));
    fireEvent.click(screen.getByRole('button', { name: 'gleich groß' }));
    const [x1, y1] = screenPoint(container, slot);
    expect(numbers(worldTransform(container))[2]).toBe(k0);
    expect(x1).toBeCloseTo(x0, 3);
    expect(y1).toBeCloseTo(y0, 3);
  });

  it('passt bei neuer Gliederung weiterhin neu ein', () => {
    const { container } = renderGraph();
    hineinzoomen();
    const vorher = worldTransform(container);
    fireEvent.click(screen.getByRole('button', { name: 'Matrix' }));
    expect(worldTransform(container)).not.toBe(vorher);
  });
});
