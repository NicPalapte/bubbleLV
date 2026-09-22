// Treffer-Isolation im Graphen (WP-Q, Schritt 1 und 2): Filter und Suche bilden
// eigene Gruppen-Bubbles, statt die Treffer nur im Baum hervorzuheben
// (Issue #60). Begründung und verworfene Wege:
// docs/decisions/0018-graph-treffer-isolation.md.
//
// Der Kniff: die Isolation ist kein zweiter Graph, sondern ein **synthetischer
// LVNode-Baum** — Wurzel → eine Gruppe je Wert → die Treffer darin. Er läuft
// durch dasselbe `layoutRadial` und denselben Renderer wie die Struktur.
//
// Die Positionsknoten sind dabei **dieselben Objekte** wie im echten Baum, nicht
// Kopien: nur so treffen Auswahl, Auswahlkarte und Farbskala weiter zu, und nur
// so bleibt der Aufbau bei 10k Positionen eine Frage von Millisekunden.

import { sizeModeById } from './constants';
import { FACETS } from '../facets';
import type { PositionIndex } from '../index/positionIndex';
import type { MatchIndex } from '../tree/matchCounts';
import type { SizeModeId } from '../../state/viewState';
import type { LVNode, PositionSummary } from '../../types/lvNode';

/** Wonach die Isolation ihre Treffer bündelt. */
export type FocusGroupBy = 'abschnitt' | 'gewerk' | 'bauteiltyp';

export const FOCUS_GROUP_LABELS: Record<FocusGroupBy, string> = {
  abschnitt: 'Abschnitt',
  gewerk: 'Gewerk',
  bauteiltyp: 'Bauteiltyp',
};

/** ID-Präfix aller synthetischen Knoten — kollidiert mit keiner echten OZ. */
const FOCUS_PREFIX = 'focus:';
export const FOCUS_ROOT_ID = `${FOCUS_PREFIX}root`;

/** Gruppe ohne Wert — „kein Gewerk erkannt" ist selbst eine Aussage. */
const NO_VALUE = 'ohne Angabe';

export interface FocusGraph {
  /** Synthetischer Baum: Wurzel → Gruppen → Treffer-Positionen. */
  tree: LVNode;
  /** Trefferzahlen dieses Baums — jeder gezeigte Knoten ist ein Treffer. */
  matches: MatchIndex;
  /** Wurzel und alle Gruppen stehen offen; sonst sähe man keine Position. */
  openNodes: ReadonlySet<string>;
  /** IDs der Gruppen-Bubbles — sie sind keine LV-Knoten (siehe BubbleGraph). */
  groupIds: ReadonlySet<string>;
  groupCount: number;
  hitCount: number;
  groupBy: FocusGroupBy;
  /**
   * Mengen je Knoten dieses Baums — Wurzel, Gruppen und Positionen. Die Karte
   * des echten Baums (lib/graph/quantities.ts) kennt die synthetischen IDs
   * nicht; ohne diese hier bekämen im Modus „Menge" alle Gruppen denselben
   * Radius, und zwar ohne dass es auffiele.
   */
  quantities: ReadonlyMap<string, number>;
}

interface Bucket {
  key: string;
  label: string;
  code: string;
  ownCode: string;
  children: LVNode[];
  totalPrice: number;
  /** Mengensumme der Gruppe — nur der Größenmodus „Menge" sortiert danach. */
  quantity: number;
}

/** Gruppenschlüssel einer Position: Wert und Beschriftung. */
function bucketOf(
  groupBy: FocusGroupBy,
  node: LVNode,
  position: PositionSummary,
  parents: ReadonlyMap<string, LVNode | null>,
): { key: string; label: string; code: string; ownCode: string } {
  if (groupBy === 'abschnitt') {
    const parent = parents.get(node.id) ?? null;
    if (parent === null) return { key: '', label: NO_VALUE, code: '', ownCode: '' };
    return {
      key: parent.id,
      label: parent.label ?? parent.code,
      code: parent.code,
      ownCode: parent.ownCode,
    };
  }
  const facet = FACETS.find((candidate) => candidate.id === groupBy);
  // Mehrwertige Facetten (etwa Expositionsklassen) hätten dieselbe Position in
  // mehreren Gruppen — im Layout kollidierten dann zwei Knoten mit derselben
  // ID. Deshalb zählt der erste Wert; die Facetten oben sind einwertig.
  const value = facet === undefined ? null : (facet.get(position)[0] ?? null);
  if (value === null || value === '') return { key: '', label: NO_VALUE, code: '', ownCode: '' };
  return {
    key: value,
    label: facet?.optionLabel?.(value) ?? value,
    code: '',
    ownCode: '',
  };
}

export interface FocusOptions {
  groupBy: FocusGroupBy;
  /** Nach diesem Maß stehen die größten Gruppen zuerst. */
  sizeMode: SizeModeId;
  /** Elternzuordnung des echten Baums — nur für die Gruppierung nach Abschnitt. */
  parents: ReadonlyMap<string, LVNode | null>;
}

/**
 * Baut den Isolations-Baum aus den Treffern. `mask` ist die Trefferbitmaske des
 * Positions-Index (1 = Treffer). Ohne Treffer gibt es nichts zu zeigen: `null`.
 */
export function buildFocusTree(
  index: PositionIndex,
  mask: Uint8Array,
  options: FocusOptions,
): FocusGraph | null {
  const { groupBy, sizeMode, parents } = options;
  const buckets = new Map<string, Bucket>();
  // Mengen dieses Baums: Positionen kommen hier dazu, Gruppen und Wurzel unten.
  const quantities = new Map<string, number>();
  let hitCount = 0;
  let hitQuantity = 0;

  for (let i = 0; i < index.size; i++) {
    if (mask[i] !== 1) continue;
    const node = index.nodes[i];
    const { key, label, code, ownCode } = bucketOf(groupBy, node, index.positions[i], parents);
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = { key, label, code, ownCode, children: [], totalPrice: 0, quantity: 0 };
      buckets.set(key, bucket);
    }
    bucket.children.push(node);
    bucket.totalPrice += node.totalPrice;
    const quantity = index.quantity[i];
    if (Number.isFinite(quantity)) {
      // Eine fehlende Menge ist keine Menge von null — sie steht gar nicht drin.
      quantities.set(node.id, quantity);
      bucket.quantity += quantity;
      hitQuantity += quantity;
    }
    hitCount++;
  }

  if (hitCount === 0) return null;

  const groups: LVNode[] = [];
  for (const bucket of buckets.values()) {
    quantities.set(`${FOCUS_PREFIX}${groupBy}:${bucket.key}`, bucket.quantity);
    groups.push({
      id: `${FOCUS_PREFIX}${groupBy}:${bucket.key}`,
      kind: 'section',
      code: bucket.code,
      ownCode: bucket.ownCode,
      label: bucket.label,
      positionCount: bucket.children.length,
      totalPrice: bucket.totalPrice,
      children: bucket.children,
      position: null,
    });
  }

  // Größte Gruppe zuerst — im Ballon-Layout heißt das: sie bekommt den ersten
  // Winkelanteil und steht oben. Der Größenmodus entscheidet, was „groß" ist.
  const mode = sizeModeById(sizeMode);
  groups.sort((a, b) => {
    const diff = mode.get(b, quantities) - mode.get(a, quantities);
    if (diff !== 0) return diff;
    if (b.positionCount !== a.positionCount) return b.positionCount - a.positionCount;
    return (a.label ?? '').localeCompare(b.label ?? '', 'de');
  });

  const tree: LVNode = {
    id: FOCUS_ROOT_ID,
    kind: 'project',
    code: '',
    // Die Wurzel trägt „TREFFER" statt „PROJEKT": der Baum zeigt nicht das LV,
    // sondern den aktuellen Filter (labels.ts liest `ownCode`).
    ownCode: 'TREFFER',
    label: `nach ${FOCUS_GROUP_LABELS[groupBy]}`,
    positionCount: hitCount,
    totalPrice: groups.reduce((total, group) => total + group.totalPrice, 0),
    children: groups,
    position: null,
  };

  quantities.set(tree.id, hitQuantity);

  const counts = new Map<string, number>();
  counts.set(tree.id, hitCount);
  const openNodes = new Set<string>([tree.id]);
  const groupIds = new Set<string>();
  for (const group of groups) {
    counts.set(group.id, group.positionCount);
    openNodes.add(group.id);
    groupIds.add(group.id);
    for (const child of group.children) counts.set(child.id, 1);
  }

  return {
    tree,
    matches: { counts, filtering: true },
    openNodes,
    groupIds,
    groupCount: groups.length,
    hitCount,
    groupBy,
    quantities,
  };
}
