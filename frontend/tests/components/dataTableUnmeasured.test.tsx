// Erster Frame der Tabelle, bevor Zeilen- und Fensterhöhe gemessen sind
// (Issue #98). Vorher zeichnete die Tabelle in diesem Frame **alle** Zeilen:
// bei rund 9.500 Positionen etwa 200.000 DOM-Knoten, die gleich danach wieder
// abgebaut wurden — der Ansichtswechsel dauerte 7 bis 14 s.
//
// jsdom rechnet kein Layout und bleibt deshalb dauerhaft in diesem Zustand; der
// Test hält fest, dass auch dort nur ein begrenztes Stück gezeichnet wird.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, UNMEASURED_ROWS } from '../../src/components/ui/DataTable';

interface Row {
  id: string;
  text: string;
}

const COLUMNS = [{ key: 'text', label: 'Text', width: 200, render: (row: Row) => row.text }];

function zeilen(anzahl: number): Row[] {
  return Array.from({ length: anzahl }, (_, i) => ({ id: `r${i}`, text: `Zeile ${i}` }));
}

function renderTable(rows: Row[]) {
  return render(
    <DataTable columns={COLUMNS} rows={rows} rowKey={(row) => row.id} label="Testtabelle" />,
  );
}

/** Gezeichnete Datenzeilen (ohne Kopfzeile). */
function datenzeilen(): number {
  return screen.getAllByRole('row').length - 1;
}

describe('DataTable · unvermessener erster Frame (Issue #98)', () => {
  it('zeichnet bei 5.000 Zeilen nur ein begrenztes Stück', () => {
    renderTable(zeilen(5_000));
    expect(datenzeilen()).toBe(UNMEASURED_ROWS);
  });

  it('zeichnet kleine Tabellen weiterhin vollständig', () => {
    renderTable(zeilen(25));
    expect(datenzeilen()).toBe(25);
  });

  it('zeichnet genau an der Grenze alles', () => {
    renderTable(zeilen(UNMEASURED_ROWS));
    expect(datenzeilen()).toBe(UNMEASURED_ROWS);
  });

  it('beginnt oben: die ersten Zeilen sind da, die späten nicht', () => {
    renderTable(zeilen(5_000));
    expect(screen.getByText('Zeile 0')).toBeInTheDocument();
    expect(screen.queryByText('Zeile 4999')).toBeNull();
  });
});
