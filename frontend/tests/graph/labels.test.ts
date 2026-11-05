// Lange Abschnitts- und Los-Namen bleiben auf ihrem Platz im Graphen (Issue #196).
// Beispieltexte erfunden.

import { describe, expect, it } from 'vitest';
import {
  AXIS_LABEL_MAX,
  HULL_CHAR,
  PILL_MIN,
  SANS_CHAR,
  axisText,
  fitText,
  hullPill,
} from '../../src/lib/graph/labels';

const LANG =
  'Erdarbeiten einschließlich Aushub, Verbau, Wasserhaltung, Verfüllung und ' +
  'Verdichtung sowie alle Nebenleistungen nach den Vorbemerkungen dieses Abschnitts';

describe('fitText', () => {
  it('lässt passende Texte unverändert', () => {
    expect(fitText('Erdarbeiten', 200, SANS_CHAR)).toBe('Erdarbeiten');
  });

  it('kürzt zu lange Texte mit „…“ auf die Breite', () => {
    const text = fitText(LANG, 200, SANS_CHAR);
    expect(text.endsWith('…')).toBe(true);
    expect(text.length * SANS_CHAR).toBeLessThanOrEqual(200);
  });
});

describe('hullPill', () => {
  it('zeigt einen kurzen Insel-Titel ganz', () => {
    const pill = hullPill('01.02  Betonarbeiten', 150);
    expect(pill.text).toBe('01.02  Betonarbeiten');
  });

  it('bleibt bei langem Titel nicht breiter als die Insel', () => {
    const r = 300;
    const pill = hullPill(`01.01  ${LANG}`, r);
    expect(pill.text.endsWith('…')).toBe(true);
    expect(pill.width).toBeLessThanOrEqual(2 * r);
  });

  it('gibt kleinen Inseln eine Mindestbreite', () => {
    const pill = hullPill(LANG, 20);
    expect(pill.width).toBeLessThanOrEqual(PILL_MIN);
    expect(pill.text.length).toBeGreaterThan(Math.floor((40 - 28) / HULL_CHAR));
  });
});

describe('axisText', () => {
  it('kürzt Achsenbeschriftungen auf die reservierte Breite', () => {
    const text = axisText(LANG);
    expect(text.endsWith('…')).toBe(true);
    expect(text.length * SANS_CHAR).toBeLessThanOrEqual(AXIS_LABEL_MAX);
    expect(axisText('m3')).toBe('m3');
  });
});
