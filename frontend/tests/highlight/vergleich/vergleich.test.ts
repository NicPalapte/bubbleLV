// Vergleich alt/neu (Entscheidung 0088, Schritt 4 aus 0085): Gelernte Begriffe sind jetzt
// eigene Regeln. `hervorhebungen-vorher.json` hält fest, was der Langtext vorher mit den
// Begriffen aus `begriffe.ts` und dem Grundstock gezeigt hat — auf allen Test-LVs und
// erfundenen Texten. Mit den Begriffen als Regeln muss genau dasselbe herauskommen.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { attrSpans } from '../../../src/lib/attributes';
import { termsToRules } from '../../../src/lib/highlight/terms';
import { buildPositionIndex } from '../../../src/lib/index/positionIndex';
import { runPipeline } from '../../../src/lib/pipeline/runPipeline';
import { applyRules, GRUNDSTOCK } from '../../../src/lib/rules/rules';
import type { PositionSummary } from '../../../src/types/lvNode';
import { BEGRIFFE, TEXTE } from './begriffe';
import vorher from './hervorhebungen-vorher.json';

const DATEIEN: Readonly<Record<string, string>> = {
  'gaeb-xml-beispiel.x83': '../packages/core/tests/fixtures/gaeb-xml-beispiel.x83',
  'sample-3.2.x83': '../packages/core/tests/fixtures/sample-3.2.x83',
  'sample.X83': '../packages/core/tests/fixtures/sample.X83',
  'zeilenumbruch-export.x83': '../packages/core/tests/fixtures/zeilenumbruch-export.x83',
  'bvbs-gaeb-musterdatei.x83': 'src/assets/demo/bvbs-gaeb-musterdatei.x83',
  'bubble-demo-angebot.x84': 'src/assets/demo/bubble-demo-angebot.x84',
};

// Wie in der App: Grundstock vorn, eigene Regeln dahinter.
const REGELN = [...GRUNDSTOCK, ...termsToRules(BEGRIFFE, GRUNDSTOCK)];
const ALT = vorher as Record<string, unknown>;

describe('Hervorhebungen mit Begriffen als Regeln wie vorher', () => {
  for (const [name, path] of Object.entries(DATEIEN)) {
    it(name, () => {
      const bytes = readFileSync(path);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const index = buildPositionIndex(runPipeline(buffer as ArrayBuffer, name).tree);
      const neu: Record<string, unknown> = {};
      for (const node of index.nodes) {
        const position = node.position;
        if (position === null) continue;
        const base = attrSpans(position.attributes);
        const spans = applyRules(position, base, REGELN);
        if (JSON.stringify(spans) !== JSON.stringify(base)) neu[position.oz] = spans;
      }
      expect(JSON.parse(JSON.stringify(neu))).toEqual(ALT[name]);
    });
  }

  it('erfundene Texte', () => {
    const neu = TEXTE.map((text) => {
      const position = { longText: text, shortText: '', attributes: {} } as PositionSummary;
      return applyRules(position, [], REGELN);
    });
    expect(JSON.parse(JSON.stringify(neu))).toEqual(ALT.texte);
  });
});
