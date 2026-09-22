// Gewählte Zeile ins Fenster holen (WP-Q, Schritt 5). Ohne das landete ein
// Sprung aus Graph, Prüfung oder Ähnlichkeit zwar auf der richtigen Zeile —
// nur stand die bei einer virtualisierten Tabelle weit außerhalb des Fensters
// und war damit gar nicht gezeichnet.

import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataTable } from '../../src/components/ui/DataTable';

const ROWS = Array.from({ length: 200 }, (_, index) => ({
  id: `r${index}`,
  text: `Zeile ${index}`,
}));
const COLUMNS = [
  { key: 'text', label: 'Text', width: 200, render: (row: (typeof ROWS)[number]) => row.text },
];

const ROW_HEIGHT = 24;
const VIEWPORT = 240;

// jsdom rechnet kein Layout: Zeilenhöhe und Fensterhöhe kommen sonst als 0 an,
// und die Virtualisierung hielte die Tabelle für unvermessen.
const originalRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function rect(): DOMRect {
    return {
      width: 200,
      height: ROW_HEIGHT,
      top: 0,
      left: 0,
      bottom: ROW_HEIGHT,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: VIEWPORT,
  });
});

afterAll(() => {
  Element.prototype.getBoundingClientRect = originalRect;
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
});

function renderTable(revealKey: string | null) {
  return render(
    <DataTable
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(row) => row.id}
      selectedKey={revealKey}
      revealKey={revealKey}
      label="Testtabelle"
    />,
  );
}

describe('DataTable · gewählte Zeile zeigen', () => {
  it('zeichnet ohne Zielzeile nur den Anfang', () => {
    renderTable(null);
    expect(screen.getByText('Zeile 0')).toBeInTheDocument();
    expect(screen.queryByText('Zeile 150')).not.toBeInTheDocument();
  });

  it('holt eine weit unten liegende Zeile ins Fenster', () => {
    renderTable('r150');
    expect(screen.getByText('Zeile 150')).toBeInTheDocument();
    expect(screen.queryByText('Zeile 0')).not.toBeInTheDocument();
  });
});
