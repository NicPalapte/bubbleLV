// Mitgeliefertes Demo-LV: die frei verfügbare BVBS-Musterdatei (GAEB DA XML
// 3.3), damit sich die App ohne eigene Datei ausprobieren lässt.
//
// Die Datei liegt als Asset im eigenen Bundle und wird erst beim Klick geholt —
// sie wandert deshalb nicht in das Start-Bundle jedes Besuchers. Der `fetch`
// geht an die eigene Auslieferung (gleiche Herkunft wie die App selbst) und
// schickt nichts nach draußen; die Fachdaten-Regel bleibt unberührt
// (docs/decisions/0009-demo-lv.md).

import demoUrl from '../../assets/demo/bvbs-gaeb-musterdatei.x83?url';
import { loadLvFromBytes, LVLoadError } from './loadLv';
import type { LoadedLV } from './runPipeline';

/** Anzeigename des Demo-LV in der Oberfläche. */
export const DEMO_LV_LABEL = 'BVBS GAEB Musterdatei 3.3';
/** Dateiname, der nach dem Laden in der Kopfleiste steht. */
export const DEMO_LV_FILE_NAME = 'bvbs-gaeb-musterdatei.x83';

/**
 * Lädt das mitgelieferte Demo-LV über denselben Weg wie eine gewählte Datei.
 *
 * @throws {LVLoadError} mit verständlicher Meldung für die UI.
 */
export async function loadDemoLv(): Promise<LoadedLV> {
  let bytes: ArrayBuffer;
  try {
    const response = await fetch(demoUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bytes = await response.arrayBuffer();
  } catch {
    throw new LVLoadError(
      'demo-unavailable',
      'Das Demo-LV konnte nicht geladen werden. Bitte die Seite neu laden oder eine eigene Datei wählen.',
    );
  }
  return loadLvFromBytes(bytes, DEMO_LV_FILE_NAME);
}
