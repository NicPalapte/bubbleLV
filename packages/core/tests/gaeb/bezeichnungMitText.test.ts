// Bezeichnung eines LV-Bereichs mit Beschreibungstext (Issue #196): das Schema
// erlaubt in <LblTx> mehrere Absätze. Name ist der erste Absatz, der Rest bleibt
// als Text erhalten. Alle Texte erfunden.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toLvExport } from '../../src/export/lvExport';
import { getGaebParser, mapToLvDraft } from '../../src/gaeb';
import { hashPositions } from '../../src/hash/positionHash';
import { splitLabel } from '../../src/gaeb/text';
import { FIXTURE_DIR } from '../support/fixtures';

function element(xml: string): Element {
  return new DOMParser().parseFromString(xml, 'application/xml').documentElement;
}

const MIT_TEXT = `<LblTx>
  <p><span>Pflanzarbeiten</span></p>
  <p />
  <p><span style="font-weight:normal;">Alle Gehölze sind vor Ort abzunehmen.</span></p>
  <p><span style="font-weight:normal;">- Hochstämme mit Ballen</span></p>
  <p><span style="font-weight:normal;">- Sträucher im Container</span></p>
</LblTx>`;

describe('splitLabel', () => {
  it('nimmt den ersten Absatz als Namen, den Rest als Text', () => {
    expect(splitLabel(element(MIT_TEXT))).toEqual({
      label: 'Pflanzarbeiten',
      text: 'Alle Gehölze sind vor Ort abzunehmen.\n- Hochstämme mit Ballen\n- Sträucher im Container',
    });
  });

  it('lässt eine einfache Bezeichnung ohne Text', () => {
    expect(splitLabel(element('<LblTx><p><span>Erdarbeiten</span></p></LblTx>'))).toEqual({
      label: 'Erdarbeiten',
      text: null,
    });
  });

  it('hält eine vom Export umbrochene Überschrift zusammen', () => {
    const umbrochen = `<LblTx>
      <p>Oberbodenarbeiten einschließlich Abtrag, Zwischenlagerung</p>
      <p>und Wiedereinbau</p>
    </LblTx>`;
    expect(splitLabel(element(umbrochen))).toEqual({
      label: 'Oberbodenarbeiten einschließlich Abtrag, Zwischenlagerung und Wiedereinbau',
      text: null,
    });
  });

  it('trennt nur an echten Absätzen: ohne Leerzeile gilt die Zeile als fortgesetzt', () => {
    const ohneLeerzeile = '<LblTx><p>Pflanzarbeiten</p><p>im Bereich Nord</p></LblTx>';
    expect(splitLabel(element(ohneLeerzeile))).toEqual({
      label: 'Pflanzarbeiten im Bereich Nord',
      text: null,
    });
  });

  it('liefert für leere oder fehlende Bezeichnung nichts', () => {
    expect(splitLabel(element('<LblTx><p /></LblTx>'))).toEqual({ label: null, text: null });
    expect(splitLabel(null)).toEqual({ label: null, text: null });
  });
});

describe('Parser: Bezeichnung mit Text', () => {
  const original = readFileSync(resolve(FIXTURE_DIR, 'sample.X83'), 'utf8');
  const xml = original
    .replace(
      '<span>Erdarbeiten</span>',
      '<span>Erdarbeiten</span></p><p /><p>Aushub ist seitlich zu lagern.',
    )
    .replace(
      '<span>Los 1 - Rohbau</span>',
      '<span>Los 1 - Rohbau</span></p><p /><p>Gilt für alle Gebäude.',
    );
  const bytes = new TextEncoder().encode(xml);
  const parsed = getGaebParser().parse(bytes, 'mit-text.X83');

  it('trennt Name und Text bei Abschnitt und Los', () => {
    expect(parsed.lots[0].label).toBe('Los 1 - Rohbau');
    expect(parsed.lots[0].text).toBe('Gilt für alle Gebäude.');
    expect(parsed.lots[0].sections[0].label).toBe('Erdarbeiten');
    expect(parsed.lots[0].sections[0].text).toBe('Aushub ist seitlich zu lagern.');
    expect(parsed.lots[0].sections[1].text).toBeNull();
  });

  it('reicht den Text ins LVDraft und in den Export, nur wo es ihn gibt', () => {
    const draft = mapToLvDraft(parsed);
    expect(draft.lots[0].sections[0].text).toBe('Aushub ist seitlich zu lagern.');
    expect('text' in draft.lots[0].sections[1]).toBe(false);
    const exported = toLvExport(draft, 'test');
    expect(exported.lots[0].text).toBe('Gilt für alle Gebäude.');
    expect(exported.lots[0].sections[0].text).toBe('Aushub ist seitlich zu lagern.');
    expect('text' in exported.lots[0].sections[1]).toBe(false);
  });

  it('ändert keinen Positions-Hash', () => {
    const before = mapToLvDraft(
      getGaebParser().parse(new TextEncoder().encode(original), 'sample.X83'),
    );
    const after = mapToLvDraft(parsed);
    const ids = (d: typeof before) => [...hashPositions(d).values()].map((h) => h.id);
    expect(ids(after)).toEqual(ids(before));
  });
});
