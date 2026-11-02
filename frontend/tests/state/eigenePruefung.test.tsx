// „Prüfung“ mit den Regeln dieser Firma (Entscheidung 0089): eigene Prüfhinweise laufen mit,
// abgeschaltete Grundstock-Regeln fehlen. Der Worker prüft beim Laden nur mit dem Grundstock;
// der Viewer prüft danach noch einmal, sobald die Regeln davon abweichen.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { IDBFactory } from 'fake-indexeddb';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { RULE_SCHEMA, type Rule } from '@core';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { readGrundstockOff, readWordLists } from '../../src/lib/persist/lastLv';
import { AdminProvider, useAdmin } from '../../src/state/admin';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

function loadFixture() {
  const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
  return runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <AdminProvider>
    <ViewerProvider>{children}</ViewerProvider>
  </AdminProvider>
);

const EIGENE: Rule = {
  schema: RULE_SCHEMA,
  id: 'normalposition-pruefen',
  version: 1,
  name: 'Normalposition prüfen',
  bedingung: { alle: [{ feld: 'art', ist: ['normal'] }], bereich: 'feld', wo: ['langtext'] },
  wirkung: { pruefhinweis: { kategorie: 'risiko', schwere: 'hinweis', text: 'Erfunden.' } },
  geltung: 'unternehmen',
  status: 'freigegeben',
  herkunft: 'nutzer',
};

describe('Prüfung mit eigenen Regeln', () => {
  it('nimmt eigene Prüfhinweise auf und lässt abgeschaltete Grundstock-Regeln weg', async () => {
    const lv = loadFixture();
    const { result } = renderHook(
      () => ({ admin: useAdmin(), viewer: useViewer(), dispatch: useViewerDispatch() }),
      { wrapper },
    );
    act(() => result.current.dispatch({ type: 'loaded', lv }));
    const ids = (): string[] => result.current.viewer.lv?.check.rules.map((rule) => rule.id) ?? [];
    expect(ids()).toContain('v1-bedarfsposition');
    expect(ids()).not.toContain(EIGENE.id);

    act(() => {
      result.current.admin.setGrundstockOn('v1-bedarfsposition', false);
      result.current.admin.saveRule(EIGENE);
    });
    await waitFor(() => expect(ids()).toContain(EIGENE.id));
    expect(ids()).not.toContain('v1-bedarfsposition');
    const check = result.current.viewer.lv?.check;
    expect(check?.rules.find((rule) => rule.id === EIGENE.id)?.count).toBeGreaterThan(0);
    expect(check?.flags.some((flag) => flag.id === EIGENE.id)).toBe(true);
    expect([...result.current.viewer.hints.values()].length).toBeGreaterThan(0);
    await waitFor(async () => expect(await readGrundstockOff()).toEqual(['v1-bedarfsposition']));

    // Zurück auf den Grundstock: wieder das Ergebnis aus dem Laden.
    act(() => {
      result.current.admin.setGrundstockOn('v1-bedarfsposition', true);
      result.current.admin.deleteRule(EIGENE.id);
    });
    await waitFor(() => expect(ids()).not.toContain(EIGENE.id));
    await waitFor(() => expect(result.current.viewer.lv?.check).toBe(lv.check));
  });

  it('rechnet Grundstock-Regeln mit eigenen Wörtern neu (Entscheidung 0090)', async () => {
    const lv = loadFixture();
    const { result } = renderHook(
      () => ({ admin: useAdmin(), viewer: useViewer(), dispatch: useViewerDispatch() }),
      { wrapper },
    );
    act(() => result.current.dispatch({ type: 'loaded', lv }));
    const count = (): number =>
      result.current.viewer.lv?.check.rules.find((rule) => rule.id === 'v4-risiko')?.count ?? 0;
    const before = count();
    const position = (): number =>
      result.current.viewer.lv?.check.rules.findIndex((rule) => rule.id === 'v4-risiko') ?? -1;
    const at = position();

    // Erfundenes Risiko-Wort, das im Beispiel-LV vorkommt.
    act(() => result.current.admin.addWord('risiko', 'bauseits gestellt'));
    await waitFor(() => expect(count()).toBeGreaterThan(before));
    expect(position()).toBe(at);
    await waitFor(async () =>
      expect(await readWordLists()).toEqual([
        { art: 'wort', liste: 'risiko', wort: 'bauseits gestellt' },
      ]),
    );

    act(() => result.current.admin.removeWord('risiko', 'bauseits gestellt'));
    await waitFor(() => expect(result.current.viewer.lv?.check).toBe(lv.check));
  });
});
