// Eigene Marker setzen (Entscheidung 0062): von der Positionskarte und vom
// Rechtsklick-Menü (Issue #155) gleich, damit beide denselben Verlauf schreiben.

import { PROGRESS, PROGRESS_INFO, type MarkerValue, type Progress } from '../../lib/annotations';
import type { useViewerDispatch } from '../../state/viewer';

type Dispatch = ReturnType<typeof useViewerDispatch>;

// Außerhalb der Komponenten: `Date.now()` ist im Render-Pfad nicht rein.
export function setProgressNow(dispatch: Dispatch, id: string, progress: Progress | null): void {
  dispatch({ type: 'setProgress', id, progress, at: Date.now() });
}

export function setImportantNow(dispatch: Dispatch, id: string, on: boolean): void {
  dispatch({ type: 'setImportant', id, on, at: Date.now() });
}

export function fillMarkerNow(
  dispatch: Dispatch,
  ids: readonly string[],
  value: MarkerValue,
): void {
  if (ids.length > 0) dispatch({ type: 'fillMarker', ids, value, at: Date.now() });
}

/** Offen + die gesetzten Werte, in der Reihenfolge der Auswahlliste. */
export const PROGRESS_CHOICES: ReadonlyArray<{ value: Progress | null; label: string }> = [
  { value: null, label: 'Offen' },
  ...PROGRESS.map((value) => ({ value, label: PROGRESS_INFO[value].label })),
];
