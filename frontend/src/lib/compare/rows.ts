// Merkmalszeilen des Vergleichs (WP-N, Schritt 2): eine Zeile je Merkmal, eine
// Spalte je Position.
//
// Die Merkmale kommen aus `merkmaleOf` (lib/relate/similarity.ts) — derselben
// Funktion, nach der die Ansicht „Ähnlichkeit" gruppiert. Wenn dort steht,
// zwei Positionen unterscheiden sich in der Dicke, muss der Vergleich genau
// diese Zeile hervorheben und keine andere.
//
// Menge, Einheitspreis und Gesamtpreis stehen vorn: sie sind der häufigste
// Grund, zwei Positionen nebeneinanderzulegen.

import { attributeLabel } from '../attributes';
import { formatEuro, formatNumber } from '../format';
import { merkmaleOf } from '../relate/similarity';
import { canonicalUnit, unitLabel } from '../units';
import type { PositionSummary } from '../../types/lvNode';

export interface CompareRow {
  key: string;
  label: string;
  /** Wert je Spalte; `null`, wo die Position dazu nichts führt. */
  values: readonly (string | null)[];
  /** Unterscheiden sich die Spalten in dieser Zeile? */
  differs: boolean;
}

/** Zeilen, die vorn stehen — in dieser Reihenfolge. */
const LEADING = ['menge', 'einheitspreis', 'gesamtpreis'] as const;

const LEADING_LABELS: Record<(typeof LEADING)[number], string> = {
  menge: 'Menge',
  einheitspreis: 'Einheitspreis',
  gesamtpreis: 'Gesamtpreis',
};

/** Nachkommastellen, wenn die gerundete Anzeige den Unterschied verschluckt. */
const GENAU = 6;

/**
 * Zahlenwerte einer Position, bereits in Anzeigeform. `genau` zeigt mehr
 * Nachkommastellen — nötig, wenn zwei verschiedene Werte gerundet gleich
 * aussähen.
 */
function leadingValue(
  key: (typeof LEADING)[number],
  position: PositionSummary,
  genau = false,
): string | null {
  if (key === 'menge') {
    if (position.quantity === null) return null;
    // Einheit in der kanonischen Schreibweise: „Psch" und „PSCH" sind dieselbe
    // Einheit, und ein Unterschied in der Schreibweise ist keiner in der Sache.
    const einheit = canonicalUnit(position.unit);
    const menge = genau
      ? position.quantity.toLocaleString('de-DE', { maximumFractionDigits: GENAU })
      : formatNumber(position.quantity);
    return `${menge}${einheit === null ? '' : ` ${unitLabel(einheit)}`}`;
  }
  const stellen = genau ? GENAU : undefined;
  if (key === 'einheitspreis') {
    return position.unitPrice === null ? null : formatEuro(position.unitPrice, stellen);
  }
  if (position.quantity === null || position.unitPrice === null) return null;
  return formatEuro(position.quantity * position.unitPrice, stellen);
}

/**
 * Vergleichswert einer Zahlenzeile — **ungerundet**. Auf der Anzeigeform zu
 * vergleichen hieße, dass zwei Mengen, die sich erst in der vierten
 * Nachkommastelle unterscheiden, als gleich gälten und die Zeile unter „Nur
 * Unterschiede" verschwände.
 */
function leadingKey(key: (typeof LEADING)[number], position: PositionSummary): string | null {
  if (key === 'menge') {
    if (position.quantity === null) return null;
    // Die Einheit gehört zum Vergleich: 10 m³ und 10 m² sind nicht dasselbe.
    return `${position.quantity}|${canonicalUnit(position.unit) ?? ''}`;
  }
  if (key === 'einheitspreis') {
    return position.unitPrice === null ? null : String(position.unitPrice);
  }
  if (position.quantity === null || position.unitPrice === null) return null;
  return String(position.quantity * position.unitPrice);
}

/** Alle Spalten gleich? `null` zählt dabei als eigener Wert („führt nichts"). */
function allEqual(values: readonly (string | null)[]): boolean {
  return values.every((value) => value === values[0]);
}

/**
 * Zeilen für die gewählten Positionen. Ein Merkmal, das **keine** Position
 * führt, taucht gar nicht auf; eines, das nur manche führen, schon — dass es
 * bei den anderen fehlt, ist ja gerade der Unterschied.
 */
export function compareRows(positions: readonly PositionSummary[]): CompareRow[] {
  if (positions.length === 0) return [];
  const merkmale = positions.map((position) => merkmaleOf(position));

  const rows: CompareRow[] = [];
  for (const key of LEADING) {
    let values = positions.map((position) => leadingValue(key, position));
    if (values.every((value) => value === null)) continue;
    const differs = !allEqual(positions.map((position) => leadingKey(key, position)));
    // Gerundet sähen die Werte gleich aus — dann zeigt die Zeile mehr
    // Nachkommastellen. Ein markierter Unterschied, den man nicht sieht, wäre
    // nicht nachvollziehbar.
    if (differs && allEqual(values)) {
      values = positions.map((position) => leadingValue(key, position, true));
    }
    rows.push({ key, label: LEADING_LABELS[key], values, differs });
  }

  // Die Einheit steht bereits an der Menge („10 m³"). Eine zweite Zeile mit
  // demselben Wert wäre Dopplung — und bei einer abweichenden Einheit stünden
  // zwei Zeilen gleichzeitig als Unterschied da.
  //
  // Das gilt aber nur, solange die Menge-Zeile die Einheit **jeder** Spalte
  // trägt. Führt eine Position eine Einheit ohne Menge (z. B. eine
  // Bedarfsposition), steht in ihrer Menge-Zelle nichts — ihre Einheit wäre
  // dann nirgends zu sehen, und ein echter Unterschied bliebe unsichtbar.
  const mengeZeigtJedeEinheit =
    rows.some((entry) => entry.key === 'menge') &&
    positions.every(
      (position) => canonicalUnit(position.unit) === null || position.quantity !== null,
    );

  // Reihenfolge der Merkmale: nach Anzeigename, damit sie nicht von der
  // Reihenfolge der Klassifizierung abhängt.
  const keys = [...new Set(merkmale.flatMap((entry) => [...entry.keys()]))]
    .filter((key) => !(key === 'einheit' && mengeZeigtJedeEinheit))
    .sort((a, b) => attributeLabel(a).localeCompare(attributeLabel(b), 'de'));
  for (const key of keys) {
    const values = merkmale.map((entry) => entry.get(key) ?? null);
    rows.push({ key, label: attributeLabel(key), values, differs: !allEqual(values) });
  }
  return rows;
}
