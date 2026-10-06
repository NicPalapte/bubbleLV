import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectThirdParty } from '../../build/thirdPartyLicenses';

let root: string;

function pkg(dir: string, json: object, license?: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(json));
  if (license !== undefined) writeFileSync(join(dir, 'LICENSE'), license);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'lizenzen-'));
  pkg(join(root, 'node_modules', 'tailwindcss'), { name: 'tailwindcss', version: '3.0.0' }, 'TW');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('collectThirdParty', () => {
  it('findet verschachtelte Pakete und führt beide Versionen auf', () => {
    pkg(root, { name: 'app', version: '1.0.0', dependencies: { a: '1', b: '2' } });
    pkg(join(root, 'node_modules', 'b'), { name: 'b', version: '2.0.0', license: 'MIT' }, 'B2');
    pkg(
      join(root, 'node_modules', 'a'),
      { name: 'a', version: '1.0.0', license: 'ISC', dependencies: { b: '1' } },
      'A1',
    );
    pkg(
      join(root, 'node_modules', 'a', 'node_modules', 'b'),
      { name: 'b', version: '1.0.0' },
      'B1',
    );

    const text = collectThirdParty(root);
    expect(text).toContain('a 1.0.0\nLizenz: ISC\n\nA1');
    expect(text).toContain('b 1.0.0\nLizenz: unbekannt\n\nB1');
    expect(text).toContain('b 2.0.0\nLizenz: MIT\n\nB2');
    expect(text).toContain('tailwindcss 3.0.0');
    expect(text).toContain('d3-hierarchy');
  });

  it('meldet ein Paket ohne Lizenzdatei, statt abzubrechen', () => {
    pkg(root, { name: 'app', version: '1.0.0', dependencies: { c: '1' } });
    pkg(join(root, 'node_modules', 'c'), { name: 'c', version: '1.0.0' });
    expect(collectThirdParty(root)).toContain(
      'c 1.0.0\nLizenz: unbekannt\n\n(kein Lizenztext im Paket)',
    );
  });

  it('bricht ab, wenn ein Paket fehlt', () => {
    pkg(root, { name: 'app', version: '1.0.0', dependencies: { fehlt: '1' } });
    expect(() => collectThirdParty(root)).toThrow('Paket fehlt fehlt in node_modules');
  });
});
