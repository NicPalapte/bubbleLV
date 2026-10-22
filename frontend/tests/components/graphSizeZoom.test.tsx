// Blasengröße umschalten (Issue #152): der Ausschnitt bleibt stehen. Nur eine
// neue Gliederung passt den Graphen neu ein.

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BubbleGraph } from '../../src/components/graph/BubbleGraph';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';

const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
const lv = runPipeline(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  'beispiel.x83',
);

function Harness() {
  const dispatch = useViewerDispatch();
  return (
    <>
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

  function renderGraph() {
    const result = render(
      <ViewerProvider>
        <Harness />
      </ViewerProvider>,
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

  it('passt bei neuer Gliederung weiterhin neu ein', () => {
    const { container } = renderGraph();
    hineinzoomen();
    const vorher = worldTransform(container);
    fireEvent.click(screen.getByRole('button', { name: 'Matrix' }));
    expect(worldTransform(container)).not.toBe(vorher);
  });
});
