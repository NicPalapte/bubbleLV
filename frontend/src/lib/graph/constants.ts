// Konstanten der Graph-Engine. Portiert aus design/claude-design/lv-graph.jsx;
// Vergabepaket-/Dokument-Overlays entfallen (out of scope).

import type { LVNode } from '../../types/lvNode';
import type { SizeModeId } from '../../state/viewer';

/** Anzeige-Ebene eines Knotens — steuert Radius und Label-Schwelle. */
export type Tier = 'project' | 'lot' | 'section' | 'subsection' | 'group' | 'position' | 'cluster';

/**
 * > so viele Geschwister-**Abschnitte** → eine einzelne Cluster-Bubble.
 * Positionen werden nie geclustert: sie liegen als Wolke um ihren Abschnitt
 * (WP-41-5, Issue #46). Der Schwellwert liegt bewusst hoch — die reale
 * Beispieldatei hat 29 Unterabschnitte, die einzeln lesbar bleiben sollen;
 * die Außenbeschriftung (Issue #41) trägt sie auch klein noch.
 */
export const CLUSTER_AT = 40;

export const RADII: Record<Tier, number> = {
  project: 70,
  lot: 50,
  section: 32,
  subsection: 22,
  group: 16,
  /**
   * Positionen sind immer gleich groß und klein (Issue #41): ein gefüllter
   * Kreis ohne Rand, unabhängig von Geschwisterzahl und Größenmodus.
   */
  position: 8,
  cluster: 30,
};

/**
 * Unterhalb dieser Bildschirmgröße (Radius × Zoom, in px) passt keine Schrift
 * mehr in eine Bubble — Nummer und Titel wandern dann unter die Bubble, in
 * bildschirmfester Schriftgröße, damit sie beim Rauszoomen lesbar bleiben.
 */
export const COMPACT_AT = 28;
/** Schriftgröße der Außenbeschriftung auf dem Schirm, in px. */
export const OUTSIDE_LABEL_PX = 10;

/**
 * Ist eine Positionswolke auf dem Schirm kleiner als so viele Pixel, wird sie
 * als **eine** Fläche mit Zähler gezeichnet statt als einzelne Kreise. Ohne
 * diese Detailstufe hingen bei 10k Positionen zehntausende Kreise im DOM.
 */
export const CLOUD_LOD_PX = 44;

/**
 * Erst ab so vielen Positionen lohnt die Detailstufe. Kleine Wolken bleiben
 * auch weit draußen als Punkte stehen — sie kosten kaum Zeichenzeit, und die
 * Anzahl ist auf einen Blick ablesbar.
 */
export const CLOUD_LOD_MIN = 8;

/**
 * Platz auf dem Schirm (in px), den zwei benachbarte Positionen brauchen, damit
 * ein Stichwort dazwischen passt (WP-Q, Issue #51). Gemessen wird am Abstand
 * der Wolke (`CLOUD_SPACING × Zoom`), nicht an einer festen Zoomstufe.
 */
export const KEYWORD_AT_PX = 40;

/**
 * Radius einer Positions-Bubble auf dem Schirm (px), ab dem Markierungen an ihr
 * gezeichnet werden — Hinweis-Ring (WP-R, R1) und später die Ähnlichkeitsgruppe
 * (decisions/0029). Darunter ist die Bubble selbst nur ein Punkt; ein Ring darum
 * wäre ein Fleck und keine Markierung. `RADII.position` mal Zoom gegen diesen
 * Wert — Positionen sind immer gleich groß (Issue #41), also gilt die Schwelle
 * für alle gleichzeitig.
 */
export const MARK_AT_PX = 4;

/**
 * Trägt der Graph bei diesem Zoom Markierungen an den Positionen? Eine
 * Funktion statt einer Rechnung im Render, damit die Schwelle einzeln prüfbar
 * ist und R2 (Ähnlichkeit) dieselbe benutzt statt einer zweiten, leicht
 * anderen.
 */
export function marksVisible(zoom: number): boolean {
  return RADII.position * zoom >= MARK_AT_PX;
}

/** Kleinster Zoom k, ab dem eine Ebene ihr Label zeigt. */
export const LABEL_K: Record<Tier, number> = {
  project: 0.18,
  lot: 0.28,
  section: 0.45,
  subsection: 0.7,
  group: 0.95,
  // Die OZ einer Position passt erst in den Punkt, wenn man weit hineinzoomt;
  // in einer Wolke aus hunderten Punkten stünde sie sonst übereinander.
  position: 1.8,
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

/**
 * Summe der Mengen je Knoten, über die **gefilterte** Menge gerechnet
 * (lib/graph/quantities.ts). Nur der Modus „Menge" liest sie: die Mengen des
 * ganzen LV taugen dafür nicht, weil sie Einheiten mischen würden.
 */
export type QuantityByNode = ReadonlyMap<string, number>;

export interface SizeMode {
  id: SizeModeId;
  label: string;
  short: string;
  get(node: LVNode, quantities: QuantityByNode | null): number;
  /** `unit` ist gesetzt, solange die gefilterte Menge genau eine Einheit hat. */
  format(value: number, unit: string | null): string;
  uniform: boolean;
  /**
   * Ob der Modus Positionen untereinander ordnet. „Anz. Positionen" tut das
   * nicht — jede Position zählt 1 —, deshalb bleibt die Wolke dort in
   * OZ-Reihenfolge statt in einer willkürlichen (WP-Q, Issue #51).
   */
  ranksPositions: boolean;
}

export const SIZE_MODES: readonly SizeMode[] = [
  {
    id: 'count',
    label: 'Anz. Positionen',
    short: 'POS',
    get: (node) => node.positionCount,
    format: (value) => `${value.toLocaleString('de-DE')} Pos.`,
    uniform: false,
    ranksPositions: false,
  },
  {
    id: 'cost',
    label: 'Gesamtpreis €',
    short: 'GP €',
    get: (node) => node.totalPrice,
    format: (value) => `${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`,
    uniform: false,
    ranksPositions: true,
  },
  {
    id: 'quantity',
    label: 'Menge',
    short: 'MENGE',
    get: (node, quantities) => quantities?.get(node.id) ?? 0,
    format: (value, unit) =>
      `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${unit === null ? '' : ` ${unit}`}`,
    uniform: false,
    ranksPositions: true,
  },
  {
    id: 'uniform',
    label: 'Einheitlich',
    short: 'Einheitl.',
    get: () => 1,
    format: () => '',
    uniform: true,
    ranksPositions: false,
  },
];

/**
 * Der Modus, der tatsächlich trägt. „Gesamtpreis" sagt nichts über eine Datei
 * ohne Einheitspreise, „Menge" nichts über eine Auswahl, die Einheiten mischt —
 * beide fallen dann auf „Anzahl" zurück (docs/decisions/0019-mengen-nur-je-einheit.md).
 *
 * Die Regel steht hier und nicht bei ihren Aufrufern: Größe **und** Sortierung
 * müssen dasselbe Maß benutzen, sonst ordnet der Graph nach einer Zahl, die er
 * selbst nicht mehr zeigt.
 */
export function effectiveSizeMode(
  sizeMode: SizeModeId,
  context: { priceless: boolean; unit: string | null },
): SizeModeId {
  if (sizeMode === 'cost' && context.priceless) return 'count';
  if (sizeMode === 'quantity' && context.unit === null) return 'count';
  return sizeMode;
}

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
