// „Fehler melden" (WP-P, Schritt 6; Issue #57). Die Abnahme aus dem Plan lautet:
// der Link enthält **keinen einzigen Inhalt** aus der geladenen Datei. Geprüft
// wird deshalb die erzeugte URL selbst, gegen echte Werte aus der Musterdatei.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { issueBody, issueUrl } from '../../src/lib/export/issueLink';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';

function loadFixture() {
  const bytes = readFileSync('tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const lv = loadFixture();
const index = buildPositionIndex(lv.tree);

describe('issueUrl', () => {
  it('führt nichts aus der geladenen Datei mit', () => {
    const url = decodeURIComponent(issueUrl({ view: 'matrix', loaded: true }));

    // Weder Dateiname noch Projektname …
    expect(url).not.toContain(lv.fileName);
    if (lv.projectName !== null) expect(url).not.toContain(lv.projectName);

    // … noch OZ, Kurztext oder Langtext einer Position.
    for (const position of index.positions) {
      expect(url).not.toContain(position.oz);
      expect(url).not.toContain(position.shortText);
    }
    for (const position of index.positions.slice(0, 5)) {
      const satz = position.longText.split('\n')[0];
      if (satz.length > 10) expect(url).not.toContain(satz);
    }
  });

  it('trägt ausschließlich die sechs erlaubten Angaben', () => {
    // Die schärfere Probe: nicht „diese Werte fehlen", sondern „mehr als das
    // steht gar nicht drin". Eine Zahl aus der Datei fiele damit auf, auch
    // wenn niemand vorher an sie gedacht hat.
    const erlaubt = ['Bubble-Stand', 'Ansicht', 'Datei geladen', 'Browser', 'Sprache', 'Fenster'];
    const angaben = issueBody({ view: 'matrix', loaded: true })
      .split('\n')
      .filter((zeile) => zeile.startsWith('- '))
      .map((zeile) => zeile.slice(2).split(':')[0]);
    expect(angaben).toEqual(erlaubt);
  });

  it('nennt genau die technischen Angaben, die den Fehler einordnen', () => {
    const body = issueBody({ view: 'graph', loaded: true });
    expect(body).toContain('- Ansicht: graph');
    expect(body).toContain('- Datei geladen: ja');
    expect(body).toContain('- Browser:');
    expect(body).toContain('- Bubble-Stand:');
  });

  it('sagt auch, wenn gar keine Datei geladen ist', () => {
    expect(issueBody({ view: 'overview', loaded: false })).toContain('- Datei geladen: nein');
  });

  it('zeigt auf das Formular des Projekts, nicht auf eine eigene Adresse', () => {
    const url = issueUrl({ view: 'table', loaded: true });
    // Kein eigener Server, keine Sammelstelle — nur GitHub, vom Nutzer selbst
    // abgeschickt (docs/decisions/0017-keine-nutzungsmessung.md).
    expect(url.startsWith('https://github.com/NicPalapte/bubbleLV/issues/new?')).toBe(true);
    expect(url).toContain('labels=bug');
  });
});
