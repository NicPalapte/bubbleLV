import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Startet das echte Werkzeug in Node, damit jsdom und Vites runnerImport mitgeprüft werden.
const SCRIPT = resolve(process.cwd(), 'scripts/exportLv.ts');
const FIXTURES = resolve(process.cwd(), '../packages/core/tests/fixtures');

function run(...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

describe('npm run export-lv', () => {
  it('schreibt das LV mit Hashes auf stdout', () => {
    const result = run(resolve(FIXTURES, 'sample.X83'));

    expect(result.status).toBe(0);
    const exported = JSON.parse(result.stdout) as { schema: string; projectName: string };
    expect(exported.schema).toBe('bubble-lv-export-v1');
    expect(exported.projectName).toBe('Testprojekt Umbau');
  }, 30_000);

  it('meldet eine nicht unterstützte Version kurz statt mit Stacktrace', () => {
    const result = run(resolve(FIXTURES, 'unsupported-version.x83'));

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^Kein lesbares LV: GAEB-Version/);
  }, 30_000);

  it('meldet eine fehlende Datei', () => {
    const result = run(resolve(FIXTURES, 'gibt-es-nicht.x83'));

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^Datei nicht lesbar/);
  }, 30_000);

  it('meldet eine nicht schreibbare Ausgabedatei', () => {
    const result = run(
      resolve(FIXTURES, 'sample.X83'),
      resolve(FIXTURES, 'gibt-es-nicht', 'ausgabe.json'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^Datei nicht schreibbar/);
  }, 30_000);
});
