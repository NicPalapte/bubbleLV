// Prüf-Hinweise als Markdown (WP-P, Schritt 3).
//
// Der Bericht ist die Fassung, die das Haus verlässt — er muss deshalb
// dieselben Vorbehalte tragen wie die Ansicht: Hinweise statt Urteile, ein
// unbestätigter Norm-Verweis ausdrücklich als solcher, und keine Regel, die
// der Nutzer abgeschaltet hat.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkMarkdown } from '../../src/lib/export/checkReport';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { indexNodes } from '../../src/lib/tree/buildTree';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();
const nodes = indexNodes(lv.tree);
const EMPTY: ReadonlySet<string> = new Set();

function bericht(muted: ReadonlySet<string> = EMPTY, visible: ReadonlySet<string> | null = null) {
  return checkMarkdown({
    check: lv.check,
    nodes,
    muted,
    visible,
    fileName: lv.fileName,
    projectName: lv.projectName,
  });
}

/** Regel-IDs, die im Bericht als Überschrift vorkommen. */
function regelnIm(text: string): string[] {
  return [...text.matchAll(/^### (\S+) · /gm)].map((treffer) => treffer[1]);
}

describe('checkMarkdown', () => {
  it('nennt die Datei und sagt, dass es Hinweise sind — keine Urteile', () => {
    const text = bericht();
    expect(text).toContain(lv.fileName);
    expect(text).toContain('Hinweise, keine Urteile');
    expect(text).toContain('kein Rechtsrat');
  });

  it('führt die Funde je Regel mit OZ auf', () => {
    const text = bericht();
    const regeln = regelnIm(text);
    expect(regeln.length).toBeGreaterThan(0);
    const ersterFund = lv.check.flags[0];
    const oz = nodes.get(ersterFund.positionId)?.position?.oz ?? '';
    expect(text).toContain(oz);
  });

  it('lässt eine abgeschaltete Regel weg', () => {
    const regel = regelnIm(bericht())[0];
    expect(regelnIm(bericht(new Set([regel])))).not.toContain(regel);
  });

  it('zeigt nur, was der Filter durchlässt', () => {
    const text = bericht(EMPTY, new Set());
    expect(text).toContain('Keine Hinweise im aktuellen Filter');
    expect(regelnIm(text)).toHaveLength(0);
  });

  it('schreibt einen unbestätigten Norm-Verweis als solchen aus', () => {
    // Bubble behauptet keine Fundstelle in einer Norm, die niemand geprüft hat
    // — auch nicht in einer Datei, die weitergereicht wird.
    const offen = lv.check.rules.filter((rule) => rule.ruleRef !== '' && !rule.refConfirmed);
    const text = bericht();
    for (const rule of offen) {
      if (!regelnIm(text).includes(rule.id)) continue;
      expect(text).toContain(`${rule.ruleRef} (Norm-Verweis noch zu bestätigen)`);
    }
  });
});
