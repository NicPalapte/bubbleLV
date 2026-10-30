// Wissen für die Bausteine aus Entscheidung 0085: Wortlisten und Einheiten-Gruppen. Es bleibt
// in den gepflegten CSV unter docs/domain/reference/ und kommt hier als `RuleContext` zum
// Auswerter des Kerns. Enthält eine Datei nur die Kopfzeile, ist die Liste leer — eine Regel,
// die sie braucht, steht dann in „Prüfung“ als inaktiv mit Grund (lib/check/index.ts).

import herstellerCsv from '@reference/hersteller-produktnamen.csv?raw';
import risikoCsv from '@reference/risiko-formulierungen.csv?raw';
import wortlistenCsv from '@reference/wortlisten.csv?raw';
import type { RuleContext } from '@core';
import { parseCsv } from '../csv';
import { splitStichworte } from '../classify/material/stichwort';
import { unitGroups } from '../units';

const REFERENCE = 'docs/domain/reference';

/** Wortliste je Name, dazu die Datei, in der sie gepflegt wird. */
interface WordList {
  readonly words: readonly string[];
  readonly file: string;
}

function readLists(): Map<string, WordList> {
  const lists = new Map<string, WordList>();
  // Je Hersteller der Name selbst und seine Produktnamen.
  lists.set('hersteller', {
    file: `${REFERENCE}/hersteller-produktnamen.csv`,
    words: parseCsv(herstellerCsv).flatMap((row) =>
      row.get('name') === '' ? [] : [row.get('name'), ...splitStichworte(row.get('stichworte'))],
    ),
  });
  lists.set('risiko', {
    file: `${REFERENCE}/risiko-formulierungen.csv`,
    words: parseCsv(risikoCsv)
      .map((row) => row.get('formulierung'))
      .filter((text) => text !== ''),
  });
  for (const row of parseCsv(wortlistenCsv)) {
    const name = row.get('liste');
    if (name === '') continue;
    const known = lists.get(name)?.words ?? [];
    lists.set(name, {
      file: `${REFERENCE}/wortlisten.csv`,
      words: [...known, ...splitStichworte(row.get('stichworte'))],
    });
  }
  return lists;
}

const LISTS = readLists();

/** Datei, in der eine Wortliste gepflegt wird — für den Grund, warum eine Regel ruht. */
export function listFileOf(name: string): string {
  return LISTS.get(name)?.file ?? `${REFERENCE}/wortlisten.csv`;
}

/**
 * Wortlisten und Einheiten-Gruppen für alle Auswertungen der App. Eingebaute Logik fehlt
 * hier: sie braucht das ganze LV und läuft in „Prüfung“ (lib/check/builtins.ts).
 */
export const WISSEN: RuleContext = {
  listen: new Map([...LISTS].map(([name, list]) => [name, list.words])),
  einheitGruppen: new Map(unitGroups().map((group) => [group.name, group.spellings])),
};
