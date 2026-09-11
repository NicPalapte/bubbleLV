// Knoten-Darstellungen des Bubble-Graphen: Bubble und Cluster.
// Portiert aus `BubbleNode`/`ClusterNode` in design/claude-design/lv-graph.jsx;
// Vergabepaket-/Aufgaben-Overlays entfallen.
//
// Issue #41: Positionen sind immer derselbe kleine, gefüllte Kreis ohne Rand
// (der frühere `DotNode` ist darin aufgegangen). Los und Abschnitte tragen ihre
// Nummer immer — ist die Bubble auf dem Schirm zu klein für Schrift, steht die
// Beschriftung darunter, in bildschirmfester Größe mit weißem Halo.

import { COMPACT_AT, LABEL_K, OUTSIDE_LABEL_PX, RADII } from '../../lib/graph/constants';
import { formatCount, truncate } from '../../lib/format';
import { codeLabelFor } from '../../lib/graph/labels';
import type { PlacedNode } from '../../lib/graph/layoutRadial';
import type { LVNode } from '../../types/lvNode';

interface CommonProps {
  placed: PlacedNode;
  zoom: number;
  dimmed: boolean;
  hidden: boolean;
  hovered: boolean;
  /** Aktueller Tastatur-Fokus (Issue #25) — wie `hovered`, aber von der Tastatur. */
  focused: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  /** Doppelklick: Ausschnitt auf diesen Knoten und seinen Teilbaum einpassen. */
  onDoubleClick?: () => void;
}

interface BubbleProps extends CommonProps {
  node: LVNode;
  radius: number;
  subLabel: string;
  collapsible: boolean;
  isCollapsed: boolean;
  childCount: number;
  onToggleCollapse: () => void;
  /** Sprung in die Positionstabelle — nur über das Symbol, nicht per Bubble-Klick. */
  onOpenTable: () => void;
}

const TIER_FILL: Record<string, { fill: string; stroke: string }> = {
  project: { fill: 'var(--bub-project)', stroke: 'var(--bub-project-line)' },
  lot: { fill: 'var(--bub-lot)', stroke: 'var(--bub-lot-line)' },
  section: { fill: 'var(--bub-section)', stroke: 'var(--bub-section-line)' },
  subsection: { fill: 'var(--bub-subsection)', stroke: 'var(--bub-subsection-line)' },
  group: { fill: 'var(--bub-group)', stroke: 'var(--bub-group-line)' },
};

/** Weißer Halo hinter Schrift, die über dem Raster oder über Kanten steht. */
const HALO = {
  paintOrder: 'stroke' as const,
  stroke: 'var(--white)',
  strokeLinejoin: 'round' as const,
};

/**
 * Tabellensymbol an einer Sammel-Bubble. Der Klick auf die Bubble selbst öffnet
 * bzw. schließt sie; nur dieses Symbol wechselt in die Tabelle (Issue #10).
 */
function TableBadge({
  x,
  y,
  size,
  onOpen,
}: {
  x: number;
  y: number;
  size: number;
  onOpen: () => void;
}) {
  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer' }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <title>Positionstabelle öffnen</title>
      <circle r={size} fill="var(--white)" stroke="var(--blue)" strokeWidth="1.2" />
      <g
        fill="none"
        stroke="var(--blue)"
        strokeWidth={Math.max(0.9, size * 0.14)}
        strokeLinecap="round"
      >
        <rect x={-size * 0.46} y={-size * 0.4} width={size * 0.92} height={size * 0.8} />
        <line x1={-size * 0.46} y1={-size * 0.12} x2={size * 0.46} y2={-size * 0.12} />
        <line x1={-size * 0.46} y1={size * 0.16} x2={size * 0.46} y2={size * 0.16} />
        <line x1={-size * 0.08} y1={-size * 0.4} x2={-size * 0.08} y2={size * 0.4} />
      </g>
    </g>
  );
}

function mainFontSize(tier: string): number {
  switch (tier) {
    case 'project':
      return 16;
    case 'lot':
      return 13;
    case 'section':
      return 11;
    case 'subsection':
      return 9;
    case 'group':
      return 8;
    default:
      return 7;
  }
}

/** Schriftgröße in Weltkoordinaten, die auf dem Schirm `px` groß erscheint. */
function screenFont(px: number, zoom: number): number {
  return px / zoom;
}

interface OutsideLabelProps {
  code: string;
  title: string | null;
  /** Abstand der ersten Zeile zum Mittelpunkt (Radius plus Luft). */
  offset: number;
  zoom: number;
  dimmed: boolean;
}

/**
 * Beschriftung unter einer Bubble, die auf dem Schirm zu klein für Schrift ist:
 * Nummer immer, Titel nur wenn der Zoom Platz dafür lässt. Beide bildschirmfest,
 * damit sie beim Rauszoomen nicht mitschrumpfen (Issue #41).
 */
function OutsideLabel({ code, title, offset, zoom, dimmed }: OutsideLabelProps) {
  if (code === '' && title === null) return null;
  const size = screenFont(OUTSIDE_LABEL_PX, zoom);
  const line = size * 1.2;
  return (
    <g style={{ pointerEvents: 'none', opacity: dimmed ? 0.5 : 1 }}>
      {code !== '' && (
        <text
          textAnchor="middle"
          y={offset + size}
          fontFamily="var(--mono)"
          fontSize={size}
          fontWeight="600"
          fill="var(--ink)"
          strokeWidth={size * 0.35}
          style={HALO}
        >
          {code}
        </text>
      )}
      {title !== null && (
        <text
          textAnchor="middle"
          y={offset + size + (code === '' ? 0 : line)}
          fontFamily="var(--sans)"
          fontSize={size * 0.9}
          fill="var(--dim)"
          strokeWidth={size * 0.35}
          style={HALO}
        >
          {truncate(title, 36)}
        </text>
      )}
    </g>
  );
}

export function BubbleNode(props: BubbleProps) {
  const {
    placed,
    node,
    zoom,
    dimmed,
    hidden,
    hovered,
    focused,
    onHover,
    onClick,
    onDoubleClick,
    radius,
    subLabel,
    collapsible,
    isCollapsed,
    childCount,
    onToggleCollapse,
    onOpenTable,
  } = props;

  // Tastatur-Fokus zählt überall dort wie Hover — sonst ließen sich Badges,
  // Kurztext-Tooltip und Betonung nur mit der Maus erreichen (Issue #25).
  const active = hovered || focused;
  const opacity = hidden ? 0.05 : dimmed ? 0.16 : 1;
  const groupStyle = {
    cursor: 'pointer',
    opacity,
    transition: 'opacity .15s',
    pointerEvents: hidden ? ('none' as const) : ('auto' as const),
  };
  const handlers = {
    onMouseEnter: () => onHover(placed.id),
    onMouseLeave: () => onHover(null),
    onClick: (event: { stopPropagation: () => void; detail: number }) => {
      event.stopPropagation();
      // Der zweite Klick eines Doppelklicks löst nur das Einpassen aus —
      // sonst klappte die Bubble auf und gleich wieder zu.
      if (event.detail > 1) return;
      onClick();
    },
    onDoubleClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      onDoubleClick?.();
    },
  };

  if (placed.tier === 'position') {
    // Ein Kreis, eine Farbe, kein Rand — Hover und Fokus heben nur den Rand an.
    const showCode = active || zoom >= LABEL_K.position;
    return (
      <g
        transform={`translate(${placed.cx},${placed.cy})`}
        style={groupStyle}
        {...handlers}
        data-tier="position"
      >
        <circle
          r={active ? radius + 1.5 : radius}
          fill="var(--bub-position-line)"
          stroke={active ? 'var(--ink)' : 'none'}
          strokeWidth={active ? 1.5 : 0}
          style={{ transition: 'all .15s' }}
        />
        {focused && (
          <circle
            r={radius + 5}
            fill="none"
            stroke="var(--blue)"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
        )}
        {showCode && node.ownCode !== '' && (
          <text
            textAnchor="middle"
            y={-radius - 4}
            fontFamily="var(--mono)"
            fontSize="8"
            fill="var(--ink)"
            strokeWidth={2.5}
            style={HALO}
          >
            {truncate(node.ownCode, 14)}
          </text>
        )}
      </g>
    );
  }

  const colors = TIER_FILL[placed.tier] ?? TIER_FILL.section;
  const title = node.label ?? node.code;
  const code = codeLabelFor(node, placed.tier);
  // Auf dem Schirm zu klein für Schrift → Beschriftung unter die Bubble.
  const compact = radius * zoom < COMPACT_AT;
  const showTitle = zoom >= LABEL_K[placed.tier];
  // Tabellensymbol und Einklapp-Knopf würden kleine Bubbles zudecken — sie
  // erscheinen erst, wenn die Bubble auf dem Schirm groß genug ist, sonst beim
  // Überfahren.
  const showBadges = active || radius * zoom >= 30;

  return (
    <g transform={`translate(${placed.cx},${placed.cy})`} style={groupStyle} {...handlers}>
      <circle
        r={radius}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={active ? 2 : placed.tier === 'project' ? 1.6 : 1.2}
        style={{ transition: 'all .15s' }}
      />
      {focused && (
        <circle
          r={radius + 5}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      )}
      {compact ? (
        <OutsideLabel
          code={code}
          // Ab halbem Beschriftungs-Zoom lohnt der Titel; darunter stünden die
          // Titel benachbarter Bubbles übereinander.
          title={zoom >= LABEL_K[placed.tier] * 0.5 ? title : null}
          offset={radius + 3 / zoom}
          zoom={zoom}
          dimmed={dimmed}
        />
      ) : (
        <>
          {code !== '' && (
            <text
              textAnchor="middle"
              y={showTitle ? -radius * 0.32 - 2 : 4}
              fontFamily="var(--mono)"
              fontSize={showTitle ? Math.max(7, radius * 0.2) : Math.max(8, radius * 0.3)}
              fontWeight={showTitle ? 400 : 600}
              fill={showTitle ? 'var(--mute)' : 'var(--ink)'}
              letterSpacing="0.5"
            >
              {code}
            </text>
          )}
          {showTitle && (
            <>
              <text
                textAnchor="middle"
                y={radius * 0.05 + 3}
                fontFamily="var(--sans)"
                fontSize={mainFontSize(placed.tier)}
                fontWeight={placed.tier === 'project' ? 700 : 600}
                fill="var(--ink)"
              >
                {truncate(title, 22)}
              </text>
              {subLabel !== '' && (
                <text
                  textAnchor="middle"
                  y={radius * 0.32 + 11}
                  fontFamily="var(--mono)"
                  fontSize={Math.max(7, radius * 0.2)}
                  fill="var(--dim)"
                >
                  {subLabel}
                </text>
              )}
            </>
          )}
        </>
      )}
      {showBadges && (
        <TableBadge
          x={-radius * 0.55}
          y={radius * 0.92}
          size={Math.max(7, radius * 0.22)}
          onOpen={onOpenTable}
        />
      )}
      {collapsible && showBadges && (
        <g
          transform={`translate(${radius * 0.55},${radius * 0.92})`}
          style={{ cursor: 'pointer' }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse();
          }}
        >
          <title>{isCollapsed ? `${formatCount(childCount)} einblenden` : 'Einklappen'}</title>
          <circle
            r={Math.max(7, radius * 0.22)}
            fill="var(--white)"
            stroke={isCollapsed ? 'var(--blue)' : 'var(--line2)'}
            strokeWidth="1.2"
          />
          <line
            x1={-4}
            y1={0}
            x2={4}
            y2={0}
            stroke={isCollapsed ? 'var(--blue)' : 'var(--dim)'}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {isCollapsed && (
            <line
              x1={0}
              y1={-4}
              x2={0}
              y2={4}
              stroke="var(--blue)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          )}
        </g>
      )}
    </g>
  );
}

interface ClusterProps extends Omit<CommonProps, 'hidden'> {
  sampleTier: string;
  /** Cluster ist aufgelöst — die Kinder liegen als Punkte auf dem Ring. */
  expanded: boolean;
  onOpenTable: () => void;
}

const CLUSTER_LABEL: Record<string, string> = {
  position: 'POS.',
  group: 'GR.',
  subsection: 'UNTER',
  section: 'ABS.',
};

export function ClusterNode({
  placed,
  zoom,
  dimmed,
  hovered,
  focused,
  onHover,
  onClick,
  onDoubleClick,
  sampleTier,
  expanded,
  onOpenTable,
}: ClusterProps) {
  const radius = RADII.cluster;
  const active = hovered || focused;
  const showLabel = zoom >= LABEL_K.cluster;
  return (
    <g
      transform={`translate(${placed.cx},${placed.cy})`}
      style={{ cursor: 'pointer', opacity: dimmed ? 0.16 : 1, transition: 'opacity .15s' }}
      onMouseEnter={() => onHover(placed.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick?.();
      }}
    >
      <circle
        r={radius + 6}
        fill="none"
        stroke="var(--bub-cluster-line)"
        strokeDasharray="2 3"
        opacity="0.55"
      />
      <circle
        r={radius}
        fill="var(--bub-cluster)"
        stroke="var(--bub-cluster-line)"
        strokeWidth={active ? 2 : 1.2}
        style={{ transition: 'all .15s' }}
      />
      {focused && (
        <circle
          r={radius + 11}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      )}
      {showLabel ? (
        <>
          <text
            textAnchor="middle"
            y={-1}
            fontFamily="var(--sans)"
            fontSize="13"
            fontWeight="700"
            fill="var(--ink)"
          >
            {formatCount(placed.clusterCount)}
          </text>
          <text
            textAnchor="middle"
            y={13}
            fontFamily="var(--mono)"
            fontSize="8.5"
            fill="var(--dim)"
            letterSpacing="0.5"
          >
            {CLUSTER_LABEL[sampleTier] ?? 'KIND.'}
          </text>
        </>
      ) : (
        <OutsideLabel
          code={`${formatCount(placed.clusterCount)} ${CLUSTER_LABEL[sampleTier] ?? 'KIND.'}`}
          title={null}
          offset={radius + 8 / zoom}
          zoom={zoom}
          dimmed={dimmed}
        />
      )}
      {(active || zoom >= 0.8) && (
        <TableBadge x={-radius * 0.78} y={radius * 0.78} size={10} onOpen={onOpenTable} />
      )}
      {active && (
        <g transform="translate(0, 34)">
          <rect x="-34" y="-8" width="68" height="16" fill="var(--blue)" rx="2" />
          <text
            textAnchor="middle"
            y="3"
            fontFamily="var(--mono)"
            fontSize="9"
            fontWeight="600"
            fill="#fff"
          >
            {expanded ? 'Zuklappen' : 'Aufklappen'}
          </text>
        </g>
      )}
    </g>
  );
}
