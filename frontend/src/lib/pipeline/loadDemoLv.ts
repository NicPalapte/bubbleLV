// Mitgelieferte Demo-LVs, damit sich die App ohne eigene Datei ausprobieren
// lässt. Zwei Dateien, weil ein LV in zwei Ausprägungen vorkommt:
//
//  - **x83 ohne Preise** — die frei verfügbare BVBS-Musterdatei 3.3. So sieht
//    eine Leistungsbeschreibung aus, bevor jemand kalkuliert hat; der Überblick
//    sagt dann ausdrücklich „keine Preise" und die Mengen tragen die Aussage.
//  - **x84 mit Preisen** — eine eigene Demodatei auf Basis der Musterdatei,
//    umgestellt auf die Datenaustauschphase 84 und um weitere Titel ergänzt.
//    Preise und Zusatzpositionen sind erfunden
//    (docs/decisions/0014-demo-lv-mit-preisen.md).
//
// Die Dateien liegen als Assets im eigenen Bundle und werden erst beim Klick
// geholt — sie wandern deshalb nicht in das Start-Bundle jedes Besuchers. Der
// `fetch` geht an die eigene Auslieferung (gleiche Herkunft wie die App selbst)
// und schickt nichts nach draußen; die Fachdaten-Regel bleibt unberührt
// (docs/decisions/0009-demo-lv.md).

import angebotUrl from '../../assets/demo/bubble-demo-angebot.x84?url';
import musterUrl from '../../assets/demo/bvbs-gaeb-musterdatei.x83?url';
import { loadLvFromBytes, LVLoadError } from './loadLv';
import type { LoadedLV } from './runPipeline';

export interface DemoLv {
  id: string;
  /** Beschriftung der Schaltfläche — kurz, sie steht neben „Datei auswählen". */
  label: string;
  /** Anzeigename des LV in der Oberfläche. */
  title: string;
  /** Ein Satz dazu, was diese Datei zeigt. */
  hint: string;
  /** Dateiname, der nach dem Laden in der Kopfleiste steht. */
  fileName: string;
  url: string;
}

export const DEMO_LVS: readonly DemoLv[] = [
  {
    id: 'angebot',
    label: 'Demo mit Preisen',
    title: 'Bubble Demo-LV 3.3 · Angebot mit Preisen',
    hint: 'Angebot (x84) mit Einheitspreisen — 78 Positionen, 16 Gewerke, rund 1,6 Mio. €.',
    fileName: 'bubble-demo-angebot.x84',
    url: angebotUrl,
  },
  {
    id: 'muster',
    label: 'Demo ohne Preise',
    title: 'BVBS GAEB Musterdatei 3.3',
    hint: 'Leistungsbeschreibung (x83) ohne Preise — die frei verfügbare BVBS-Musterdatei.',
    fileName: 'bvbs-gaeb-musterdatei.x83',
    url: musterUrl,
  },
];

export function demoLvById(id: string): DemoLv | undefined {
  return DEMO_LVS.find((demo) => demo.id === id);
}

/**
 * Lädt ein mitgeliefertes Demo-LV über denselben Weg wie eine gewählte Datei.
 *
 * @throws {LVLoadError} mit verständlicher Meldung für die UI.
 */
export async function loadDemoLv(demo: DemoLv): Promise<LoadedLV> {
  let bytes: ArrayBuffer;
  try {
    const response = await fetch(demo.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bytes = await response.arrayBuffer();
  } catch {
    throw new LVLoadError(
      'demo-unavailable',
      'Das Demo-LV konnte nicht geladen werden. Bitte die Seite neu laden oder eine eigene Datei wählen.',
    );
  }
  return loadLvFromBytes(bytes, demo.fileName);
}
