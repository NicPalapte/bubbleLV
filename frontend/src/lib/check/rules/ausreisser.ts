// G4 · Preisausreißer in einer Gruppe ähnlicher Positionen.
//
// WP-K hatte diese Regel ausdrücklich zurückgestellt: „ohne Vergleichsgruppe
// nicht berechenbar" (docs/implementation-plan.md, WP-K Schritt 4). Mit WP-M
// gibt es die Gruppe — die Regel liest die fertigen Cluster, sie rechnet nicht
// selbst (lib/relate/similarity.ts).
//
// **Hinweis, kein Urteil** (docs/domain/vob-pruefungen.md): ein abweichender
// Einheitspreis kann sachlich richtig sein — andere Einbausituation, andere
// Erschwernis. Die Regel sagt deshalb nur, dass der Preis aus dem Rahmen
// seiner Gruppe fällt, und nennt den Median als Bezugsgröße.
//
// Ohne Preise in der Datei findet die Regel nichts — kein Fehler, nur ein
// leeres Ergebnis (x83 führt in aller Regel keine Einheitspreise).

import type { CheckContext, CheckRule, Flag } from '../types';

/** Nur EP-Ausreißer: eine abweichende Menge ist eine Aussage über das Bauwerk,
 *  keine über den Preis, und gehört damit in die Ansicht „Ähnlichkeit". */
const FIELD = 'ep';

function richtung(direction: 'hoch' | 'niedrig'): string {
  return direction === 'hoch' ? 'über' : 'unter';
}

function euro(value: number): string {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`;
}

export const g4Preisausreisser: CheckRule = {
  id: 'G4',
  label: 'Einheitspreis fällt aus der Gruppe',
  category: 'geld',
  severity: 'beachten',
  hint:
    'Der Einheitspreis liegt außerhalb des Erwartungsbereichs seiner Gruppe ähnlicher ' +
    'Positionen (Median und Quartilsabstand). Das kann sachlich begründet sein — ein ' +
    'Blick auf die Einbausituation lohnt trotzdem.',
  check(context: CheckContext): Flag[] {
    const flags: Flag[] = [];
    for (const cluster of context.relations.clusters) {
      for (const outlier of cluster.ausreisser) {
        if (outlier.field !== FIELD) continue;
        flags.push({
          id: 'G4',
          category: 'geld',
          severity: 'beachten',
          positionId: outlier.positionId,
          title:
            `${euro(outlier.value)} — ${richtung(outlier.direction)} dem Erwartungsbereich ` +
            `von ${cluster.positionIds.length} ähnlichen Positionen (Median ${euro(outlier.median)})`,
        });
      }
    }
    return flags;
  },
};
