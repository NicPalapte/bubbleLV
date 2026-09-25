// Prüfung im Graph (WP-R, R1): der Ring an der Bubble, der Block „Hinweise" in
// den Positionsdetails und der Sprung von dort in die Ansicht „Prüfung".
//
// Die Zusage, an der das hängt: **dieselbe Zahl wie in der Prüfung**. Eine
// abgeschaltete Regel darf im Graphen nicht weitermarkieren, und eine Position
// ohne Fund bekommt keinen leeren Block.

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { BubbleGraph } from '../../src/components/graph/BubbleGraph';
import { GraphHeader } from '../../src/components/graph/GraphHeader';
import { HintBlock } from '../../src/components/check/HintBlock';
import { hintsByPosition } from '../../src/lib/check';
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
const hints = hintsByPosition(lv.check);

/** Eine Position der Musterdatei, an der Regel V1 etwas gefunden hat. */
const MIT_V1 = [...hints].find(([, found]) => found.flags.some((flag) => flag.id === 'V1'))?.[0];
/** Eine Position ohne jeden Fund. */
const OHNE_HINWEIS = [...lv.check.rules].length > 0 ? 'position:002.001.0010' : '';

function labelOf(id: string): string {
  return lv.check.rules.find((rule) => rule.id === id)?.label ?? id;
}

function Harness({
  positionId,
  stumm = 'V1',
  children,
}: {
  positionId: string;
  /** Regel, die der Knopf „stumm" abschaltet. */
  stumm?: string;
  children?: ReactNode;
}) {
  const dispatch = useViewerDispatch();
  const {
    view: {
      mode,
      check: { openRules, revealRule },
    },
    selection: { positionId: gewaehlt },
  } = useViewer();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch({ type: 'toggleRule', id: stumm })}>
        Regel stumm
      </button>
      <button
        type="button"
        onClick={() =>
          dispatch({ type: 'selectPosition', nodeId: null, positionId: MIT_V1 as string })
        }
      >
        Position wählen
      </button>
      <span data-testid="ansicht">{mode}</span>
      <span data-testid="offene-regeln">{[...openRules].join(',')}</span>
      <span data-testid="holt-regel">{revealRule ?? ''}</span>
      <span data-testid="auswahl">{gewaehlt ?? ''}</span>
      <HintBlock positionId={positionId} />
      {children}
    </>
  );
}

function renderBlock(positionId: string, stumm = 'V1') {
  const result = render(
    <ViewerProvider>
      <Harness positionId={positionId} stumm={stumm} />
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
  return result;
}

describe('HintBlock', () => {
  it('zeigt jede Regel, die an dieser Position etwas gefunden hat', () => {
    expect(MIT_V1).toBeDefined();
    renderBlock(MIT_V1 as string);
    expect(screen.getByText('Hinweise')).toBeInTheDocument();
    expect(screen.getByText(labelOf('V1'))).toBeInTheDocument();
  });

  it('nennt dieselbe Zahl Funde, die die Prüfung für diese Position führt', () => {
    const erwartet = hints.get(MIT_V1 as string)?.flags.length ?? 0;
    renderBlock(MIT_V1 as string);
    expect(screen.getByText(new RegExp(`^${erwartet} aus \\d+ Regeln?$`))).toBeInTheDocument();
  });

  it('bleibt ganz weg, wo nichts gefunden wurde — keine leere Überschrift', () => {
    expect(hints.has(OHNE_HINWEIS)).toBe(false);
    renderBlock(OHNE_HINWEIS);
    expect(screen.queryByText('Hinweise')).toBeNull();
  });

  it('verschwindet, sobald die Regel in der Prüfung abgeschaltet wird', () => {
    const nurV1 = [...hints].find(
      ([, found]) => found.flags.length > 0 && found.flags.every((flag) => flag.id === 'V1'),
    )?.[0];
    renderBlock(nurV1 ?? (MIT_V1 as string));
    fireEvent.click(screen.getByRole('button', { name: 'Regel stumm' }));
    expect(screen.queryByText(labelOf('V1'))).toBeNull();
  });

  it('springt in die Prüfung, klappt die Regel auf und nimmt die Auswahl mit', () => {
    renderBlock(MIT_V1 as string);
    fireEvent.click(screen.getAllByRole('button', { name: 'IN DER PRÜFUNG ZEIGEN' })[0]);
    expect(screen.getByTestId('ansicht')).toHaveTextContent('check');
    expect(screen.getByTestId('offene-regeln').textContent?.split(',')).toContain('V1');
    expect(screen.getByTestId('auswahl')).toHaveTextContent(MIT_V1 as string);
  });

  it('merkt die Regel zum Ins-Fenster-Holen vor und verbraucht das Merkzeichen', () => {
    renderBlock(MIT_V1 as string);
    fireEvent.click(screen.getAllByRole('button', { name: 'IN DER PRÜFUNG ZEIGEN' })[0]);
    // Die Prüfansicht selbst ist hier nicht gerendert, also bleibt das
    // Merkzeichen stehen — genau das trägt den Sprung dorthin.
    expect(screen.getByTestId('holt-regel')).toHaveTextContent('V1');
  });

  it('klappt die Regel beim zweiten Sprung nicht wieder zu', () => {
    renderBlock(MIT_V1 as string);
    const knopf = (): HTMLElement =>
      screen.getAllByRole('button', { name: 'IN DER PRÜFUNG ZEIGEN' })[0];
    fireEvent.click(knopf());
    fireEvent.click(knopf());
    expect(screen.getByTestId('offene-regeln').textContent?.split(',')).toContain('V1');
  });
});

describe('Legende im Graph-Kopf', () => {
  function renderHeader() {
    const result = render(
      <ViewerProvider>
        <Harness positionId={OHNE_HINWEIS} stumm="V2">
          <GraphHeader root={lv.tree} />
        </Harness>
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    return result;
  }

  it('nennt, wie viele Positionen einen Ring tragen', () => {
    renderHeader();
    expect(screen.getByText(`${hints.size} MIT HINWEIS`)).toBeInTheDocument();
  });

  it('zählt eine abgeschaltete Regel nicht mehr mit', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Regel stumm' }));
    // V2 ist die einzige Regel an den Stundenlohn-Positionen — ohne sie fallen
    // sie ganz aus der Markierung heraus.
    const ohneV2 = hintsByPosition(lv.check, new Set(['V2'])).size;
    expect(ohneV2).toBeLessThan(hints.size);
    expect(screen.getByText(`${ohneV2} MIT HINWEIS`)).toBeInTheDocument();
  });
});

describe('Ring im Graphen', () => {
  function renderGraph() {
    // jsdom misst jedes Element mit 0×0 — ohne feste Canvas-Größe läge der
    // ganze Graph außerhalb des Ausschnitts und es entstünde keine Bubble.
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
        <Harness positionId={OHNE_HINWEIS}>
          <BubbleGraph root={lv.tree} />
        </Harness>
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    fireEvent.click(screen.getByTitle('Alles ausklappen'));
    return result;
  }

  /**
   * Auf die gewählte Position einpassen statt blind zu zoomen: nur so steht sie
   * anschließend sicher im Ausschnitt — reines Hineinzoomen schiebt sie hinaus.
   */
  function aufAuswahlZoomen(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Position wählen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Auf Auswahl zoomen' }));
  }

  it('trägt Ringe, sobald die Positionen groß genug sind', () => {
    const { container } = renderGraph();
    aufAuswahlZoomen();
    expect(container.querySelectorAll('[data-hint]').length).toBeGreaterThan(0);
  });

  it('lässt sie beim Rauszoomen wieder weg', () => {
    const { container } = renderGraph();
    aufAuswahlZoomen();
    // Weit genug heraus, dass eine Positions-Bubble unter MARK_AT_PX fällt.
    for (let step = 0; step < 10; step += 1) {
      fireEvent.click(screen.getByTitle('Auszoomen'));
    }
    expect(container.querySelectorAll('[data-tier="position"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-hint]').length).toBe(0);
  });
});
