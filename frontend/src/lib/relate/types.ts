// Beziehungen zwischen Positionen (WP-M, docs/architecture/data-model.md#cluster).
//
// Ein Cluster ist **keine Eigenschaft einer Position**, sondern eine Aussage
// über mehrere — deshalb steht er neben dem Baum und nicht in `attributes`
// (dieselbe Trennung wie beim `Flag` der Prüfregeln).
//
// Alles hier ist durch `structuredClone` transportierbar: die Beziehungen
// entstehen im Worker und müssen die Worker-Grenze überleben. Verweise auf
// Positionen sind deshalb Knoten-IDs (Strings), nie Knoten-Objekte.

import type { OutlierDirection, ValueStats } from './stats';

/** Worauf sich ein Ausreißer bezieht. */
export type OutlierField = 'ep' | 'menge';

export interface Outlier {
  /** Knoten-ID der Position — Sprungziel aus der Liste. */
  positionId: string;
  field: OutlierField;
  direction: OutlierDirection;
  /** Wert dieser Position. */
  value: number;
  /** Median der Vergleichsgruppe — die Bezugsgröße der Aussage. */
  median: number;
}

export interface Cluster {
  id: string;
  /** Mitglieder in Dokumentreihenfolge; immer mindestens zwei. */
  positionIds: string[];
  /** Kurztext, der die Gruppe benennt — der häufigste unter den Mitgliedern. */
  label: string;
  /** Merkmale, die **alle** Mitglieder gleich haben: Key → Wert. */
  gemeinsameMerkmale: Record<string, string>;
  /** Merkmals-Keys, in denen sich die Mitglieder unterscheiden. */
  unterscheidendeMerkmale: string[];
  /** Positionen mit auffälligem Einheitspreis oder auffälliger Menge. */
  ausreisser: Outlier[];
  /** Kennzahlen der Einheitspreise; `null` bei Dateien ohne Preise. */
  unitPrice: ValueStats | null;
  /** Kennzahlen der Mengen; `null`, wenn die Datei keine führt. */
  quantity: ValueStats | null;
  /** Mittlere Ähnlichkeit innerhalb der Gruppe (0…1) — wie eng sie hält. */
  similarity: number;
}

export interface RelationResult {
  /** Cluster, absteigend nach Größe. */
  clusters: Cluster[];
  /** Positionen, die in irgendeinem Cluster stecken. */
  clustered: number;
  /** Positionen insgesamt — Bezugsgröße für „x von y". */
  total: number;
  /** Verwendeter Schwellwert; steht im UI, damit die Zahl nachvollziehbar ist. */
  threshold: number;
}

export const EMPTY_RELATIONS: RelationResult = {
  clusters: [],
  clustered: 0,
  total: 0,
  threshold: 0,
};

/** Knoten-ID → Cluster, für Nachschlagen aus einer Position heraus. */
export function clusterByPosition(result: RelationResult): Map<string, Cluster> {
  const map = new Map<string, Cluster>();
  for (const cluster of result.clusters) {
    for (const positionId of cluster.positionIds) map.set(positionId, cluster);
  }
  return map;
}
