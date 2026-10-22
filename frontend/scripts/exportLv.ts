// GAEB-Datei als JSON mit Positions-Hashes ausgeben (Entscheidung 0068).
// Aufruf: npm run export-lv -- <datei.x83> [ausgabe.json]
// Ohne Ausgabedatei geht das JSON auf stdout. Braucht Node ab 22.18 (führt .ts direkt aus).
//
// Der Kern läuft im Browser und braucht DOMParser; in Node liefert ihn jsdom.
// Vite lädt den Kern als Quelltext, wie in der App — kein eigener Build.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { runnerImport } from 'vite';

type Core = typeof import('../../packages/core/src/index.ts');

function fail(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

const [input, output] = process.argv.slice(2);
if (input === undefined) fail('Aufruf: npm run export-lv -- <datei.x83> [ausgabe.json]', 2);

globalThis.DOMParser = new JSDOM('').window.DOMParser;

const corePath = fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url));
const { module: core } = await runnerImport<Core>(corePath, {
  configFile: false,
  logLevel: 'error',
});

let bytes: Uint8Array;
try {
  bytes = new Uint8Array(readFileSync(input));
} catch {
  fail(`Datei nicht lesbar: ${input}`);
}

let json: string;
try {
  const draft = core.mapToLvDraft(core.getGaebParser().parse(bytes, input));
  json = `${JSON.stringify(core.toLvExport(draft, core.fileIdOf(bytes)), null, 2)}\n`;
} catch (error) {
  const known =
    error instanceof core.GAEBParseError ||
    error instanceof core.GAEBValidationError ||
    error instanceof core.GAEBVersionError;
  if (!known) throw error;
  fail(`Kein lesbares LV: ${error.message}`);
}

if (output === undefined) {
  process.stdout.write(json);
} else {
  try {
    writeFileSync(output, json);
  } catch {
    fail(`Datei nicht schreibbar: ${output}`);
  }
}
