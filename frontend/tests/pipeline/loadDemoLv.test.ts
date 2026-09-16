// Die mitgelieferten Demo-LVs müssen genauso durch die Pipeline laufen wie eine
// gewählte Datei. Der Test liest die ausgelieferten Dateien von der Platte und
// hängt sie an ein nachgebautes `fetch` — damit fällt auch auf, wenn jemand ein
// Asset austauscht und dabei Struktur oder Encoding kaputtgehen.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_LVS, demoLvById, loadDemoLv } from '../../src/lib/pipeline/loadDemoLv';
import { LVLoadError } from '../../src/lib/pipeline/loadLv';

function demoBytes(fileName: string): ArrayBuffer {
  const buffer = readFileSync(resolve(process.cwd(), 'src/assets/demo', fileName));
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

describe('loadDemoLv · BVBS-Musterdatei ohne Preise', () => {
  const demo = demoLvById('muster');

  it('lädt das mitgelieferte Demo-LV vollständig', async () => {
    expect(demo).toBeDefined();
    if (demo === undefined) return;
    stubFetch({ ok: true, bytes: demoBytes(demo.fileName) });

    const lv = await loadDemoLv(demo);

    expect(lv.fileName).toBe('bvbs-gaeb-musterdatei.x83');
    expect(lv.projectName).toBe(demo.title);
    expect(lv.tree.positionCount).toBe(28);
    // Ohne Preise in der Datei bleibt die Summe bei 0 — der Überblick sagt das
    // ausdrücklich, statt 0 € zu behaupten (WP-L).
    expect(lv.summary.unitPrice).toBeNull();
    // Umlaute aus der Datei kommen unversehrt an — der Weg über die Bytes
    // statt über vorab dekodierten Text ist der Grund dafür.
    expect(JSON.stringify(lv.tree)).toContain('Baustelleneinrichtung für sämtliche');
  });

  it('meldet eine verständliche Fehlermeldung, wenn das Asset fehlt', async () => {
    expect(demo).toBeDefined();
    if (demo === undefined) return;
    stubFetch({ ok: false });

    await expect(loadDemoLv(demo)).rejects.toBeInstanceOf(LVLoadError);
    await expect(loadDemoLv(demo)).rejects.toThrow(/konnte nicht geladen werden/);
  });
});

describe('loadDemoLv · Angebot mit Preisen', () => {
  const demo = demoLvById('angebot');

  it('führt Preise, Gewerke und eine plausible Angebotssumme', async () => {
    expect(demo).toBeDefined();
    if (demo === undefined) return;
    stubFetch({ ok: true, bytes: demoBytes(demo.fileName) });

    const lv = await loadDemoLv(demo);

    expect(lv.fileName).toBe('bubble-demo-angebot.x84');
    expect(lv.tree.positionCount).toBeGreaterThan(70);
    expect(lv.summary.unitPrice).not.toBeNull();
    // Keine Zertifizierungs-Extremwerte mehr: die Summe bleibt in der
    // Größenordnung eines realen Bauvorhabens (docs/decisions/0014).
    expect(lv.summary.totalPrice).toBeGreaterThan(500_000);
    expect(lv.summary.totalPrice).toBeLessThan(20_000_000);

    // Die Gewerke kommen aus den Titel-Überschriften (Stufe 0 mit Vererbung).
    const gewerke = lv.summary.facets.get('gewerk');
    expect(gewerke).toBeDefined();
    expect(gewerke?.size ?? 0).toBeGreaterThanOrEqual(8);
    expect([...(gewerke?.keys() ?? [])]).toContain('Estricharbeiten');
  });
});

describe('DEMO_LVS', () => {
  it('bietet genau eine Datei mit und eine ohne Preise an', () => {
    expect(DEMO_LVS.map((demo) => demo.id).sort()).toEqual(['angebot', 'muster']);
    for (const demo of DEMO_LVS) {
      expect(demo.label).not.toBe('');
      expect(demo.hint).not.toBe('');
    }
  });
});
