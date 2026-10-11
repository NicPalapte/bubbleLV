// M1 · Betonposition ohne Angabe zur Bewehrung (docs/domain/vob-pruefungen.md).
//
// Die Regel liest nur, was die Materialtabellen erkannt haben
// (lib/classify/material/). Steht in einer Betonposition mit Festigkeitsklasse
// nichts zur Bewehrung, nennt sie die Betonstahl-Positionen im selben Hauptabschnitt —
// dort steht die Bewehrung meist. Ob sie zu dieser Position gehört, sagt die
// Regel nicht: das ist ein Hinweis, kein Urteil.
//
// Fehlt eine der Tabellen „beton" oder „betonstahl" oder das Merkmal
// „Bewehrung", bleibt die Regel inaktiv.

import { attrString, attrStrings } from '../../attributes';
import { materialKatalog, type MaterialDefinition } from '../../classify/material/katalog';
import { mainSectionOf, NO_SECTION_KEY } from '../../tree/mainSection';
import type { CheckContext, CheckRule, Flag } from '../types';
import type { LVNode } from '../../../types/lvNode';

/** So viele Positionsnummern stehen im Hinweis; der Rest als Anzahl. */
const MAX_OZ = 3;

interface Bezug {
  beton: string;
  betonstahl: string;
  bewehrungKey: string;
}

function bezugAus(materials: readonly MaterialDefinition[]): Bezug | null {
  const beton = materials.find((material) => material.id === 'beton');
  const betonstahl = materials.find((material) => material.id === 'betonstahl');
  const bewehrung = beton?.merkmale.find((merkmal) => merkmal.key === 'betonBewehrung');
  if (beton === undefined || betonstahl === undefined || bewehrung === undefined) return null;
  if (beton.erkennung === null || betonstahl.erkennung === null) return null;
  return { beton: beton.name, betonstahl: betonstahl.name, bewehrungKey: bewehrung.key };
}

function liste(oz: readonly string[]): string {
  const shown = oz.slice(0, MAX_OZ).join(', ');
  return oz.length > MAX_OZ ? `${shown} und ${oz.length - MAX_OZ} weitere` : shown;
}

/** Prüffunktion mit austauschbarem Katalog — der Test braucht eigene Tabellen. */
export function checkBewehrung(
  context: CheckContext,
  materials: readonly MaterialDefinition[],
): Flag[] {
  const bezug = bezugAus(materials);
  if (bezug === null) return [];
  const { index, parents } = context;
  const cache = new Map<string, LVNode | null>();
  const sectionOf = (slot: number): string =>
    mainSectionOf(index.nodes[slot], parents, cache)?.id ?? NO_SECTION_KEY;

  // Bewehrungspositionen je Hauptabschnitt: Betonstahl, aber kein Beton — eine
  // Stahlbetonwand „einschl. Betonstahl" ist selbst keine Bewehrungsposition.
  const stahl = new Map<string, string[]>();
  const offen: number[] = [];
  for (let slot = 0; slot < index.size; slot++) {
    const { attributes, oz } = index.positions[slot];
    const material = attrStrings(attributes, 'material');
    const istBeton = material.includes(bezug.beton);
    if (material.includes(bezug.betonstahl) && !istBeton) {
      const key = sectionOf(slot);
      const list = stahl.get(key);
      if (list === undefined) stahl.set(key, [oz]);
      else list.push(oz);
    }
    // Nur Positionen, die Beton herstellen: sie nennen eine Festigkeitsklasse.
    // Schalung, Anstrich oder Gerüst erwähnen Beton auch, brauchen aber keine
    // Bewehrung.
    if (
      istBeton &&
      attrString(attributes, 'positionsart') === 'bauteil' &&
      attrString(attributes, 'beton') !== null &&
      attrStrings(attributes, bezug.bewehrungKey).length === 0
    ) {
      offen.push(slot);
    }
  }

  return offen.map((slot): Flag => {
    const nachbarn = stahl.get(sectionOf(slot)) ?? [];
    return {
      id: 'M1',
      category: 'risiko',
      severity: 'hinweis',
      positionId: index.nodes[slot].id,
      title:
        nachbarn.length > 0
          ? `Keine Angabe zur Bewehrung — Betonstahl im Abschnitt: ${liste(nachbarn)}`
          : 'Keine Angabe zur Bewehrung, auch kein Betonstahl im Abschnitt',
    };
  });
}

export const m1Bewehrung: CheckRule = {
  id: 'M1',
  label: 'Betonposition ohne Angabe zur Bewehrung',
  category: 'risiko',
  severity: 'hinweis',
  hint:
    'Die Betonposition nennt eine Festigkeitsklasse, sagt aber nichts zur Bewehrung. Oft steht sie in einer eigenen ' +
    'Position — ein Blick lohnt, ob sie dort erfasst ist.',
  check: (context) => checkBewehrung(context, materialKatalog()),
  requires: {
    file: 'docs/domain/reference/material/beton.csv und betonstahl.csv',
    available: () => bezugAus(materialKatalog()) !== null,
  },
};
