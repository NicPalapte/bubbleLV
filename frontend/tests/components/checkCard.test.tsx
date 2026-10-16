// Karte „Prüfung" im Seitenfenster samt Klappkarte (WP-K). Geprüft werden die Zusagen aus
// docs/domain/vob-pruefungen.md: jede Regel nennt ihren Verweis, ein nicht
// bestätigter Verweis ist als solcher markiert, jede Regel ist einzeln
// abschaltbar, und eine inaktive Regel verschwindet nicht, sondern nennt ihren
// Grund.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckCard, CheckFlyout } from '../../src/components/overview/CheckCard';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewerDispatch } from '../../src/state/viewer';
import type { ViewerAction } from '../../src/state/viewer';
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
/** Was „laden" in den Provider gibt — ein Test kann es abwandeln. */
let geladen = lv;

/** Lädt das LV in den Provider, damit die Ansicht echte Daten sieht. */
function WithLv({ children }: { children: ReactNode }) {
  const dispatch = useViewerDispatch();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: geladen })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch(SUCHE_OHNE_TREFFER)}>
        filtern
      </button>
      {/* Der Sprung aus dem Graphen (WP-R, R1): Regel aufklappen und ins
          Fenster holen. */}
      <button type="button" onClick={() => dispatch({ type: 'openRule', id: 'V7' })}>
        zu V7 springen
      </button>
      {children}
    </>
  );
}

/** Eine Suche, die in der Musterdatei keine Position trifft. */
const SUCHE_OHNE_TREFFER: ViewerAction = { type: 'search', value: 'zzz-kein-treffer-zzz' };

function renderView() {
  const result = render(
    <ViewerProvider>
      <WithLv>
        <CheckCard />
        <CheckFlyout left={366} />
      </WithLv>
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'laden' }));
  return result;
}

/** Die Zahl aus der Kopfzeile („11 Hinweise · 8 Regeln"). */
function gesamtzahl(): number {
  const text = screen.getByText(/Hinweise? ·/).closest('p')?.textContent ?? '';
  return Number((text.match(/^([\d.]+)/)?.[1] ?? '0').replace(/\./g, ''));
}

/** Die Zeile einer Regel — erkennbar an ihrer ID. */
function sectionOf(id: string): HTMLElement {
  const heading = screen.getByText(id, { selector: 'span' });
  return heading.closest('section') as HTMLElement;
}

/** Regel aufklappen; ihre Funde stehen dann in der Klappkarte daneben. */
function openFlyout(id: string): HTMLElement {
  fireEvent.click(within(sectionOf(id)).getByRole('button', { expanded: false }));
  return screen.getByRole('region', { name: `Funde ${id}` });
}

describe('CheckCard', () => {
  it('zeigt jede angemeldete Regel, auch die ohne Treffer', () => {
    renderView();
    const ohneTreffer = screen.getByText(/^Ohne Treffer:/).textContent ?? '';
    for (const rule of lv.check.rules) {
      if (rule.count === 0) expect(ohneTreffer).toContain(rule.id);
      else expect(sectionOf(rule.id)).toBeTruthy();
    }
  });

  it('nennt den Norm-Verweis und markiert einen offenen als zu bestätigen', () => {
    // Alle ausgelieferten Verweise sind bestätigt — V1 wird hier als offen gesetzt.
    geladen = {
      ...lv,
      check: {
        ...lv.check,
        rules: lv.check.rules.map((rule) =>
          rule.id === 'V1' ? { ...rule, refConfirmed: false } : rule,
        ),
      },
    };
    try {
      renderView();
      const v1 = openFlyout('V1');
      expect(within(v1).getByText(/VOB\/A § 7 Abs\. 1 Nr\. 4/)).toBeTruthy();
      expect(within(v1).getByText('Verweis zu bestätigen')).toBeTruthy();
      expect(within(openFlyout('V2')).queryByText('Verweis zu bestätigen')).toBeNull();
    } finally {
      geladen = lv;
    }
  });

  it('nennt bei einer inaktiven Regel den Grund statt sie zu verstecken', () => {
    // Alle ausgelieferten Regeln laufen — V3 wird hier als inaktiv gesetzt.
    geladen = {
      ...lv,
      check: {
        ...lv.check,
        rules: lv.check.rules.map((rule) =>
          rule.id === 'V3'
            ? { ...rule, active: false, count: 0, inactiveReason: 'Noch nicht umgesetzt.' }
            : rule,
        ),
      },
    };
    try {
      renderView();
      const v3 = sectionOf('V3');
      expect(within(v3).getByText('inaktiv')).toBeTruthy();
      expect(within(v3).getByText(/Noch nicht umgesetzt/)).toBeTruthy();
    } finally {
      geladen = lv;
    }
  });

  it('klappt die Funde einer Regel daneben auf und listet die Positionen', () => {
    renderView();
    expect(screen.queryByRole('region', { name: /^Funde/ })).toBeNull();
    const v7 = openFlyout('V7');
    expect(within(v7).getByText(/offene Stellen/)).toBeTruthy();
    fireEvent.click(within(v7).getByRole('button', { name: 'Funde schließen' }));
    expect(screen.queryByRole('region', { name: /^Funde/ })).toBeNull();
  });

  it('hält höchstens eine Regel offen', () => {
    renderView();
    openFlyout('V1');
    openFlyout('V2');
    expect(screen.getAllByRole('region', { name: /^Funde/ })).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Funde V2' })).toBeTruthy();
  });

  it('schaltet eine Regel ab und zählt sie dann nicht mehr mit', () => {
    renderView();
    const vorher = gesamtzahl();
    const schalter = within(sectionOf('V7')).getByRole('button', { name: 'Regel V7 anzeigen' });
    expect(schalter.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(schalter);
    expect(gesamtzahl()).toBe(vorher - 1);
    expect(schalter.getAttribute('aria-pressed')).toBe('false');
  });

  it('zeigt nur Hinweise zu Positionen, die der Filter durchlässt', () => {
    // .claude/CLAUDE.md: „Alle Ansichten arbeiten auf derselben gefilterten
    // Menge." Vorher rechnete die Prüfansicht immer über das ganze LV.
    renderView();
    expect(gesamtzahl()).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'filtern' }));
    expect(gesamtzahl()).toBe(0);
    expect(screen.getByText(/im aktuellen Filter/)).toBeTruthy();
  });

  it('formuliert die Karte als Hinweis, nicht als Urteil', () => {
    renderView();
    expect(screen.getByText(/kein Rechtsrat/)).toBeTruthy();
  });

  it('holt eine aus dem Graphen aufgeklappte Regel ins Fenster', () => {
    // jsdom kennt scrollIntoView nicht — ohne Ersatz bliebe der Sprung ungeprüft.
    const geholt: HTMLElement[] = [];
    Element.prototype.scrollIntoView = function scroll(this: HTMLElement): void {
      geholt.push(this);
    };
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'zu V7 springen' }));
    expect(geholt).toContain(sectionOf('V7'));
    // Die Funde stehen offen da — ein Sprung, der nur scrollt, zeigt nichts.
    const funde = screen.getByRole('region', { name: 'Funde V7' });
    expect(within(funde).getByText(/offene Stellen/)).toBeTruthy();
  });
});
