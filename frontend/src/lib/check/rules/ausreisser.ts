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

// Geldbeträge kommen aus `lib/format.ts` — derselbe Ausreißer steht in der
// Ansicht „Prüfung" und auf der Cluster-Karte, und beide sollen ihn gleich
// schreiben.
import { formatEuro } from '../../format';
import { minForOutliers } from '../../relate/stats';
import { regelParameter } from '../referenz';
import type { CheckContext, CheckRule, Fund } from '../types';

/** Nur EP-Ausreißer: eine abweichende Menge ist eine Aussage über das Bauwerk,
 *  keine über den Preis, und gehört damit in die Ansicht „Ähnlichkeit". */
const FIELD = 'ep';

function richtung(direction: 'hoch' | 'niedrig'): string {
  return direction === 'hoch' ? 'über' : 'unter';
}

export const g4Preisausreisser: CheckRule = {
  id: 'G4',
  requires: {
    file: 'docs/domain/reference/pruefregeln-parameter.csv (zaunbreite, mindestanzahl)',
    available: () => minForOutliers() !== null && regelParameter('G4', 'zaunbreite') !== undefined,
  },
  check(context: CheckContext): Fund[] {
    const funde: Fund[] = [];
    for (const cluster of context.relations.clusters) {
      for (const outlier of cluster.ausreisser) {
        if (outlier.field !== FIELD) continue;
        funde.push({
          positionId: outlier.positionId,
          title:
            `${formatEuro(outlier.value)} — ${richtung(outlier.direction)} dem ` +
            `Erwartungsbereich von ${cluster.positionIds.length} ähnlichen Positionen ` +
            `(Median ${formatEuro(outlier.median)})`,
        });
      }
    }
    return funde;
  },
};
