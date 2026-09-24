// Auffangnetz für Abstürze (Issue #73). Die Zusage: ein Fehler beim Rendern
// führt zu einer lesbaren Seite statt zu einer weißen — und von dort aus lässt
// sich melden, was passiert ist, ohne dass der Stacktrace mitgeht.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../src/components/common/ErrorBoundary';

/** Kennung im Stacktrace: taucht sie im Meldetext auf, geht der Stack mit. */
const STACK_MARKE = 'STACKZEILE-DIE-NICHT-MITDARF';

function wirf(nachricht: string): never {
  const fehler = new Error(nachricht);
  fehler.stack = `Error: ${nachricht}\n    at ${STACK_MARKE} (datei.x83:1:1)`;
  throw fehler;
}

function Kaputt(): never {
  return wirf('Kurztext war undefined');
}

/**
 * Wirft, solange `kaputt` steht — für die Probe auf „neu aufbauen". Der
 * Schalter liegt im Test und nicht in der Komponente: React zeichnet eine
 * werfende Komponente im Entwicklungsmodus mehrfach, ein Zähler in der
 * Komponente würde also mitzählen, was der Nutzer nie sieht.
 */
let kaputt = true;

function Vielleicht() {
  if (kaputt) return wirf('vorübergehender Aussetzer');
  return <div>Ansicht steht wieder</div>;
}

beforeEach(() => {
  kaputt = true;
  // React schreibt jeden gefangenen Fehler auf die Konsole; im Testlauf ist das
  // nur Lärm. Das eigene console.error der Grenze wird dabei mitgezählt.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('zeigt eine Fehlerseite statt einer weißen Seite', () => {
    render(
      <ErrorBoundary bereich="graph" dateiGeladen>
        <Kaputt />
      </ErrorBoundary>,
    );
    const seite = screen.getByRole('alert');
    expect(within(seite).getByText(/Diese Ansicht ist abgestürzt/)).toBeInTheDocument();
    expect(within(seite).getByText(/Kurztext war undefined/)).toBeInTheDocument();
    // Die Zusage, auf die es dem Nutzer ankommt.
    expect(seite.textContent).toContain('Die Datei hat den Browser nicht verlassen');
  });

  it('nennt die ganze App, wenn das äußere Netz greift', () => {
    render(
      <ErrorBoundary bereich="app" dateiGeladen={false}>
        <Kaputt />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Bubble ist abgestürzt/)).toBeInTheDocument();
  });

  it('baut die Ansicht auf Knopfdruck neu auf', () => {
    render(
      <ErrorBoundary bereich="table" dateiGeladen>
        <Vielleicht />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    kaputt = false;
    fireEvent.click(screen.getByRole('button', { name: /Ansicht neu aufbauen/ }));
    expect(screen.getByText('Ansicht steht wieder')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('meldet den Fehler mit Meldung, aber ohne Stacktrace', () => {
    render(
      <ErrorBoundary bereich="graph" dateiGeladen>
        <Kaputt />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Fehler melden/ }));
    const fenster = screen.getByRole('dialog', { name: 'Fehler melden' });
    const text = (within(fenster).getByLabelText('Meldetext') as HTMLTextAreaElement).value;

    expect(text).toContain('Kurztext war undefined');
    expect(text).toContain('Ansicht: graph');
    expect(text).toContain('Datei geladen: ja');
    expect(text).not.toContain(STACK_MARKE);
  });

  it('legt die Meldung ins bearbeitbare Feld, nicht in den festen Text', () => {
    render(
      <ErrorBoundary bereich="graph" dateiGeladen>
        <Kaputt />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Fehler melden/ }));
    const fenster = screen.getByRole('dialog', { name: 'Fehler melden' });
    const feld = within(fenster).getByLabelText(/Was ist passiert/) as HTMLTextAreaElement;

    // Vorbelegt — und löschbar. Was Bubble selbst beiträgt, ist nachweislich
    // frei von Inhalten der Datei; eine Fehlermeldung aus fremdem Code ist es
    // nicht zwingend. Also muss der Nutzer sie entfernen können.
    expect(feld.value).toContain('Kurztext war undefined');
    expect(feld.readOnly).toBe(false);

    fireEvent.change(feld, { target: { value: 'ohne die Meldung' } });
    const text = (within(fenster).getByLabelText('Meldetext') as HTMLTextAreaElement).value;
    expect(text).toContain('ohne die Meldung');
    expect(text).not.toContain('Kurztext war undefined');
  });

  it('bleibt brauchbar, wenn kein Error geworfen wird', () => {
    function WirftText(): never {
      // JavaScript erlaubt jeden Wert; fremder Code hält sich nicht immer an
      // `new Error(…)`. Ohne Umhüllung stünde hier „undefined: undefined".
      throw 'Zeichenkette statt Fehler';
    }
    render(
      <ErrorBoundary bereich="graph" dateiGeladen>
        <WirftText />
      </ErrorBoundary>,
    );
    const seite = screen.getByRole('alert');
    expect(seite.textContent).toContain('Zeichenkette statt Fehler');
    expect(seite.textContent).not.toContain('undefined');
  });

  it('schreibt den Absturz samt Stacktrace nur in die Konsole', () => {
    render(
      <ErrorBoundary bereich="matrix" dateiGeladen={false}>
        <Kaputt />
      </ErrorBoundary>,
    );
    const eigene = vi
      .mocked(console.error)
      .mock.calls.filter((args) => String(args[0]).startsWith('Absturz in matrix'));
    expect(eigene).toHaveLength(1);
  });
});
