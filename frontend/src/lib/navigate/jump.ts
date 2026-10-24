// Der Sprung auf eine Position — eine Stelle, alle Auslöser.
//
// Die Prüfkarte und die Auswahlkarte im Graphen springen über
// `components/common/useJumpToPosition.ts` und `useJumpToCheck.ts`. Beide
// rechnen hier, damit „zu einer Position springen" nicht an zwei Stellen leicht
// verschieden ist.

import type { ViewerAction } from '../../state/viewer';

export interface JumpOptions {
  /**
   * Im Graphen bleiben, statt in die Tabelle zu wechseln.
   *
   * Die Prüfkarte setzt es: ein Fund wählt die Position im Graphen aus, der
   * sie selbst als Karte zeigt. Die Schaltfläche „in Tabelle öffnen" der
   * Auswahlkarte wechselt dagegen immer.
   */
  stayInView?: boolean;
}

/**
 * Sprung zu einer Prüfregel im Überblick (WP-R, R1).
 *
 * Die Auswahl wandert mit: wer aus dem Graphen kommt, hat eine Position im
 * Blick und soll sie in der Prüfliste wiederfinden, statt sie zu suchen. Die
 * Regel wird **aufgeklappt**, nicht umgeschaltet — ein zweiter Sprung auf
 * dieselbe Regel klappte sie sonst zu.
 */
export function checkActions(
  ruleId: string,
  positionId: string,
  parentId: string | null,
): ViewerAction[] {
  return [
    { type: 'selectPosition', nodeId: parentId, positionId },
    { type: 'openRule', id: ruleId },
    { type: 'showPane', pane: 'check' },
  ];
}

/** Auswahl setzen und — sofern gewünscht — in die Tabelle wechseln. */
export function jumpActions(
  positionId: string,
  parentId: string | null,
  options: JumpOptions = {},
): ViewerAction[] {
  const actions: ViewerAction[] = [{ type: 'selectPosition', nodeId: parentId, positionId }];
  if (options.stayInView !== true) actions.push({ type: 'setViewMode', mode: 'table' });
  return actions;
}
