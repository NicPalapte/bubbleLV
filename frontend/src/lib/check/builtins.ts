// Eingebaute Bausteine der Prüfregeln (Entscheidung 0085): feste Logik, die mehr braucht als
// die Texte einer Position — Merkmale der Klassifizierung oder das ganze LV. In der Regel
// (docs/domain/reference/regeln.json) stehen nur Name und Parameter, z. B.
// `{ "eingebaut": "bewehrung", "parameter": { "positionen-im-titel": 3 } }`.
//
// Eine neue eingebaute Logik kommt als Eintrag in `CHECK_BUILTINS` dazu. Fehlt ein Name hier,
// steht die Regel in „Prüfung“ als „Noch nicht umgesetzt“ (V8–V10).

import type { RuleParam } from '@core';
import { attrSpans, attrString, attrStrings } from '../attributes';
import { materialKatalog, type MaterialDefinition } from '../classify/material/katalog';
import { mainSectionOf, NO_SECTION_KEY } from '../tree/mainSection';
import { canonicalUnit, unitSpelling } from '../units';
import type { CheckContext, Fund } from './types';
import type { LVNode } from '../../types/lvNode';

type Parameter = Readonly<Record<string, RuleParam>>;

export interface CheckBuiltin {
  /** Warum die Logik nicht laufen kann, in einem Satz; `null` = sie läuft. */
  missing?(): string | null;
  /** Einmal je LV vorbereiten; die Rückgabe liefert die Funde einer Position (Slot). */
  prepare(context: CheckContext, parameter: Parameter): (slot: number) => Fund[];
}

// ── offene-stelle (V7) ──────────────────────────────────────────────────────
// Liest, was der Platzhalter-Extraktor gefunden hat (classify/extractors/platzhalter.ts).
// Der Parameter `punktreihe-mindestlaenge` wirkt dort, schon beim Klassifizieren.

const offeneStelle: CheckBuiltin = {
  prepare:
    ({ index }) =>
    (slot) => {
      const { attributes } = index.positions[slot];
      const arten = attrStrings(attributes, 'platzhalter');
      if (arten.length === 0) return [];
      const anzahl = attributes.platzhalterAnzahl;
      return [
        {
          title:
            typeof anzahl === 'number' && anzahl > 1
              ? `${anzahl} offene Stellen (${arten.join(', ')})`
              : arten.join(', '),
          span: attrSpans(attributes).find((span) => span.key === 'platzhalter'),
        },
      ];
    },
};

// ── einheit-schreibweise (G3) ───────────────────────────────────────────────
// Kennzahl aus der Datei ohne Norm-Bezug: wo schreibt dieselbe Datei eine Einheit verschieden.

const einheitSchreibweise: CheckBuiltin = {
  prepare: ({ index }) => {
    // Je Vergleichsschlüssel sammeln, welche Schreibweisen tatsächlich vorkommen.
    const schreibweisen = new Map<string, Set<string>>();
    for (const position of index.positions) {
      const key = canonicalUnit(position.unit);
      const spelling = unitSpelling(position.unit);
      if (key === null || spelling === null) continue;
      const seen = schreibweisen.get(key) ?? new Set<string>();
      seen.add(position.unit ?? spelling);
      schreibweisen.set(key, seen);
    }
    const uneinheitlich = new Map<string, string[]>();
    for (const [key, seen] of schreibweisen) {
      if (seen.size > 1)
        uneinheitlich.set(
          key,
          [...seen].sort((a, b) => a.localeCompare(b, 'de')),
        );
    }
    return (slot) => {
      const { unit } = index.positions[slot];
      const key = canonicalUnit(unit);
      const varianten = key === null ? undefined : uneinheitlich.get(key);
      if (varianten === undefined) return [];
      const andere = varianten.filter((variante) => variante !== unit);
      return [
        {
          title: `„${unit}" — im LV auch als ${andere.map((variante) => `„${variante}"`).join(', ')}`,
        },
      ];
    };
  },
};

// ── bewehrung (M1) ──────────────────────────────────────────────────────────
// Liest nur, was die Materialtabellen erkannt haben (lib/classify/material/). Steht in einer
// Betonposition mit Festigkeitsklasse nichts zur Bewehrung, nennt sie die Betonstahl-Positionen
// im selben Hauptabschnitt — dort steht die Bewehrung meist. Ob sie zu dieser Position gehört,
// sagt die Regel nicht: das ist ein Hinweis, kein Urteil. Außerhalb der Tabellen hängt sie an
// `positionsart` („bauteil“) und `beton` (Festigkeitsklasse aus rulesets/normklassen.ts).

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
  if (beton.erkennung.length === 0 || betonstahl.erkennung.length === 0) return null;
  return { beton: beton.name, betonstahl: betonstahl.name, bewehrungKey: bewehrung.key };
}

/** Positionsnummern im Titel; ab `max` als Anzahl. */
function ozListe(oz: readonly string[], max: number): string {
  const shown = oz.slice(0, max).join(', ');
  return oz.length > max ? `${shown} und ${oz.length - max} weitere` : shown;
}

/** Funde je Slot, mit austauschbarem Katalog — der Test braucht eigene Tabellen. */
export function checkBewehrung(
  context: CheckContext,
  materials: readonly MaterialDefinition[],
  max: number,
): Map<number, Fund> {
  const out = new Map<number, Fund>();
  const bezug = bezugAus(materials);
  if (bezug === null) return out;
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
    // Schalung, Anstrich oder Gerüst erwähnen Beton auch, brauchen aber keine Bewehrung.
    if (
      istBeton &&
      attrString(attributes, 'positionsart') === 'bauteil' &&
      attrString(attributes, 'beton') !== null &&
      attrStrings(attributes, bezug.bewehrungKey).length === 0
    ) {
      offen.push(slot);
    }
  }

  for (const slot of offen) {
    const nachbarn = stahl.get(sectionOf(slot)) ?? [];
    out.set(slot, {
      title:
        nachbarn.length > 0
          ? `Keine Angabe zur Bewehrung — Betonstahl im Abschnitt: ${ozListe(nachbarn, max)}`
          : 'Keine Angabe zur Bewehrung, auch kein Betonstahl im Abschnitt',
    });
  }
  return out;
}

const bewehrung: CheckBuiltin = {
  missing: () =>
    bezugAus(materialKatalog()) === null
      ? 'Materialtabellen docs/domain/reference/material/beton.csv und betonstahl.csv ' +
        'enthalten noch keine Einträge.'
      : null,
  prepare: (context, parameter) => {
    const max = parameter['positionen-im-titel'];
    if (typeof max !== 'number') {
      throw new Error('Parameter „positionen-im-titel“ fehlt in der Regel.');
    }
    const funde = checkBewehrung(context, materialKatalog(), max);
    return (slot) => {
      const fund = funde.get(slot);
      return fund === undefined ? [] : [fund];
    };
  },
};

export const CHECK_BUILTINS: ReadonlyMap<string, CheckBuiltin> = new Map([
  ['offene-stelle', offeneStelle],
  ['einheit-schreibweise', einheitSchreibweise],
  ['bewehrung', bewehrung],
]);
