// Ansicht „Überblick" (WP-L). Geprüft werden die Zusagen aus dem Plan: die
// Kennzahlen stehen da, eine Datei ohne Preise zeigt keine Null-Euro-Kachel,
// und ein Klick in Treemap oder Einheiten-Liste filtert — ohne die Ansicht zu
// wechseln.

import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewView } from '../../src/components/overview/OverviewView';
import { classifyAndBuild, runPipeline } from '../../src/lib/pipeline/runPipeline';
import { syntheticDraft } from '../support/syntheticLv';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';
import type { LoadedLV } from '../../src/lib/pipeline/runPipeline';
import type { ReactNode } from 'react';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();

/** Zeigt den Filter- und Ansichtszustand an, damit der Test ihn ablesen kann. */
function Probe() {
  const { filter, view, selection } = useViewer();
  const facets = Object.entries(filter.filters.facets)
    .map(([id, values]) => `${id}=${[...values].join('|')}`)
    .join(' ');
  return (
    <div>
      <span data-testid="facets">{facets}</span>
      <span data-testid="mode">{view.mode}</span>
      <span data-testid="node">{selection.nodeId ?? '—'}</span>
    </div>
  );
}

function WithLv({ lv: loaded, children }: { lv: LoadedLV; children: ReactNode }) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: loaded })}>
        laden
      </button>
      {children}
    </>
  );
}

function renderOverview(loaded = lv) {
  render(
    <ViewerProvider>
      <WithLv lv={loaded}>
        <Probe />
        <OverviewView />
      </WithLv>
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
}

describe('Überblick', () => {
  it('zeigt die Kennzahlen der geladenen Datei', () => {
    renderOverview();
    expect(screen.getByText('28 Positionen')).toBeInTheDocument();
    expect(screen.getByTitle('im ganzen LV')).toBeInTheDocument();
    expect(screen.getByText('Gewerke')).toBeInTheDocument();
    expect(screen.getByText('Hinweise')).toBeInTheDocument();
  });

  it('sagt bei einer Datei ohne Preise „keine Preise" statt 0 €', () => {
    renderOverview();
    expect(screen.getByText('keine Preise')).toBeInTheDocument();
    expect(screen.queryByText(/^0 €$/)).not.toBeInTheDocument();
    // Ohne Preise misst die Treemap die Anzahl, und Pareto entfällt mit Grund.
    expect(screen.getByText('Fläche = Anzahl Positionen')).toBeInTheDocument();
    expect(screen.getByText(/Ohne Preise lässt sich keine Rangfolge/)).toBeInTheDocument();
    // Die Mengen übernehmen die Hauptrolle.
    expect(screen.getByRole('list', { name: 'Mengen je Einheit' })).toBeInTheDocument();
  });

  it('filtert per Klick auf ein Gewerk, ohne die Ansicht zu wechseln', () => {
    renderOverview();
    const gewerk = screen.getByTitle(/^Stundenlohnarbeiten ·/);
    fireEvent.click(gewerk);
    expect(screen.getByTestId('facets')).toHaveTextContent('gewerk=Stundenlohnarbeiten');
    expect(screen.getByTestId('mode')).toHaveTextContent('overview');
    // Zweiter Klick nimmt den Filter wieder zurück.
    fireEvent.click(screen.getByTitle(/^Stundenlohnarbeiten ·/));
    expect(screen.getByTestId('facets')).toHaveTextContent('');
  });

  it('wählt beim Klick auf einen Abschnitt zusätzlich den Abschnitt an', () => {
    renderOverview();
    fireEvent.click(screen.getByTitle(/^§ 001\.004 · Betonarbeiten ·/));
    expect(screen.getByTestId('node')).toHaveTextContent('section:001.004');
    expect(screen.getByTestId('mode')).toHaveTextContent('overview');
  });

  it('filtert per Klick auf eine Einheit', () => {
    renderOverview();
    fireEvent.click(screen.getByTitle(/klicken filtert nach m²/));
    expect(screen.getByTestId('facets')).toHaveTextContent('einheit=m2');
  });

  it('zählt nur, was der Filter durchlässt', () => {
    renderOverview();
    fireEvent.click(screen.getByTitle(/^Stundenlohnarbeiten ·/));
    expect(screen.getByText(/^3 Positionen/)).toBeInTheDocument();
    expect(screen.getByText(/im aktuellen Filter, von 28/)).toBeInTheDocument();
  });
});

// Gegenprobe zur Beispieldatei: führt die Datei Preise, misst die Treemap an der
// Summe und die Pareto-Auswertung steht.
describe('Überblick · Datei mit Preisen', () => {
  const priced = classifyAndBuild(syntheticDraft(120), 'mit-preisen.x83');

  it('zeigt Summe, Flächenmaß und Pareto statt des Hinweises auf fehlende Preise', () => {
    renderOverview(priced);
    expect(screen.queryByText('keine Preise')).not.toBeInTheDocument();
    expect(screen.getByText('Fläche = Summe')).toBeInTheDocument();
    expect(screen.getByText(/tragen 80 % der Summe/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Pareto-Kurve/ })).toBeInTheDocument();
    // Statt „Ohne Menge" steht bei Preisen die Preislücke in der Kachel.
    expect(screen.getByText('Ohne Preis')).toBeInTheDocument();
  });
});

// „Ohne Gewerk" und „Weitere n Gewerke" sind Sammelkacheln, keine Gewerke. Ein
// Klick dort darf keinen Filterwert setzen, den keine Position trägt — sonst
// stünde die Tabelle danach ohne erkennbaren Grund leer da.
describe('Überblick · Sammelkacheln filtern nicht', () => {
  it('wählt einen Abschnitt ohne Gewerk nur an, ohne zu filtern', () => {
    renderOverview();
    fireEvent.click(screen.getByTitle(/^§ 002\.001 · Elektroarbeiten ·/));

    expect(screen.getByTestId('facets')).toHaveTextContent('');
    expect(screen.getByTestId('node')).toHaveTextContent('section:002.001');
  });

  it('sagt in der Kurzinfo, dass hier nur angewählt und nicht gefiltert wird', () => {
    renderOverview();
    expect(screen.getByTitle(/^§ 002\.001 · Elektroarbeiten ·/).getAttribute('title')).toMatch(
      /klicken wählt den Abschnitt an/,
    );
  });

  it('nimmt den Gewerk-Filter beim Abschnittsklick nicht wieder weg', () => {
    renderOverview();
    // Erst das Gewerk filtern …
    fireEvent.click(screen.getByTitle(/^Betonarbeiten ·/));
    expect(screen.getByTestId('facets')).toHaveTextContent('gewerk=Betonarbeiten');

    // … dann einen Abschnitt darin anklicken: der Filter bleibt stehen.
    fireEvent.click(screen.getByTitle(/^§ 001\.004 · Betonarbeiten ·/));
    expect(screen.getByTestId('facets')).toHaveTextContent('gewerk=Betonarbeiten');
    expect(screen.getByTestId('node')).toHaveTextContent('section:001.004');
  });
});
