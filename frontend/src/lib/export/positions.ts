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

import { attrString, attrStrings } from '../attributes';
import { canonicalUnit, unitLabel } from '../units';
import type { PositionIndex } from '../index/positionIndex';

/** Spalten des Exports, in dieser Reihenfolge. */
const COLUMNS: ReadonlyArray<{ head: string; of(index: PositionIndex, slot: number): string }> = [
  { head: 'OZ', of: (index, i) => index.positions[i].oz },
  { head: 'Kurztext', of: (index, i) => index.positions[i].shortText },
  { head: 'Einheit', of: (index, i) => einheit(index, i) },
  { head: 'Menge', of: (index, i) => zahl(index.quantity[i]) },
  { head: 'Einheitspreis', of: (index, i) => zahl(index.unitPrice[i]) },
  { head: 'Gesamtpreis', of: (index, i) => zahl(ohneRundungsrest(index.totalPrice[i])) },
  { head: 'Positionstyp', of: (index, i) => index.positions[i].positionType },
  { head: 'Gewerk', of: (index, i) => attr(index, i, 'gewerk') },
  { head: 'Bauteiltyp', of: (index, i) => attr(index, i, 'bauteiltyp') },
  { head: 'Positionsart', of: (index, i) => attr(index, i, 'positionsart') },
  { head: 'Druckfestigkeit', of: (index, i) => attr(index, i, 'beton') },
  { head: 'Exposition', of: (index, i) => liste(index, i, 'expo') },
  { head: 'Material', of: (index, i) => liste(index, i, 'material') },
  { head: 'Normen', of: (index, i) => liste(index, i, 'normen') },
  { head: 'Zeitbezug', of: (index, i) => liste(index, i, 'fristen') },
  { head: 'Offene Stellen', of: (index, i) => liste(index, i, 'platzhalter') },
  { head: 'Besonderheiten', of: (index, i) => liste(index, i, 'keywords') },
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

function attr(index: PositionIndex, slot: number, key: string): string {
  return attrString(index.positions[slot].attributes, key) ?? '';
}

function liste(index: PositionIndex, slot: number, key: string): string {
  return attrStrings(index.positions[slot].attributes, key).join(', ');
}

/** Zeichen, mit denen Excel und LibreOffice eine Formel beginnen lassen. */
const FORMELSTART = /^[=+\-@\t\r]/;

/** Eine Zahl, wie `zahl()` sie schreibt — die darf so bleiben. */
const ZAHL = /^-?\d+(?:,\d+)?$/;

/**
 * Formel-Start entschärfen (CSV-Injection, CWE-1236). Texte stammen aus der
 * geladenen Datei, und die kommt im Vergabeverfahren selten vom Leser selbst:
 * ein Kurztext `=HYPERLINK("…")` würde beim Öffnen der Datei in Excel als
 * Formel ausgeführt. Das führende Apostroph macht daraus wieder Text.
 *
 * Zahlen bleiben unangetastet: ein negativer Einheitspreis („-50") ist eine
 * Zahl und soll in Excel auch als Zahl ankommen.
 */
function entschaerfen(value: string): string {
  return FORMELSTART.test(value) && !ZAHL.test(value) ? `'${value}` : value;
}

/**
 * Ein CSV-Feld. Semikolon als Trennzeichen, weil Excel in deutscher
 * Spracheinstellung nur das als Spaltentrenner liest — mit Komma landet die
 * ganze Zeile in einer Zelle. Zeilenumbrüche im Langtext bleiben erhalten;
 * in Anführungszeichen ist das gültiges CSV.
 */
function feld(roh: string): string {
  const value = entschaerfen(roh);
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Die gefilterten Positionen als CSV. `mask` ist die Trefferbitmaske;
 * `null` heißt „kein Filter aktiv", dann steht das ganze LV drin.
 */
export function positionsCsv(index: PositionIndex, mask: Uint8Array | null): string {
  const zeilen: string[] = [COLUMNS.map((column) => feld(column.head)).join(';')];
  for (let i = 0; i < index.size; i++) {
    if (mask !== null && mask[i] !== 1) continue;
    zeilen.push(COLUMNS.map((column) => feld(column.of(index, i))).join(';'));
  }
  // CRLF: Excel erwartet es, jeder Texteditor kommt damit zurecht.
  return `${zeilen.join('\r\n')}\r\n`;
}

/** Wie viele Zeilen der Export hätte — für die Beschriftung des Knopfs. */
export function exportCount(index: PositionIndex, mask: Uint8Array | null): number {
  if (mask === null) return index.size;
  let count = 0;
  for (let i = 0; i < index.size; i++) if (mask[i] === 1) count++;
  return count;
}
