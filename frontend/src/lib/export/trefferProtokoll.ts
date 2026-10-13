// Treffer-Protokoll als CSV: je Treffer der Materialtabellen eine Zeile, für
// dieselben Positionen wie der Positions-Export. Kein Request — nur Text.

import { materialKatalog, type MaterialDefinition } from '../classify/material/katalog';
import { trefferProtokoll } from '../classify/material/protokoll';
import type { PositionIndex } from '../index/positionIndex';
import { csvText } from './csvText';

const KOPF = [
  'OZ',
  'Kurztext',
  'Material',
  'Merkmal',
  'Wert',
  'Fundtext',
  'Stichwort',
  'Tabelle',
  'Zeile',
  'Ort',
  'Status',
  'Auffällig',
];

/** `mask` wie bei `positionsCsv`: `null` heißt ganzes LV. */
export function trefferProtokollCsv(
  index: PositionIndex,
  mask: Uint8Array | null,
  materials: readonly MaterialDefinition[] = materialKatalog(),
): string {
  const zeilen: string[][] = [KOPF];
  for (let i = 0; i < index.size; i++) {
    if (mask !== null && mask[i] !== 1) continue;
    const { oz, shortText, longText } = index.positions[i];
    for (const z of trefferProtokoll({ shortText, longText }, materials)) {
      zeilen.push([
        oz,
        shortText,
        z.material,
        z.merkmal,
        z.wert,
        z.fundtext,
        z.stichwort,
        z.tabelle,
        String(z.zeile),
        z.ort,
        z.status,
        z.auffaellig,
      ]);
    }
  }
  return csvText(zeilen);
}
