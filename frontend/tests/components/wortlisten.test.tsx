// Reiter „Wortlisten“ (Entscheidung 0090): Grundstock-Wörter abschalten, eigene Wörter und
// Listen anlegen, Listen als CSV exportieren.

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { readWordLists } from '../../src/lib/persist/lastLv';
import { GRUNDSTOCK_LISTS } from '../../src/lib/rules/wissen';
import { WordListsTab } from '../../src/components/admin/WordListsTab';
import { AdminProvider } from '../../src/state/admin';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const renderTab = () =>
  render(
    <AdminProvider>
      <WordListsTab />
    </AdminProvider>,
  );

describe('Reiter „Wortlisten“', () => {
  it('schaltet Grundstock-Wörter ab und nimmt eigene dazu', async () => {
    renderTab();
    const nav = screen.getByRole('navigation', { name: 'Wortlisten' });
    fireEvent.click(within(nav).getByRole('button', { name: 'risiko' }));
    const detail = screen.getByRole('region', { name: 'risiko' });
    const first = GRUNDSTOCK_LISTS.get('risiko')?.words[0] ?? '';
    const chip = within(detail).getByRole('button', { name: first });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    fireEvent.change(within(detail).getByLabelText('Wort hinzufügen'), {
      target: { value: 'bauseits gestellt' },
    });
    fireEvent.click(within(detail).getByRole('button', { name: 'Hinzufügen' }));
    expect(within(detail).getByText('bauseits gestellt')).toBeInTheDocument();
    expect(within(nav).getByText('geändert')).toBeInTheDocument();
    expect(within(detail).getByText('Risiko auf Auftragnehmer')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await readWordLists()).toEqual([
        { art: 'aus', liste: 'risiko', wort: first },
        { art: 'wort', liste: 'risiko', wort: 'bauseits gestellt' },
      ]),
    );

    fireEvent.click(within(detail).getByRole('button', { name: 'bauseits gestellt entfernen' }));
    fireEvent.click(chip);
    await waitFor(async () => expect(await readWordLists()).toEqual([]));
  });

  it('legt eigene Listen an, benennt sie um und löscht sie', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '+ Neue Liste' }));
    const name = screen.getByLabelText('Name der Liste');
    fireEvent.change(name, { target: { value: 'Wasser im Baugrund' } });
    fireEvent.blur(name);
    const nav = screen.getByRole('navigation', { name: 'Wortlisten' });
    expect(within(nav).getByRole('button', { name: 'Wasser im Baugrund' })).toBeInTheDocument();
    await waitFor(async () =>
      expect(await readWordLists()).toEqual([
        { art: 'liste', liste: 'eigene-neue-liste', name: 'Wasser im Baugrund' },
      ]),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Liste löschen' }));
    expect(within(nav).queryByRole('button', { name: 'Wasser im Baugrund' })).toBeNull();
    await waitFor(async () => expect(await readWordLists()).toEqual([]));
  });

  it('zeigt bei Listen aus dem Einlesen einen Hinweis', () => {
    renderTab();
    const nav = screen.getByRole('navigation', { name: 'Wortlisten' });
    fireEvent.click(within(nav).getByRole('button', { name: 'bieterangabe' }));
    expect(screen.getByText(/Wirkt schon beim Einlesen der Datei/)).toBeInTheDocument();
  });
});
