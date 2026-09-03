import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAEBVersionError } from '../../src/lib/gaeb';
import { describeFailure, toPipelineError } from '../../src/lib/pipeline/messages';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { collectPositions } from '../../src/lib/tree/buildTree';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');

function bytesOf(name: string): ArrayBuffer {
  const buffer = readFileSync(resolve(FIXTURE_DIR, name));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

describe('runPipeline', () => {
  it('führt Parser, Klassifizierung und Baumaufbau in einem Schritt aus', () => {
    const loaded = runPipeline(bytesOf('gaeb-xml-beispiel.x83'), 'gaeb-xml-beispiel.x83');
    expect(loaded.fileName).toBe('gaeb-xml-beispiel.x83');
    expect(loaded.tree.kind).toBe('project');
    expect(loaded.tree.positionCount).toBeGreaterThan(0);

    const positions = collectPositions(loaded.tree);
    for (const node of positions) {
      expect(node.position?.attributes.positionsart).toBeTypeOf('string');
    }
  });

  it('deckt alle vier Positionsarten der Beispieldatei ab', () => {
    const loaded = runPipeline(bytesOf('gaeb-xml-beispiel.x83'), 'gaeb-xml-beispiel.x83');
    const types = new Set(
      collectPositions(loaded.tree).map((node) => node.position?.positionType ?? ''),
    );
    expect(types).toEqual(new Set(['NORMAL', 'ALTERNATIV', 'BEDARF', 'ZULAGENPOSITION']));
  });

  it('wirft GAEBVersionError bei nicht unterstützter Version', () => {
    expect(() =>
      runPipeline(bytesOf('unsupported-version.x83'), 'unsupported-version.x83'),
    ).toThrow(GAEBVersionError);
  });

  it('bildet Parser-Fehler auf eine verständliche Meldung ab', () => {
    let failure: ReturnType<typeof toPipelineError> | null = null;
    try {
      runPipeline(bytesOf('unsupported-version.x83'), 'unsupported-version.x83');
    } catch (error) {
      failure = toPipelineError(error);
    }
    expect(failure?.code).toBe('version');
    expect(describeFailure(failure!)).toContain('unterstützten GAEB-Version');
  });

  it('meldet eine Nicht-GAEB-Datei als Validierungsfehler', () => {
    const bytes = new TextEncoder().encode('<?xml version="1.0"?><root/>');
    let failure: ReturnType<typeof toPipelineError> | null = null;
    try {
      runPipeline(bytes.buffer as ArrayBuffer, 'fremd.xml');
    } catch (error) {
      failure = toPipelineError(error);
    }
    expect(failure?.code).toBe('validation');
  });
});
