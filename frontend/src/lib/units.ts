// Einheiten zusammenführen, die nur anders geschrieben sind. GAEB liefert das
// Feld <QU> als freien Text; ein LV, das aus mehreren Teil-LVs entstanden ist,
// schreibt dieselbe Einheit deshalb regelmäßig verschieden ("psch" und "PSCH").
// Ohne Zusammenführung stünden zwei Filterwerte für eine Einheit — der Filter
// würde die Hälfte der Pauschalpositionen übersehen.
//
// **Nur der Filter führt zusammen.** Tabelle und Eigenschaften-Panel zeigen
// weiter den Wortlaut aus der Datei: Bubble macht ein LV lesbar, es schreibt es
// nicht um.
//
// Zwei Stufen:
//  1. **Schreibweise** — Groß-/Kleinschreibung, Leerraum, hochgestellte Ziffern.
//     Das ist objektiv und steht hier im Code.
//  2. **Inhaltliche Gruppen** — „Stk" und „Stück" sind dieselbe Einheit, „lfm"
//     und „m" nicht (das eine ist eine Abrechnungsart). Das ist eine Fachaussage
//     und steht deshalb in docs/domain/reference/einheiten-gruppen.csv, nicht im
//     Code. Ist die Datei leer, greift nur Stufe 1 — kein Fehler.

import gruppenCsv from './check/data/einheiten-gruppen.csv?raw';
import { parseCsv, splitList } from './csv';

/** Hochgestellte Ziffern, wie sie in "m²"/"m³" vorkommen. */
const SUPERSCRIPT: Readonly<Record<string, string>> = { '¹': '1', '²': '2', '³': '3' };

/** Reine Schreibweisen-Normalisierung, ohne fachliche Gruppen. */
export function unitSpelling(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const key = raw
    .replace(/[¹²³]/g, (char) => SUPERSCRIPT[char])
    .replace(/\s+/g, '')
    .toLowerCase();
  return key === '' ? null : key;
}

export interface UnitGroup {
  /** Anzeigename der Gruppe, z. B. "Stück". */
  name: string;
  /** Schreibweisen, die dazugehören — bereits normalisiert. */
  spellings: string[];
}

function loadGroups(): Map<string, UnitGroup> {
  const bySpelling = new Map<string, UnitGroup>();
  for (const row of parseCsv(gruppenCsv)) {
    const name = row.get('gruppe');
    if (name === '') continue;
    const spellings = splitList(row.get('schreibweisen'))
      .map((entry) => unitSpelling(entry))
      .filter((entry): entry is string => entry !== null);
    if (spellings.length === 0) continue;
    const group: UnitGroup = { name, spellings };
    for (const spelling of spellings) bySpelling.set(spelling, group);
  }
  return bySpelling;
}

let groups: Map<string, UnitGroup> | null = null;

function groupOf(spelling: string): UnitGroup | undefined {
  groups ??= loadGroups();
  return groups.get(spelling);
}

/** Alle gepflegten Gruppen — leer, solange die Referenzdatei nur die Kopfzeile hat. */
export function unitGroups(): UnitGroup[] {
  groups ??= loadGroups();
  return [...new Set(groups.values())];
}

/**
 * Vergleichsschlüssel einer Einheit. Gleicher Schlüssel = gleiche Einheit —
 * sei es nur anders geschrieben oder laut Referenzliste dieselbe.
 * `null` für fehlende oder leere Angaben.
 */
export function canonicalUnit(raw: string | null | undefined): string | null {
  const spelling = unitSpelling(raw);
  if (spelling === null) return null;
  return groupOf(spelling)?.name ?? spelling;
}

/**
 * Anzeigename eines Schlüssels im Filter. Gruppen tragen ihren gepflegten Namen
 * ("Stück"), Flächen und Volumen die übliche Schreibweise. Alles andere steht
 * klein, weil die Groß-/Kleinschreibung ja gerade zusammengeführt wurde.
 */
const LABELS: Readonly<Record<string, string>> = { m2: 'm²', m3: 'm³' };

export function unitLabel(key: string): string {
  return LABELS[key] ?? key;
}
