// „Mitnehmen" ohne Menü (Issue #80): Export und Druck als Funktionen, die
// jede Oberfläche auslösen kann — heute das Logo-Menü (Entscheidung 0038).
//
// **Warum als Hook und nicht als Menü:** die Knöpfe sind aus der Kopfleiste
// verschwunden, die Funktionen nicht. Hier liegen sie an einer Stelle, unter
// einem Namen, und lassen sich ohne geöffnetes Menü testen.
//
// Keiner der drei Wege erzeugt einen Request: CSV und Markdown entstehen als
// Blob im Browser, der Druck läuft über `window.print()`
// (docs/decisions/0022-export-und-druck-ohne-request.md).

import { useCallback } from 'react';
import { checkMarkdown } from '../../lib/export/checkReport';
import { downloadText, exportFileName } from '../../lib/export/download';
import { positionsCsv } from '../../lib/export/positions';
import { filterMask } from '../../lib/index/positionIndex';
import { matchCount } from '../../lib/tree/matchCounts';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export interface Mitnehmen {
  /** Alle Spalten, genau die gefilterten Zeilen. */
  positionenAlsCsv: () => void;
  /** Prüf-Hinweise im aktuellen Filter, abgeschaltete Regeln bleiben draußen. */
  hinweiseAlsMarkdown: () => void;
  /** Druckt die gefilterte Liste, nicht nur das sichtbare Fenster. */
  drucken: () => void;
}

/**
 * Meldung, wenn ein Export scheitert (Issue #91). Klick-Handler liegen außerhalb
 * der `ErrorBoundary` — ohne Abfangen sähe niemand, dass keine Datei kam.
 */
export function exportFehler(was: string): string {
  return `${was} konnte nicht erstellt werden. Bitte erneut versuchen oder den Download im Browser erlauben.`;
}

export function useMitnehmen(): Mitnehmen {
  const { lv, index, active, filter, matches, nodes } = useViewer();
  const dispatch = useViewerDispatch();

  const absichern = useCallback(
    (was: string, aktion: () => void): void => {
      try {
        aktion();
      } catch (fehler) {
        console.error(fehler);
        dispatch({ type: 'notice', message: exportFehler(was) });
      }
    },
    [dispatch],
  );

  const positionenAlsCsv = useCallback((): void => {
    if (lv === null) return;
    absichern('Die CSV-Datei', () => {
      // Die Maske kostet einen Durchlauf über den Positions-Index (bei 10k
      // Positionen spürbar) — deshalb erst hier, beim Auslösen.
      const mask = active.filtering ? filterMask(index, active) : null;
      downloadText(
        exportFileName(lv.fileName, 'positionen', 'csv'),
        positionsCsv(index, mask),
        'csv',
      );
    });
  }, [lv, index, active, absichern]);

  const hinweiseAlsMarkdown = useCallback((): void => {
    if (lv === null) return;
    absichern('Die Markdown-Datei', () => {
      // Dieselbe Menge, die die Ansicht „Prüfung" zeigt.
      const visible = matches.filtering
        ? new Set(
            lv.check.flags
              .map((flag) => flag.positionId)
              .filter((positionId) => {
                const node = nodes.get(positionId);
                return node !== undefined && matchCount(matches, node) > 0;
              }),
          )
        : null;
      downloadText(
        exportFileName(lv.fileName, 'hinweise', 'md'),
        checkMarkdown({
          check: lv.check,
          nodes,
          muted: filter.mutedRules,
          visible,
          fileName: lv.fileName,
          projectName: lv.projectName,
        }),
        'markdown',
      );
    });
  }, [lv, matches, nodes, filter.mutedRules, absichern]);

  const drucken = useCallback((): void => {
    absichern('Der Druck', () => window.print());
  }, [absichern]);

  return { positionenAlsCsv, hinweiseAlsMarkdown, drucken };
}
