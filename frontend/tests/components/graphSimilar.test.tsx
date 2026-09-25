// Ähnlichkeit im Graph (WP-R, R2): der gestrichelte Ring an Positionen mit
// Geschwistern, der Block „Ähnliche" in den Positionsdetails und die
// Hervorhebung einer Gruppe.
//
// Die Zusage dahinter (decisions/0029): **Muster statt Farbe** — die Füllung
// der Bubble bleibt dem Gewerk. Und: leise, solange nichts hervorgehoben ist;
// in einem LV steckt schnell ein Drittel aller Positionen in einer Gruppe.

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { BubbleGraph } from '../../src/components/graph/BubbleGraph';
import { GraphHeader } from '../../src/components/graph/GraphHeader';
import { SimilarBlock } from '../../src/components/relate/SimilarBlock';
import { clusterByPosition } from '../../src/lib/relate';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();
const clusters = clusterByPosition(lv.relations);

/** Eine Position der Musterdatei, die Geschwister hat. */
const MIT_GRUPPE = [...clusters.keys()][0];
/** Eine Position ohne jede Gruppe. */
const OHNE_GRUPPE =
  lv.relations.total > lv.relations.clustered
    ? ([...lv.tree.children[0].children]
        .flatMap((section) => section.children)
        .map((node) => node.id)
        .find((id) => !clusters.has(id)) ?? '')
    : '';

function Harness({ positionId, children }: { positionId: string; children?: ReactNode }) {
  const dispatch = useViewerDispatch();
  const {
    view: {
      mode,
      graph: { highlightCluster },
    },
  } = useViewer();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setViewMode', mode: 'graph' })}>
        in den Graphen
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'selectPosition', nodeId: null, positionId: MIT_GRUPPE })}
      >
        Position wählen
      </button>
      <span data-testid="ansicht">{mode}</span>
      <span data-testid="hervorgehoben">{highlightCluster ?? ''}</span>
      <SimilarBlock positionId={positionId} />
      {children}
    </>
  );
}

function renderBlock(positionId: string, imGraphen = true) {
  const result = render(
    <ViewerProvider>
      <Harness positionId={positionId} />
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
  if (imGraphen) fireEvent.click(screen.getByRole('button', { name: 'in den Graphen' }));
  return result;
}

describe('SimilarBlock', () => {
  it('nennt die Gruppe und wie viele Positionen noch dazugehören', () => {
    expect(MIT_GRUPPE).toBeDefined();
    renderBlock(MIT_GRUPPE);
    const gruppe = clusters.get(MIT_GRUPPE);
    expect(screen.getByText('Ähnliche')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`^${(gruppe?.positionIds.length ?? 1) - 1} weitere`)),
    ).toBeInTheDocument();
  });

  it('bleibt weg, wo es keine Geschwister gibt', () => {
    expect(OHNE_GRUPPE).not.toBe('');
    expect(clusters.has(OHNE_GRUPPE)).toBe(false);
    renderBlock(OHNE_GRUPPE);
    expect(screen.queryByText('Ähnliche')).toBeNull();
  });

  it('hebt die Gruppe hervor und nimmt die Hervorhebung beim zweiten Klick zurück', () => {
    renderBlock(MIT_GRUPPE);
    const knopf = (name: string): HTMLElement => screen.getByRole('button', { name });
    fireEvent.click(knopf('ÄHNLICHE ZEIGEN'));
    expect(screen.getByTestId('hervorgehoben')).toHaveTextContent(
      clusters.get(MIT_GRUPPE)?.id ?? 'x',
    );
    fireEvent.click(knopf('HERVORHEBUNG AUFHEBEN'));
    expect(screen.getByTestId('hervorgehoben')).toHaveTextContent('');
  });

  it('fasst Filter und Auswahl beim Hervorheben nicht an', () => {
    renderBlock(MIT_GRUPPE);
    fireEvent.click(screen.getByRole('button', { name: 'ÄHNLICHE ZEIGEN' }));
    expect(screen.getByTestId('ansicht')).toHaveTextContent('graph');
  });

  it('führt außerhalb des Graphen in die Ansicht „Ähnlichkeit" statt ins Leere', () => {
    // Die Hervorhebung wirkt nur im Graphen — ein Knopf, der anderswo nichts
    // tut, wäre schlimmer als keiner.
    renderBlock(MIT_GRUPPE, false);
    fireEvent.click(screen.getByRole('button', { name: 'IN DER ÄHNLICHKEIT ZEIGEN' }));
    expect(screen.getByTestId('ansicht')).toHaveTextContent('similar');
    expect(screen.getByTestId('hervorgehoben')).toHaveTextContent('');
  });
});

describe('Graph-Kopf', () => {
  function renderHeader() {
    const result = render(
      <ViewerProvider>
        <Harness positionId={MIT_GRUPPE}>
          <GraphHeader root={lv.tree} />
        </Harness>
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    fireEvent.click(screen.getByRole('button', { name: 'in den Graphen' }));
    return result;
  }

  it('nennt, wie viele Positionen Geschwister haben', () => {
    renderHeader();
    expect(screen.getByText(`${clusters.size} MIT ÄHNLICHEN`)).toBeInTheDocument();
  });

  it('bietet eine Schaltfläche, die die Hervorhebung wieder aufhebt', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'ÄHNLICHE ZEIGEN' }));
    const aufheben = screen.getByRole('button', { name: /^ÄHNLICHE:/ });
    fireEvent.click(aufheben);
    expect(screen.getByTestId('hervorgehoben')).toHaveTextContent('');
    // Danach steht die Legende wieder da.
    expect(screen.getByText(`${clusters.size} MIT ÄHNLICHEN`)).toBeInTheDocument();
  });
});

describe('Muster im Graphen', () => {
  function renderGraph() {
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
    const result = render(
      <ViewerProvider>
        <Harness positionId={MIT_GRUPPE}>
          <BubbleGraph root={lv.tree} />
        </Harness>
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    fireEvent.click(screen.getByRole('button', { name: 'in den Graphen' }));
    fireEvent.click(screen.getByTitle('Alles ausklappen'));
    // Auf die Auswahl einpassen statt blind zu zoomen: nur so steht die
    // markierte Position anschließend sicher im Ausschnitt.
    fireEvent.click(screen.getByRole('button', { name: 'Position wählen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Auf Auswahl zoomen' }));
    return result;
  }

  function marks(container: HTMLElement, art: string): number {
    return container.querySelectorAll(`[data-group="${art}"]`).length;
  }

  it('markiert Gruppenmitglieder leise, solange nichts hervorgehoben ist', () => {
    const { container } = renderGraph();
    expect(marks(container, 'leise')).toBeGreaterThan(0);
    expect(marks(container, 'hervor')).toBe(0);
    // Die Bubble behält ihre Füllfarbe — die gehört dem Gewerk (0013).
    const ring = container.querySelector('[data-group="leise"]');
    expect(ring?.getAttribute('fill')).toBe('none');
    expect(ring?.getAttribute('stroke-dasharray')).not.toBeNull();
  });

  it('hebt beim Hervorheben genau die Mitglieder der Gruppe heraus', () => {
    const { container } = renderGraph();
    // Die Auswahlkarte im Graphen zeigt denselben Block — beide Knöpfe lösen
    // dasselbe aus, für den Test genügt der erste.
    fireEvent.click(screen.getAllByRole('button', { name: 'ÄHNLICHE ZEIGEN' })[0]);
    const gruppe = clusters.get(MIT_GRUPPE);
    const gezeichnet = [...container.querySelectorAll('[data-group="hervor"]')];
    expect(gezeichnet.length).toBeGreaterThan(0);
    expect(gezeichnet.length).toBeLessThanOrEqual(gruppe?.positionIds.length ?? 0);
  });

  it('lässt das Muster beim Rauszoomen weg — wie den Hinweis-Ring', () => {
    const { container } = renderGraph();
    for (let step = 0; step < 14; step += 1) {
      fireEvent.click(screen.getByTitle('Auszoomen'));
    }
    expect(container.querySelectorAll('[data-tier="position"]').length).toBeGreaterThan(0);
    expect(marks(container, 'leise')).toBe(0);
  });
});
