// GAEB-Datei als JSON mit Positions-Hashes ausgeben (Entscheidung 0065).
// Aufruf: npm run export-lv -- <datei.x83> [ausgabe.json]
// Ohne Ausgabedatei geht das JSON auf stdout.
//
// Der Kern läuft im Browser und braucht DOMParser; in Node liefert ihn jsdom.
// Vite lädt den Kern als Quelltext, wie in der App — kein eigener Build.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { runnerImport } from 'vite';

type Core = typeof import('../../packages/core/src/index.ts');

const [input, output] = process.argv.slice(2);
if (input === undefined) {
  console.error('Aufruf: npm run export-lv -- <datei.x83> [ausgabe.json]');
  process.exit(2);
}

globalThis.DOMParser = new JSDOM('').window.DOMParser;

const corePath = fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url));
const { module: core } = await runnerImport<Core>(corePath, {
  configFile: false,
  logLevel: 'error',
});

const bytes = new Uint8Array(readFileSync(input));
const draft = core.mapToLvDraft(core.getGaebParser().parse(bytes, input));
const json = `${JSON.stringify(core.toLvExport(draft, core.fileIdOf(bytes)), null, 2)}\n`;

if (output === undefined) process.stdout.write(json);
else writeFileSync(output, json);
