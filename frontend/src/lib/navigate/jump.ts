// Der Sprung auf eine Position — eine Stelle, alle Auslöser.
//
// Prüfung, Ähnlichkeit, Vergleich und die Auswahlkarte im Graphen springen
// über `components/common/useJumpToPosition.ts`, die Kommandopalette baut sich
// daraus einen Befehl (`lib/palette/commands.ts`). Beide rechnen hier, damit
// „zu einer Position springen" nicht an zwei Stellen leicht verschieden ist.

import type { ViewerAction } from '../../state/viewer';

export interface JumpOptions {
  /**
   * Im Graphen bleiben, statt in die Tabelle zu wechseln.
   *
   * Gilt nur für die Kommandopalette: wer dort eine OZ tippt, während er den
   * Graphen betrachtet, hat den Graphen bewusst gewählt — und der zeigt die
   * Auswahl selbst als Karte. Die Schaltflächen in Prüfung, Ähnlichkeit und
   * Auswahlkarte heißen dagegen „in Tabelle öffnen"; sie wechseln immer.
   */
  stayInView?: boolean;
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
