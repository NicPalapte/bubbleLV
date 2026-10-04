// Import-Log des Überblicks: was beim Laden der Datei aufgefallen ist.
//
// Der Parser meldet keine Warnungen — er wirft nur bei unlesbaren Dateien. Was
// hier steht, ist deshalb **abgeleitet**: Lücken, die in der geladenen Datei
// sichtbar sind (fehlende Einheit, Menge, Preis) und Positionen, die die
// Klassifizierung nicht einordnen konnte. Es gilt immer für die **ganze Datei**,
// nicht für den aktiven Filter: ein Importproblem verschwindet nicht, weil man
// gerade einen Ausschnitt ansieht.
//
// Reine Funktion über dem flachen Positions-Index (WP-I), einmal je Import.

import { attrString } from '../attributes';
import { canonicalUnit } from '../units';
import type { PositionIndex } from '../index/positionIndex';

export type LogLevel = 'hinweis' | 'beachten';

export type LogKind =
  | 'ohneEinheit'
  | 'ohneMenge'
  | 'ohnePreis'
  | 'ohneGewerk'
  | 'ohneBauteiltyp'
  | 'ohneText'
  | 'doppelteOz';

export interface LogEntry {
  kind: LogKind;
  level: LogLevel;
  /** Was auffiel, in einer Zeile. */
  title: string;
  /** Warum es für das Lesen der Datei zählt, ein Satz. */
  note: string;
  /** Knoten-IDs der betroffenen Positionen, in Dokumentreihenfolge. */
  positionIds: string[];
}

export interface ImportLog {
  /** Alle Positionen der Datei — Bezugsgröße der Zähler. */
  total: number;
  /** Nur Einträge mit mindestens einem Fund. */
  entries: LogEntry[];
}

export function buildImportLog(index: PositionIndex): ImportLog {
  const ohneEinheit: string[] = [];
  const ohneMenge: string[] = [];
  const ohnePreis: string[] = [];
  const ohneGewerk: string[] = [];
  const ohneBauteiltyp: string[] = [];
  const ohneText: string[] = [];
  // Als Positionsnummern gesammelt: das erste Vorkommen kommt erst mit dem zweiten
  // dazu, die Liste soll aber in Dokumentreihenfolge stehen.
  const doppelteSlots = new Set<number>();
  const seenOz = new Map<string, number>();

  let hasPrices = false;
  for (let i = 0; i < index.size; i++) {
    if (Number.isFinite(index.unitPrice[i])) {
      hasPrices = true;
      break;
    }
  }

  for (let i = 0; i < index.size; i++) {
    const position = index.positions[i];
    const id = index.nodes[i].id;

    if (canonicalUnit(position.unit) === null) ohneEinheit.push(id);
    if (!Number.isFinite(index.quantity[i])) ohneMenge.push(id);
    // Ohne Preise in der ganzen Datei (x83) ist „ohne Preis" keine Lücke.
    if (hasPrices && !Number.isFinite(index.unitPrice[i])) ohnePreis.push(id);
    if (attrString(position.attributes, 'gewerk') === null) ohneGewerk.push(id);
    if (
      attrString(position.attributes, 'positionsart') === 'bauteil' &&
      attrString(position.attributes, 'bauteiltyp') === null
    ) {
      ohneBauteiltyp.push(id);
    }
    if (position.shortText.trim() === '' && position.longText.trim() === '') ohneText.push(id);

    // Eine fehlende OZ ist keine doppelte: sonst meldeten zwei leere OZ einen Fehlalarm.
    if (position.oz.trim() === '') continue;
    const first = seenOz.get(position.oz);
    if (first === undefined) seenOz.set(position.oz, i);
    else {
      doppelteSlots.add(first);
      doppelteSlots.add(i);
    }
  }

  const doppelteOz = [...doppelteSlots].sort((a, b) => a - b).map((slot) => index.nodes[slot].id);

  const entries: LogEntry[] = [];
  const add = (
    kind: LogKind,
    level: LogLevel,
    title: string,
    note: string,
    positionIds: string[],
  ): void => {
    if (positionIds.length > 0) entries.push({ kind, level, title, note, positionIds });
  };

  add(
    'ohneEinheit',
    'beachten',
    'Positionen ohne Einheit',
    'Ohne Einheit lässt sich die Menge nicht einordnen; sie fehlen unter „Mengen je Einheit".',
    ohneEinheit,
  );
  add(
    'ohneMenge',
    'beachten',
    'Positionen ohne Menge',
    'Die Datei führt für diese Positionen keine Menge — Summen und Mengenfilter lassen sie aus.',
    ohneMenge,
  );
  add(
    'ohnePreis',
    'hinweis',
    'Positionen ohne Einheitspreis',
    'Die Datei führt sonst Preise — diese Positionen zählen mit 0 € in die Summe.',
    ohnePreis,
  );
  add(
    'ohneGewerk',
    'hinweis',
    'Nicht klassifiziert: kein Gewerk',
    'Die Klassifizierung ordnet diese Positionen keinem Gewerk zu. Filter „Ohne Gewerk" zeigt sie.',
    ohneGewerk,
  );
  add(
    'ohneBauteiltyp',
    'hinweis',
    'Bauteil ohne Bauteiltyp',
    'Als Bauteil erkannt, aber ohne Typ (z. B. Wand, Decke) — fehlt in Filter und Gruppierung.',
    ohneBauteiltyp,
  );
  add(
    'ohneText',
    'beachten',
    'Positionen ohne Text',
    'Weder Kurz- noch Langtext vorhanden — die Klassifizierung hat nichts zum Lesen.',
    ohneText,
  );
  add(
    'doppelteOz',
    'beachten',
    'Doppelte Ordnungszahl',
    'Dieselbe OZ steht mehrfach in der Datei — Verweise auf die OZ sind dann nicht eindeutig.',
    doppelteOz,
  );

  return { total: index.size, entries };
}
