// Konstanten der Graph-Engine. Portiert aus design/claude-design/lv-graph.jsx;
// Vergabepaket-/Dokument-Overlays entfallen (out of scope).

import type { LVNode } from '../../types/lvNode';
import type { SizeModeId } from '../../state/viewer';

/** Anzeige-Ebene eines Knotens — steuert Radius und Label-Schwelle. */
export type Tier = 'project' | 'lot' | 'section' | 'subsection' | 'group' | 'position' | 'cluster';

/** > so viele Geschwister → eine einzelne Cluster-Bubble. */
export const CLUSTER_AT = 24;
/** > so viele Geschwister (und ≤ CLUSTER_AT) → Punkt-Darstellung. */
export const DOT_AT = 8;

export const RADII: Record<Tier, number> = {
  project: 70,
  lot: 50,
  section: 32,
  subsection: 22,
  group: 16,
  position: 17,
  cluster: 30,
};

/** Kleinster Zoom k, ab dem eine Ebene ihr Label zeigt. */
export const LABEL_K: Record<Tier, number> = {
  project: 0.18,
  lot: 0.28,
  section: 0.45,
  subsection: 0.7,
  group: 0.95,
  position: 0.85,
  cluster: 0.35,
};

export const MIN_ZOOM = 0.12;
export const MAX_ZOOM = 4;

/**
 * Spanne, über die der wertabhängige Größenmodus den Basisradius streckt.
 * `SIZE_MAX_FACTOR` ist zugleich die Obergrenze, mit der `layoutRadial` den
 * Platzbedarf einer Bubble rechnet.
 */
export const SIZE_MIN_FACTOR = 0.45;
export const SIZE_MAX_FACTOR = 1.7;

/**
 * Radius einer Bubble im gewählten Größenmodus. Der Radius wächst mit der
 * Wurzel des Werts, damit die *Fläche* dem Wert folgt — so liest sich der
 * Größenvergleich richtig.
 *
 * Haben alle Knoten einer Ebene denselben Wert (etwa jede Position zählt im
 * Modus "Anz. Positionen" genau 1), gibt es nichts zu vergleichen: dann bleibt
 * es beim Basisradius, statt jede Bubble auf das Maximum aufzublasen.
 */
export function sizedRadius(
  tier: Tier,
  value: number,
  range: { min: number; max: number },
  uniform: boolean,
): number {
  const base = RADII[tier];
  if (uniform || range.max <= 0 || range.max === range.min) return base;
  const share = Math.sqrt(Math.max(0, value) / range.max);
  return base * (SIZE_MIN_FACTOR + share * (SIZE_MAX_FACTOR - SIZE_MIN_FACTOR));
}

export interface SizeMode {
  id: SizeModeId;
  label: string;
  short: string;
  get(node: LVNode): number;
  format(value: number): string;
  uniform: boolean;
}

export const SIZE_MODES: readonly SizeMode[] = [
  {
    id: 'count',
    label: 'Anz. Positionen',
    short: 'POS',
    get: (node) => node.positionCount,
    format: (value) => `${value.toLocaleString('de-DE')} Pos.`,
    uniform: false,
  },
  {
    id: 'cost',
    label: 'Gesamtpreis €',
    short: 'GP €',
    get: (node) => node.totalPrice,
    format: (value) => `${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`,
    uniform: false,
  },
  {
    id: 'uniform',
    label: 'Einheitlich',
    short: 'Einheitl.',
    get: () => 1,
    format: () => '',
    uniform: true,
  },
];

export function sizeModeById(id: SizeModeId): SizeMode {
  return SIZE_MODES.find((mode) => mode.id === id) ?? SIZE_MODES[0];
}

/**
 * Anzeige-Ebene aus Knotenart und Tiefe. Abschnitte können beliebig tief
 * verschachtelt sein; ab Tiefe 3 werden sie kleiner dargestellt, damit der
 * Ring-Aufbau lesbar bleibt.
 */
export function tierOf(node: LVNode, depth: number): Tier {
  if (node.kind === 'position') return 'position';
  if (node.kind === 'project') return 'project';
  if (node.kind === 'lot') return 'lot';
  if (depth <= 2) return 'section';
  if (depth === 3) return 'subsection';
  return 'group';
}
