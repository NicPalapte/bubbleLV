// Graph und Tabelle im eigenen Browserfenster haben die Suchleiste mit (PopoutSearch):
// dieselbe Suche und dieselben Filter wie die Kopfleiste, aber eine eigene Filterleiste.

import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopoutSearch } from '../../src/components/shell/PopoutSearch';
import { GraphHeader } from '../../src/components/graph/GraphHeader';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';

const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
const LV = runPipeline(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  'beispiel.x83',
);

function Steuerung() {
  const dispatch = useViewerDispatch();
  const { filter, view } = useViewer();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: LV })}>
        laden
      </button>
      <output aria-label="suche">{filter.search}</output>
      <output aria-label="kopfleiste">{view.filterBar ? 'offen' : 'zu'}</output>
    </>
  );
}

describe('Suchleiste im eigenen Fenster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sucht im gemeinsamen Filter und öffnet nur die eigene Filterleiste', () => {
    render(
      <ViewerProvider>
        <Steuerung />
        <PopoutSearch />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Suche' }), {
      target: { value: 'Beton' },
    });
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByRole('status', { name: 'suche' })).toHaveTextContent('Beton');

    fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
    expect(screen.getByRole('region', { name: 'Filterleiste' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'kopfleiste' })).toHaveTextContent('zu');

    fireEvent.click(screen.getByRole('button', { name: 'Filterleiste schließen' }));
    expect(screen.queryByRole('region', { name: 'Filterleiste' })).toBeNull();
  });

  it('nimmt mit "/" den Fokus ins Suchfeld', () => {
    render(
      <ViewerProvider>
        <Steuerung />
        <PopoutSearch />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    fireEvent.keyDown(window, { key: '/' });
    expect(screen.getByRole('textbox', { name: 'Suche' })).toHaveFocus();
  });
});

describe('Legende auf schmalem Graphen', () => {
  function Laden() {
    const dispatch = useViewerDispatch();
    return (
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: LV })}>
        laden
      </button>
    );
  }

  it('ist ein Knopf, der sie aufklappt', () => {
    render(
      <ViewerProvider>
        <Laden />
        <GraphHeader root={LV.tree} width={500} controls={<div>Steuerung</div>} />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    expect(screen.queryByLabelText('Legende')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Legende' }));
    expect(within(screen.getByLabelText('Legende')).getByText('Bedarf')).toBeInTheDocument();
    expect(screen.getByText('Steuerung')).toBeInTheDocument();
  });

  it('steht breit offen da', () => {
    render(
      <ViewerProvider>
        <Laden />
        <GraphHeader root={LV.tree} width={1000} />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    expect(within(screen.getByLabelText('Legende')).getByText('Bedarf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Legende' })).toBeNull();
  });
});
