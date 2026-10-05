// Erzeugt beim Build `lizenzen.txt`: alle Fremd-Bausteine, die im ausgelieferten
// Bundle stecken, mit Version und Lizenztext (docs/decisions/0036-alle-rechte-vorbehalten.md).
// Quelle ist die package.json — von Hand gepflegt liefe die Liste den Paketen davon.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

interface PackageJson {
  name: string;
  version: string;
  license?: string;
  dependencies?: Record<string, string>;
}

// Dev-Abhängigkeiten, deren Code trotzdem im Bundle landet: Tailwind schreibt
// seine Grundstile (Preflight) in das ausgelieferte CSS.
const BUNDLED_DEV_DEPS = ['tailwindcss'];

// Eigene Umsetzung nach einer fremden Vorlage, ohne das Paket einzubinden
// (frontend/src/lib/graph/pack.ts). Die ISC-Lizenz verlangt den Hinweis trotzdem.
const ADAPTED_CODE = `d3-hierarchy (Verfahren aus packSiblings, nachgebaut in lib/graph/pack.ts)
Lizenz: ISC

Copyright 2010-2021 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.`;

function readPackage(dir: string): PackageJson {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson;
}

function licenseText(dir: string): string {
  const file = readdirSync(dir).find((name) => /^(licen[cs]e|copying)(\.|$)/i.test(name));
  return file === undefined ? '(kein Lizenztext im Paket)' : readFileSync(join(dir, file), 'utf8');
}

/** Laufzeit-Abhängigkeiten samt ihren eigenen, nach Name sortiert und ohne Doppel. */
export function collectThirdParty(root: string): string {
  const own = readPackage(root);
  const seen = new Map<string, string>();
  const queue = [...Object.keys(own.dependencies ?? {}), ...BUNDLED_DEV_DEPS];
  while (queue.length > 0) {
    const name = queue.shift() as string;
    if (seen.has(name)) continue;
    const dir = join(root, 'node_modules', name);
    if (!existsSync(dir)) throw new Error(`Paket ${name} fehlt in node_modules`);
    const pkg = readPackage(dir);
    const head = `${pkg.name} ${pkg.version}\nLizenz: ${pkg.license ?? 'unbekannt'}`;
    seen.set(name, `${head}\n\n${licenseText(dir).trim()}`);
    if (!BUNDLED_DEV_DEPS.includes(name)) queue.push(...Object.keys(pkg.dependencies ?? {}));
  }
  const entries = [...seen.keys()].sort().map((name) => seen.get(name) as string);
  return [
    'Bubble — Bausteine Dritter und ihre Lizenzen',
    'Bubble selbst: alle Rechte vorbehalten (siehe LICENSE im Repository).',
    ...entries,
    ADAPTED_CODE,
  ].join(`\n\n${'='.repeat(78)}\n\n`);
}

export function thirdPartyLicenses(root: string): Plugin {
  return {
    name: 'bubble-third-party-licenses',
    // Im Dev-Server dieselbe Datei, damit der Link im Logo-Menü auch dort trägt.
    configureServer(server) {
      server.middlewares.use('/lizenzen.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`${collectThirdParty(root)}\n`);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'lizenzen.txt',
        source: `${collectThirdParty(root)}\n`,
      });
    },
  };
}
