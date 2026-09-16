// Ansicht „Ähnlichkeit" (WP-M, Schritt 5). Geprüft werden die Zusagen aus dem
// Plan: eine reale Datei zeigt ihre wiederkehrenden Leistungen als Gruppen,
// jede Gruppe benennt Gemeinsames und Unterschiedliches, der Regler begrenzt
// auf Gruppen ab n Mitgliedern — und der gemeinsame Filterzustand gilt auch
// hier.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SimilarView } from '../../src/components/relate/SimilarView';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import type { ViewerAction } from '../../src/state/viewer';
import type { ReactNode } from 'react';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();

/** Eine Suche, die in der Musterdatei keine Position trifft. */
const SUCHE_OHNE_TREFFER: ViewerAction = { type: 'search', value: 'zzz-kein-treffer-zzz' };

function WithLv({ children }: { children: ReactNode }) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch(SUCHE_OHNE_TREFFER)}>
        filtern
      </button>
      {children}
    </>
  );
}

function renderView() {
  const result = render(
    <ViewerProvider>
      <WithLv>
        <SimilarView />
      </WithLv>
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
  return result;
}

/** Die Zahl aus der Kopfzeile („4 Gruppen mit 8 Positionen"). */
function gruppenzahl(): number {
  const text = screen.getByText(/Gruppen mit|Gruppe mit/).textContent ?? '';
  return Number(text.replace(/\s/g, '').match(/^(\d+)/)?.[1] ?? '-1');
}

describe('SimilarView · Musterdatei', () => {
  it('zeigt die wiederkehrenden Leistungen als Gruppen', () => {
    renderView();
    expect(gruppenzahl()).toBe(lv.relations.clusters.length);
    expect(gruppenzahl()).toBeGreaterThan(0);
  });

  it('benennt je Gruppe Gemeinsames und Unterschiedliches', () => {
    renderView();
    expect(screen.getAllByText('GEMEINSAM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UNTERSCHIEDLICH').length).toBeGreaterThan(0);
  });

  it('klappt die Mitgliederliste erst auf Klick auf', () => {
    renderView();
    const cluster = lv.relations.clusters[0];
    const oz = cluster.positionIds[0].replace('position:', '');
    expect(screen.queryByText(oz)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(escapeRegExp(cluster.label)) }));
    expect(screen.getByText(oz)).toBeInTheDocument();
  });

  it('lässt bei „ab 10 Mitgliedern" nichts mehr übrig und sagt das auch', () => {
    renderView();
    fireEvent.click(screen.getByRole('radio', { name: '10' }));
    expect(gruppenzahl()).toBe(0);
    expect(
      screen.getByText('Keine Gruppe in dieser Größe im aktuellen Filter'),
    ).toBeInTheDocument();
  });

  it('zeigt im gemeinsamen Filterzustand nur, was der Filter durchlässt', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'filtern' }));
    expect(gruppenzahl()).toBe(0);
    expect(screen.getAllByText(/im aktuellen Filter/).length).toBeGreaterThan(0);
  });

  it('nennt den Schwellwert, nach dem gruppiert wurde', () => {
    renderView();
    const erwartet = Math.round(lv.relations.threshold * 100);
    expect(screen.getByText(new RegExp(`Ähnlichkeit von ${erwartet} %`))).toBeInTheDocument();
  });
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
