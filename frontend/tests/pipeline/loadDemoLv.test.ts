// Das mitgelieferte Demo-LV muss genauso durch die Pipeline laufen wie eine
// gewählte Datei. Der Test liest die ausgelieferte Datei von der Platte und
// hängt sie an ein nachgebautes `fetch` — damit fällt auch auf, wenn jemand das
// Asset austauscht und dabei Struktur oder Encoding kaputtgehen.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_LV_FILE_NAME, DEMO_LV_LABEL, loadDemoLv } from '../../src/lib/pipeline/loadDemoLv';
import { LVLoadError } from '../../src/lib/pipeline/loadLv';

const DEMO_PATH = resolve(process.cwd(), 'src/assets/demo/bvbs-gaeb-musterdatei.x83');

function demoBytes(): ArrayBuffer {
  const buffer = readFileSync(DEMO_PATH);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/** Minimales `fetch`, das nur das liefert, was `loadDemoLv` davon braucht. */
function stubFetch(response: { ok: boolean; bytes?: ArrayBuffer }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: response.ok,
      status: response.ok ? 200 : 404,
      arrayBuffer: async () => response.bytes ?? new ArrayBuffer(0),
    })) as unknown as typeof fetch,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadDemoLv', () => {
  it('lädt das mitgelieferte Demo-LV vollständig', async () => {
    stubFetch({ ok: true, bytes: demoBytes() });

    const lv = await loadDemoLv();

    expect(lv.fileName).toBe(DEMO_LV_FILE_NAME);
    expect(lv.projectName).toBe(DEMO_LV_LABEL);
    expect(lv.tree.positionCount).toBe(28);
    // Umlaute aus der Datei kommen unversehrt an — der Weg über die Bytes
    // statt über vorab dekodierten Text ist der Grund dafür.
    expect(JSON.stringify(lv.tree)).toContain('Baustelleneinrichtung für sämtliche');
  });

  it('meldet eine verständliche Fehlermeldung, wenn das Asset fehlt', async () => {
    stubFetch({ ok: false });

    await expect(loadDemoLv()).rejects.toBeInstanceOf(LVLoadError);
    await expect(loadDemoLv()).rejects.toThrow(/konnte nicht geladen werden/);
  });
});
