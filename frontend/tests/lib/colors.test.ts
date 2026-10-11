// Eine Farbskala für alle Ansichten (docs/decisions/0013-gewerk-farbskala.md,
// 0043-punktfarbe-nach-abschnitt.md): Ton aus dem Rang des Hauptabschnitts.

import { describe, expect, it } from 'vitest';
import { CATEGORY_COLORS, NEUTRAL_COLOR } from '../../src/lib/colors';
import { NO_SECTION_KEY, sectionColor } from '../../src/lib/tree/mainSection';

describe('sectionColor', () => {
  it('vergibt die Töne in LV-Reihenfolge', () => {
    expect(sectionColor('section:01', 0)).toBe(CATEGORY_COLORS[0]);
    expect(sectionColor('section:02', 1)).toBe(CATEGORY_COLORS[1]);
  });

  it('läuft bei mehr Abschnitten als Tönen um, statt Zwischentöne zu erfinden', () => {
    expect(sectionColor('section:11', CATEGORY_COLORS.length)).toBe(CATEGORY_COLORS[0]);
  });

  it('gibt Positionen ohne Abschnitt den farblosen Ton', () => {
    expect(sectionColor(NO_SECTION_KEY, 3)).toBe(NEUTRAL_COLOR);
  });
});
