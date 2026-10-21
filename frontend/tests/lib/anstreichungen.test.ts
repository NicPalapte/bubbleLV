// Eigene Anstreichungen im Langtext (Entscheidung 0063): Datenmodell, Speicher,
// Stelle im Text wiederfinden, Auswahl lesen.

import { createElement } from 'react';
import { render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addHighlight,
  EMPTY_ANNOTATIONS,
  fromStored,
  rekey,
  removeHighlight,
  toHighlight,
  toStored,
  MAX_PAINT_LENGTH,
  type Highlight,
} from '../../src/lib/annotations';
import { locate, paintSelection, usePaintHighlights } from '../../src/components/common/paint';
import { shownText } from '../../src/components/common/shownText';
import { Highlighted } from '../../src/components/common/Highlighted';

const gelb = (start: number, text: string, at = 1): Highlight => ({
  paint: 'gelb',
  start,
  text,
  at,
});

describe('Anstreichungen im Datenmodell', () => {
  it('legt an, sortiert nach Stelle, wechselt bei gleicher Stelle nur die Farbe', () => {
    let a = addHighlight(EMPTY_ANNOTATIONS, 'p', gelb(20, 'Bewehrung'));
    a = addHighlight(a, 'p', gelb(3, 'Beton'));
    expect(a.highlights.get('p')?.map((mark) => mark.start)).toEqual([3, 20]);
    expect(addHighlight(a, 'p', gelb(3, 'Beton', 9))).toBe(a);
    a = addHighlight(a, 'p', { ...gelb(3, 'Beton'), paint: 'gruen' });
    expect(a.highlights.get('p')?.map((mark) => mark.paint)).toEqual(['gruen', 'gelb']);
    expect(addHighlight(a, 'p', gelb(0, '  '))).toBe(a);
  });

  it('entfernt eine Anstreichung und räumt leere Positionen weg', () => {
    let a = addHighlight(EMPTY_ANNOTATIONS, 'p', gelb(3, 'Beton'));
    expect(removeHighlight(a, 'p', 5)).toBe(a);
    a = removeHighlight(a, 'p', 0);
    expect(a.highlights.has('p')).toBe(false);
  });

  it('übersteht Speicher und Umschlüsseln, liest v4 ohne Anstreichungen', () => {
    const a = addHighlight(EMPTY_ANNOTATIONS, 'position:01', gelb(3, 'Beton', 7));
    const keys = new Map([['position:01', 'h1']]);
    const stored = toStored(rekey(a, keys));
    expect(stored.highlights).toEqual([['h1', [gelb(3, 'Beton', 7)]]]);
    expect(rekey(fromStored(stored), new Map([['h1', 'position:01']]))).toEqual(a);
    const kaputt = fromStored({
      v: 5,
      progress: [],
      important: [],
      log: [],
      highlights: [['h', [gelb(1, 'x'), { paint: 'lila', start: 0, text: 'y' }, 3]]],
    });
    expect(kaputt.highlights.get('h')).toEqual([gelb(1, 'x')]);
    expect(toHighlight({ paint: 'gelb', start: 0, text: 'x'.repeat(MAX_PAINT_LENGTH + 1) })).toBe(
      null,
    );
    const v4 = fromStored({ v: 4, progress: [], important: ['h'], log: [] });
    expect(v4.highlights.size).toBe(0);
  });
});

describe('Stelle im Langtext', () => {
  it('zeigt `**…**` ohne Sternchen, wie der Langtext', () => {
    expect(shownText('Beton **C30/37** und **XC4**')).toBe('Beton C30/37 und XC4');
  });

  it('lässt `**` über einer Fundstellen-Grenze stehen, wie der Langtext', () => {
    const text = 'Beton **C30/37 XC4** fertig';
    const span = { key: 'norm', label: 'XC4', start: 15, end: 18 };
    expect(shownText(text, [span])).toBe('Beton **C30/37 XC4** fertig');
    expect(shownText(text, [span], new Set())).toBe('Beton C30/37 XC4 fertig');
    const { container } = render(createElement(Highlighted, { text, spans: [span] }));
    expect(container.textContent).toBe(shownText(text, [span]));
  });

  it('nimmt die gespeicherte Stelle, sonst das erste Vorkommen, sonst -1', () => {
    const text = 'Beton, Beton und Stahl';
    expect(locate(text, { start: 7, text: 'Beton' })).toBe(7);
    expect(locate(text, { start: 2, text: 'Stahl' })).toBe(17);
    expect(locate(text, { start: 0, text: 'Holz' })).toBe(-1);
  });

  it('liest die Auswahl samt Stelle im Text, auch über Teilstücke hinweg', () => {
    const box = document.createElement('div');
    box.innerHTML = 'Beton <mark>C30/37</mark> für Wände';
    document.body.append(box);
    const mark = box.querySelector('mark')?.firstChild as Text;
    const tail = box.lastChild as Text;
    const range = document.createRange();
    range.setStart(mark, 4);
    range.setEnd(tail, 4);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const target = paintSelection(box);
    expect(target?.text).toBe('37 für');
    expect(target?.start).toBe(10);
    expect(box.textContent?.slice(10, 16)).toBe('37 für');

    const draussen = document.createElement('p');
    draussen.textContent = 'anderswo';
    document.body.append(draussen);
    range.selectNodeContents(draussen);
    expect(paintSelection(box)).toBeNull();
    box.remove();
    draussen.remove();
  });
});

describe('Einfärben mit der Highlight-API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('färbt Stellen über Teilstücke hinweg ein und räumt beim Abbau auf', () => {
    const registered = new Map<string, Set<Range>>();
    vi.stubGlobal('CSS', { highlights: registered });
    vi.stubGlobal('Highlight', class extends Set<Range> {});
    const box = document.createElement('div');
    box.innerHTML = 'Beton <mark>C30/37</mark> für Wände';
    document.body.append(box);
    const marks = [gelb(3, 'on C30'), { ...gelb(14, 'für'), paint: 'gruen' as const }];

    const { unmount } = renderHook(() => usePaintHighlights({ current: box }, marks, []));
    const ranges = (paint: string): string[] =>
      [...(registered.get(`paint-${paint}`) ?? [])].map((range) => range.toString());
    expect(ranges('gelb')).toEqual(['on C30']);
    expect(ranges('gruen')).toEqual(['für']);

    unmount();
    expect(ranges('gelb')).toEqual([]);
    expect(ranges('gruen')).toEqual([]);
    box.remove();
  });
});
