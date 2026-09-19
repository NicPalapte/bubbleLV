// Ansicht „Ähnlichkeit" (WP-M, Schritt 5). Geprüft werden die Zusagen aus dem
// Plan: eine reale Datei zeigt ihre wiederkehrenden Leistungen als Gruppen,
// jede Gruppe benennt Gemeinsames und Unterschiedliches, der Regler begrenzt
// auf Gruppen ab n Mitgliedern — und der gemeinsame Filterzustand gilt auch
// hier.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SimilarView } from '../../src/components/relate/SimilarView';
import { classifyAndBuild, runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import type { ViewerAction } from '../../src/state/viewer';
import type { LVDraft, PositionDraft } from '../../src/types/lvDraft';
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

/** Eine Suche, die in der Musterdatei keine Position trifft. */
const SUCHE_OHNE_TREFFER: ViewerAction = { type: 'search', value: 'zzz-kein-treffer-zzz' };

function WithLv({
  datei,
  filter,
  children,
}: {
  datei: LoadedLV;
  filter: ViewerAction;
  children: ReactNode;
}) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: datei })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch(filter)}>
        filtern
      </button>
      {children}
    </>
  );
}

function renderView(datei: LoadedLV = lv, filter: ViewerAction = SUCHE_OHNE_TREFFER) {
  const result = render(
    <ViewerProvider>
      <WithLv datei={datei} filter={filter}>
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

// ── Kennzahlen gegen gefilterte Mitgliederzahl ───────────────────────────────
//
// Die Karte zeigt zwei Zahlen nebeneinander, die sich auf Verschiedenes
// beziehen: die Mitglieder **im Filter** und die Kennzahlen der **ganzen**
// Gruppe. Das ist Absicht — der Median ist die Bezugsgröße der Ausreißer, und
// die stehen einmal beim Laden fest. Damit das nicht verwirrt, muss die Karte
// beides ausweisen, sobald der Filter Mitglieder ausblendet.

function wiederholung(quantity: number, unitPrice: number, i: number): PositionDraft {
  return {
    oz: `01.001.00${i}0`,
    shortText: 'Innenwand herstellen',
    longText: 'Herstellen einer tragenden Innenwand aus Beton, Abrechnung nach Aufmaß.',
    unit: 'm3',
    quantity,
    unitPrice,
    positionType: 'NORMAL',
    attributes: {},
  };
}

/** Vier gleiche Positionen; eine hat eine Menge weit außerhalb des Filters. */
const VIER_GLEICHE: LVDraft = {
  projectName: 'Kennzahlen-Test',
  client: null,
  lots: [
    {
      number: '01',
      label: 'Los',
      sections: [
        {
          number: '01.001',
          label: 'Abschnitt',
          sections: [],
          positions: [
            wiederholung(10, 100, 1),
            wiederholung(20, 110, 2),
            wiederholung(30, 120, 3),
            wiederholung(1000, 130, 4),
          ],
        },
      ],
    },
  ],
};

/** Mengenfilter, der die vierte Position ausblendet. */
const MENGE_BIS_100: ViewerAction = { type: 'setMenge', range: [0, 100] };

describe('SimilarView · Kennzahlen im Filter', () => {
  const kleinesLv = classifyAndBuild(VIER_GLEICHE, 'kennzahlen.x83');

  it('nennt ohne Filter nur die Mitgliederzahl', () => {
    renderView(kleinesLv, MENGE_BIS_100);
    expect(screen.getByText('4 Positionen')).toBeInTheDocument();
    expect(screen.queryByText(/über alle/)).toBeNull();
  });

  it('weist die ausgeblendeten Mitglieder aus und bezieht die Kennzahlen darauf', () => {
    renderView(kleinesLv, MENGE_BIS_100);
    fireEvent.click(screen.getByRole('button', { name: 'filtern' }));
    // Mitglieder gefiltert, Kennzahlen über die ganze Gruppe — beides steht da.
    expect(screen.getByText('3 von 4 Positionen')).toBeInTheDocument();
    expect(screen.getByText(/über alle 4/)).toBeInTheDocument();
  });
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
