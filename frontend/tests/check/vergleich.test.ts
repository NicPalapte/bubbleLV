// Vergleich alt/neu (Entscheidung 0085, Schritt 2): Die Prüfregeln laufen seit 0.46.0 als
// Regeln im Format `bubble-rule-v1`. `funde-vorher.json` hält fest, welche Positionen die
// alten Prüffunktionen je Regel gemeldet haben — auf allen Test-LVs und einem erfundenen
// Prüf-LV mit Grenzfällen. Die neuen Regeln müssen dieselben Positionen melden; jede
// Abweichung steht unten mit Grund.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import vorher from './funde-vorher.json';
import { pruefLv } from './pruefLv';
import { codeOf } from '../../src/lib/check';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { classifyAndBuild, runPipeline, type LoadedLV } from '../../src/lib/pipeline/runPipeline';

const DATEIEN: Readonly<Record<string, string>> = {
  'gaeb-xml-beispiel.x83': '../packages/core/tests/fixtures/gaeb-xml-beispiel.x83',
  'sample-3.2.x83': '../packages/core/tests/fixtures/sample-3.2.x83',
  'sample.X83': '../packages/core/tests/fixtures/sample.X83',
  'zeilenumbruch-export.x83': '../packages/core/tests/fixtures/zeilenumbruch-export.x83',
  'bvbs-gaeb-musterdatei.x83': 'src/assets/demo/bvbs-gaeb-musterdatei.x83',
  'bubble-demo-angebot.x84': 'src/assets/demo/bubble-demo-angebot.x84',
};

/** Gewollte Abweichungen im Prüf-LV: Regel → OZ → `neu` = nur neu gemeldet, `alt` = nur alt. */
const ABWEICHUNGEN: Readonly<Record<string, Readonly<Record<string, 'neu' | 'alt'>>>> = {
  V3: {
    // Name im Kurztext, „oder gleichwertig“ erst im Langtext: Die Regel sucht je Text,
    // früher liefen Kurz- und Langtext als ein Text.
    '01.001.0150': 'neu',
  },
  V4: {
    // „trägt der ANbieter“: Wortlisten treffen nur ganze Wörter, früher zählte jeder
    // Textteil.
    '01.001.0200': 'alt',
  },
};

function laden(name: string): LoadedLV {
  if (name === 'pruef-lv') return classifyAndBuild(pruefLv(), 'pruef-lv');
  const bytes = readFileSync(DATEIEN[name]);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return runPipeline(buffer as ArrayBuffer, name);
}

function fundeJeRegel(lv: LoadedLV): Map<string, string[]> {
  const index = buildPositionIndex(lv.tree);
  const ozOf = new Map(index.nodes.map((node, slot) => [node.id, index.positions[slot].oz]));
  const out = new Map<string, string[]>(lv.check.rules.map((rule) => [codeOf(rule.id), []]));
  for (const flag of lv.check.flags) {
    const list = out.get(codeOf(flag.id)) ?? [];
    list.push(ozOf.get(flag.positionId) ?? flag.positionId);
    out.set(codeOf(flag.id), list);
  }
  return new Map([...out].map(([code, oz]) => [code, [...new Set(oz)].sort()]));
}

describe('Prüfregeln als Regeln melden dieselben Positionen wie vorher', () => {
  for (const [name, alt] of Object.entries(vorher as Record<string, Record<string, string[]>>)) {
    it(name, () => {
      const neu = fundeJeRegel(laden(name));
      expect([...neu.keys()].sort()).toEqual(Object.keys(alt).sort());
      for (const [code, altOz] of Object.entries(alt)) {
        const gewollt = name === 'pruef-lv' ? (ABWEICHUNGEN[code] ?? {}) : {};
        const erwartet = new Set(altOz.filter((oz) => gewollt[oz] !== 'alt'));
        for (const [oz, art] of Object.entries(gewollt)) if (art === 'neu') erwartet.add(oz);
        expect(neu.get(code), `${name} · ${code}`).toEqual([...erwartet].sort());
      }
    });
  }
});
