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
      <span data-testid="position">{selection.positionId ?? '—'}</span>
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
    // Hauptabschnitte statt Gewerke: die stehen in jeder Datei.
    const kachel = screen.getByTitle('Hauptabschnitte im LV').parentElement as HTMLElement;
    expect(kachel).toHaveTextContent(/^Abschnitte3Hauptabschnitte im LV$/);
    expect(screen.queryByText('Gewerke')).toBeNull();
    expect(screen.getByText('Hinweise')).toBeInTheDocument();
  });

  it('sagt bei einer Datei ohne Preise „keine Preise" statt 0 €', () => {
    renderOverview();
    expect(screen.getByText('keine Preise')).toBeInTheDocument();
    expect(screen.queryByText(/^0 €$/)).not.toBeInTheDocument();
    // Ohne Preise misst die Treemap die Anzahl, und statt Pareto stehen die
    // größten Mengen je Einheit.
    expect(screen.getByText('Fläche = Anzahl Positionen')).toBeInTheDocument();
    expect(screen.queryByText(/80 % der Summe/)).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Größte Mengen in m²' })).toBeInTheDocument();
    // Die Einheiten stehen schon in „Größte Mengen", eine zweite Liste entfällt.
    expect(screen.queryByRole('list', { name: 'Mengen je Einheit' })).toBeNull();
  });

  it('zeigt die größten Mengen je Einheit, ohne Pauschalen, und wählt per Klick an', () => {
    renderOverview();
    const einheiten = screen.getByRole('radiogroup', { name: 'Einheit' });
    expect(einheiten).not.toHaveTextContent('psch');
    fireEvent.click(screen.getByRole('radio', { name: /m³/ }));
    const liste = screen.getByRole('list', { name: 'Größte Mengen in m³' });
    const zeilen = liste.querySelectorAll('[role="listitem"]');
    expect(zeilen[0]).toHaveTextContent('001.002.0020');
    fireEvent.click(zeilen[0]);
    expect(screen.getByTestId('position')).toHaveTextContent('position:001.002.0020');
    expect(screen.getByTestId('mode')).toHaveTextContent('graph');
  });

  it('gliedert die Verteilung nach Hauptabschnitt — ohne Klassifizierung', () => {
    renderOverview();
    fireEvent.click(screen.getByTitle(/^§ 999 · Stundenlohnarbeiten · 3 Positionen$/));
    expect(screen.getByTestId('node')).toHaveTextContent('section:999');
    expect(screen.getByTestId('facets')).toHaveTextContent('');
    expect(screen.getByTestId('mode')).toHaveTextContent('graph');
  });

  it('wählt beim Klick auf eine Einheit im Abschnitt an und filtert die Einheit', () => {
    renderOverview();
    fireEvent.click(screen.getByTitle(/^§ 001 · Bauhauptgewerke · m³ ·/));
    expect(screen.getByTestId('node')).toHaveTextContent('section:001');
    expect(screen.getByTestId('facets')).toHaveTextContent('einheit=m3');
  });

  it('zählt nur, was der Filter durchlässt', () => {
    renderOverview();
    fireEvent.click(screen.getByTitle(/^§ 999 · Stundenlohnarbeiten · Stunde ·/));
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

  it('zeigt die Mengen je Einheit und filtert per Klick auf eine Einheit', () => {
    renderOverview(priced);
    expect(screen.getByRole('list', { name: 'Mengen je Einheit' })).toBeInTheDocument();
    const [knopf] = screen.getAllByTitle(/klicken filtert nach /);
    fireEvent.click(knopf);
    expect(screen.getByTestId('facets')).toHaveTextContent(/einheit=/);
  });
});
