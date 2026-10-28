// Eigene Regeln im Admin-Zustand (Entscheidung 0081): Kennungen bleiben eindeutig,
// eine Grundstock-Kennung lässt sich nicht als eigene Regel speichern.

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { readOwnRules } from '../../src/lib/persist/lastLv';
import { GRUNDSTOCK, newRule } from '../../src/lib/rules/rules';
import { AdminProvider, useAdmin } from '../../src/state/admin';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <AdminProvider>{children}</AdminProvider>
);

describe('eigene Regeln', () => {
  it('nimmt keine Kennung aus dem Grundstock an', async () => {
    const [base] = GRUNDSTOCK;
    const { result } = renderHook(() => useAdmin(), { wrapper });
    const own = newRule(new Set(GRUNDSTOCK.map((rule) => rule.id)));
    act(() => {
      result.current.saveRule({ ...base, name: 'Überschrieben' });
      result.current.saveRule(own);
    });
    await waitFor(async () =>
      expect((await readOwnRules())?.map((rule) => rule.id)).toEqual([own.id]),
    );
    const ids = result.current.rules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.current.rules.find((rule) => rule.id === base.id)?.name).toBe(base.name);
  });
});
