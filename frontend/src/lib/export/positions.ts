// Lokaler Export der gefilterten Positionen (WP-P, Schritt 3).
//
// **Kein Request.** Hier entsteht nur Text; wer ihn zu einer Datei macht, steht
// in components/common/download.ts. Die Datei verlässt den Browser nicht
// (.claude/CLAUDE.md#kritische-constraints).
//
// Exportiert werden **alle** Spalten, nicht die gerade sichtbaren: welche
// Spalten in der Tabelle stehen, ist eine Ansichtseinstellung; was im Export
// fehlt, merkt man dagegen erst, wenn die Datei schon weitergereicht ist.
// Die Zeilen sind die gefilterte Menge — das ist die Zusage aus dem Plan.

import {
  EMPTY_ANNOTATIONS,
  formatAt,
  IMPORTANT_INFO,
  PROGRESS_INFO,
  type Annotations,
} from '../annotations';
import { attributeLabel, attrString, attrStrings } from '../attributes';
import { materialKatalog } from '../classify/material/katalog';
import { canonicalUnit, unitLabel } from '../units';
import { csvText } from './csvText';
import type { PositionIndex } from '../index/positionIndex';

function progressLabel(notes: Annotations, id: string): string {
  const progress = notes.progress.get(id);
  return progress === undefined ? '' : PROGRESS_INFO[progress].label;
}

function importantLabel(notes: Annotations, id: string): string {
  return notes.important.has(id) ? IMPORTANT_INFO.label : '';
}

/** Alle Kommentare einer Position, je Zeile mit Zeitpunkt, älteste zuerst. */
function commentText(notes: Annotations, id: string): string {
  const lines: string[] = [];
  for (const entry of notes.log.get(id) ?? []) {
    if (entry.kind !== 'comment') continue;
    const at = formatAt(entry.at);
    lines.push(at === '' ? entry.text : `${at} ${entry.text}`);
  }
  return lines.join('\n');
}

/** Spalten des Exports, in dieser Reihenfolge. */
const COLUMNS: ReadonlyArray<{
  head: string;
  of(index: PositionIndex, slot: number, notes: Annotations): string;
}> = [
  { head: 'OZ', of: (index, i) => index.positions[i].oz },
  { head: 'Kurztext', of: (index, i) => index.positions[i].shortText },
  { head: 'Einheit', of: (index, i) => einheit(index, i) },
  { head: 'Menge', of: (index, i) => zahl(index.quantity[i]) },
  { head: 'Einheitspreis', of: (index, i) => zahl(index.unitPrice[i]) },
  { head: 'Gesamtpreis', of: (index, i) => gesamtpreis(index, i) },
  { head: 'Positionstyp', of: (index, i) => index.positions[i].positionType },
  { head: 'Positionsart', of: (index, i) => attr(index, i, 'positionsart') },
  { head: 'Druckfestigkeit', of: (index, i) => attr(index, i, 'beton') },
  { head: 'Exposition', of: (index, i) => liste(index, i, 'expo') },
  // Material und je Materialtabelle ihre Merkmale (Entscheidung 0045).
  { head: 'Material', of: (index, i) => liste(index, i, 'material') },
  ...materialKatalog().flatMap((material) =>
    material.merkmale.map(({ key }) => ({
      head: attributeLabel(key),
      of: (index: PositionIndex, i: number) => liste(index, i, key),
    })),
  ),
  { head: 'Normen', of: (index, i) => liste(index, i, 'normen') },
  { head: 'Zeitbezug', of: (index, i) => liste(index, i, 'fristen') },
  { head: 'Offene Stellen', of: (index, i) => liste(index, i, 'platzhalter') },
  { head: 'Besonderheiten', of: (index, i) => liste(index, i, 'keywords') },
  // Eigene Notizen (Entscheidungen 0047, 0053) — stehen in der Tabelle, also auch hier.
  { head: 'Fortschritt', of: (index, i, notes) => progressLabel(notes, index.nodes[i].id) },
  { head: 'Wichtig', of: (index, i, notes) => importantLabel(notes, index.nodes[i].id) },
  { head: 'Kommentar', of: (index, i, notes) => commentText(notes, index.nodes[i].id) },
  { head: 'Langtext', of: (index, i) => index.positions[i].longText },
];

function einheit(index: PositionIndex, slot: number): string {
  const unit = canonicalUnit(index.positions[slot].unit);
  return unit === null ? '' : unitLabel(unit);
}

/**
 * Zahl in deutscher Schreibweise; `NaN` wird zu einem leeren Feld. Eine 0 wäre
 * eine erfundene Menge — die Datei führt an dieser Stelle schlicht nichts.
 *
 * Gerundet wird **nicht**: was die Datei führt, geht so hinaus, wie es drin
 * steht. Ein Einheitspreis mit vier Nachkommastellen ist im GAEB-Format
 * zulässig, und eine auf zwei Stellen gekürzte Zahl in einer Tabelle, mit der
 * jemand weiterrechnet, wäre ein stiller Fehler.
 */
function zahl(value: number): string {
  return Number.isFinite(value) ? String(value).replace('.', ',') : '';
}

/**
 * Rundungsreste aus der Fließkomma-Multiplikation entfernen. Der Gesamtpreis
 * ist der einzige Wert, den **wir** rechnen (Menge × EP in buildTree): aus
 * 7,2 × 18,4 macht JavaScript 132,48000000000002, und genau diese Ziffernkette
 * stünde sonst in der Tabelle. Zehn Nachkommastellen lassen jede echte
 * Genauigkeit stehen und schneiden nur das Rauschen ab.
 */
function ohneRundungsrest(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(10)) : value;
}

/**
 * Gesamtpreis der Zeile. `index.totalPrice` rechnet fehlende Werte als 0
 * (`lineTotal` in buildTree.ts) — richtig für die Summen am Baum, die nicht an
 * `NaN` scheitern dürfen. In einer Zeile wäre diese 0 dagegen eine Behauptung:
 * sie liest sich wie ein Nullpreis und nicht wie „keine Angabe". Führt die
 * Datei Menge oder Preis nicht, bleibt das Feld deshalb leer.
 */
function gesamtpreis(index: PositionIndex, slot: number): string {
  if (!Number.isFinite(index.quantity[slot]) || !Number.isFinite(index.unitPrice[slot])) return '';
  return zahl(ohneRundungsrest(index.totalPrice[slot]));
}

function attr(index: PositionIndex, slot: number, key: string): string {
  return attrString(index.positions[slot].attributes, key) ?? '';
}

function liste(index: PositionIndex, slot: number, key: string): string {
  return attrStrings(index.positions[slot].attributes, key).join(', ');
}

/**
 * Die gefilterten Positionen als CSV. `mask` ist die Trefferbitmaske;
 * `null` heißt „kein Filter aktiv", dann steht das ganze LV drin.
 * `notes` sind die eigenen Markierungen und Kommentare.
 */
export function positionsCsv(
  index: PositionIndex,
  mask: Uint8Array | null,
  notes: Annotations = EMPTY_ANNOTATIONS,
): string {
  const zeilen: string[][] = [COLUMNS.map((column) => column.head)];
  for (let i = 0; i < index.size; i++) {
    if (mask !== null && mask[i] !== 1) continue;
    zeilen.push(COLUMNS.map((column) => column.of(index, i, notes)));
  }
  return csvText(zeilen);
}
