// Ansicht „Prüfung" (WP-K). Geprüft werden die Zusagen aus
// docs/domain/vob-pruefungen.md: jede Regel nennt ihren Verweis, ein nicht
// bestätigter Verweis ist als solcher markiert, jede Regel ist einzeln
// abschaltbar, und eine inaktive Regel verschwindet nicht, sondern nennt ihren
// Grund.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckView } from '../../src/components/check/CheckView';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();

/** Lädt das LV in den Provider, damit die Ansicht echte Daten sieht. */
function WithLv({ children }: { children: ReactNode }) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv })}>
        laden
      </button>
      {children}
    </>
  );
}

function renderView() {
  const result = render(
    <ViewerProvider>
      <WithLv>
        <CheckView />
      </WithLv>
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
  return result;
}

/** Der Abschnitt einer Regel — erkennbar an ihrer ID im Kopf. */
function sectionOf(id: string): HTMLElement {
  const heading = screen.getByText(id, { selector: 'span' });
  return heading.closest('section') as HTMLElement;
}

describe('CheckView', () => {
  it('zeigt jede angemeldete Regel, auch die inaktiven', () => {
    renderView();
    for (const rule of lv.check.rules) {
      expect(sectionOf(rule.id)).toBeTruthy();
    }
  });

  it('nennt den Norm-Verweis und markiert ihn als zu bestätigen', () => {
    renderView();
    const v1 = sectionOf('V1');
    expect(within(v1).getByText(/VOB\/A § 7 Abs\. 1 Nr\. 4/)).toBeTruthy();
    expect(within(v1).getByText('Verweis zu bestätigen')).toBeTruthy();

    // V7 hat keinen VOB-Bezug und ist bestätigt — keine Markierung.
    expect(within(sectionOf('V7')).queryByText('Verweis zu bestätigen')).toBeNull();
  });

  it('nennt bei einer inaktiven Regel den Grund statt sie zu verstecken', () => {
    renderView();
    const v3 = sectionOf('V3');
    expect(within(v3).getByText('inaktiv')).toBeTruthy();
    expect(within(v3).getByText(/hersteller-produktnamen\.csv/)).toBeTruthy();
  });

  it('klappt die Funde einer Regel auf und listet die Positionen', () => {
    renderView();
    const v7 = sectionOf('V7');
    fireEvent.click(within(v7).getByRole('button', { name: /Offene Textergänzung/ }));
    expect(within(v7).getByText(/offene Stellen/)).toBeTruthy();
  });

  it('schaltet eine Regel ab und zählt sie dann nicht mehr mit', () => {
    renderView();
    const vorher = screen.getByText(/Hinweise aus/).textContent ?? '';
    fireEvent.click(within(sectionOf('V7')).getByRole('button', { name: 'an' }));
    const nachher = screen.getByText(/Hinweise aus/).textContent ?? '';
    expect(nachher).not.toBe(vorher);
    expect(within(sectionOf('V7')).getByRole('button', { name: 'aus' })).toBeTruthy();
  });

  it('formuliert die Kopfzeile als Hinweis, nicht als Urteil', () => {
    renderView();
    expect(screen.getByText(/keine Bewertung und kein/)).toBeTruthy();
  });
});
