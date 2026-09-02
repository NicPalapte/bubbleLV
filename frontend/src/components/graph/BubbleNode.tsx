// Knoten-Darstellungen des Bubble-Graphen: Bubble, Punkt, Cluster.
// Portiert aus `BubbleNode`/`DotNode`/`ClusterNode` in
// design/claude-design/lv-graph.jsx; Vergabepaket-/Aufgaben-Overlays entfallen.

import { LABEL_K, RADII } from '../../lib/graph/constants';
import { formatCount, truncate } from '../../lib/format';
import type { PlacedNode } from '../../lib/graph/layoutRadial';
import type { LVNode } from '../../types/lvNode';

interface CommonProps {
  placed: PlacedNode;
  zoom: number;
  dimmed: boolean;
  hidden: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
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
  position: { fill: 'var(--bub-position)', stroke: 'var(--bub-position-line)' },
};

/**
 * Tabellensymbol an einer Sammel-Bubble. Der Klick auf die Bubble selbst öffnet
 * bzw. schließt sie; nur dieses Symbol wechselt in die Tabelle (Issue #10).
 */
function TableBadge({ x, y, size, onOpen }: {
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

function topLabelFor(node: LVNode, tier: string): string {
  if (tier === 'project') return 'PROJEKT';
  if (tier === 'lot') return node.code === '' ? 'LOS' : `LOS ${node.code}`;
  if (tier === 'position') return '';
  return node.code === '' ? '' : `§ ${node.code}`;
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

export function BubbleNode(props: BubbleProps) {
  const {
    placed,
    node,
    zoom,
    dimmed,
    hidden,
    hovered,
    onHover,
    onClick,
    radius,
    subLabel,
    collapsible,
    isCollapsed,
    childCount,
    onToggleCollapse,
    onOpenTable,
  } = props;

  const showLabel = zoom >= LABEL_K[placed.tier];
  // Tabellensymbol und Einklapp-Knopf würden kleine Bubbles zudecken — sie
  // erscheinen erst, wenn die Bubble auf dem Schirm groß genug ist, sonst beim
  // Überfahren.
  const showBadges = hovered || radius * zoom >= 30;
  const colors = TIER_FILL[placed.tier] ?? TIER_FILL.section;
  const opacity = hidden ? 0.05 : dimmed ? 0.16 : 1;
  const title = node.label ?? node.code;

  if (placed.tier === 'position') {
    return (
      <g
        transform={`translate(${placed.cx},${placed.cy})`}
        style={{
          cursor: 'pointer',
          opacity,
          transition: 'opacity .15s',
          pointerEvents: hidden ? 'none' : 'auto',
        }}
        onMouseEnter={() => onHover(placed.id)}
        onMouseLeave={() => onHover(null)}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        <circle
          r={radius}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={hovered ? 2 : 1.2}
          style={{ transition: 'all .15s' }}
        />
        {showLabel && (
          <text
            textAnchor="middle"
            y={3.5}
            fontFamily="var(--mono)"
            fontSize="9"
            fontWeight="600"
            fill="var(--ink)"
          >
            {truncate(node.code, 9)}
          </text>
        )}
        {hovered && (
          <g transform={`translate(${radius + 6},-11)`}>
            <rect
              x={0}
              y={0}
              width={Math.max(60, truncate(title, 36).length * 5.5 + 16)}
              height={22}
              fill="var(--ink)"
              rx="2"
              opacity="0.95"
            />
            <text x={8} y={14.5} fontFamily="var(--mono)" fontSize="10" fill="#fff">
              {truncate(title, 36)}
            </text>
          </g>
        )}
      </g>
    );
  }

  return (
    <g
      transform={`translate(${placed.cx},${placed.cy})`}
      style={{
        cursor: 'pointer',
        opacity,
        transition: 'opacity .15s',
        pointerEvents: hidden ? 'none' : 'auto',
      }}
      onMouseEnter={() => onHover(placed.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <circle
        r={radius}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={hovered ? 2 : placed.tier === 'project' ? 1.6 : 1.2}
        style={{ transition: 'all .15s' }}
      />
      {showLabel && (
        <>
          <text
            textAnchor="middle"
            y={-radius * 0.32 - 2}
            fontFamily="var(--mono)"
            fontSize={Math.max(7, radius * 0.2)}
            fill="var(--mute)"
            letterSpacing="0.5"
          >
            {topLabelFor(node, placed.tier)}
          </text>
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

interface DotProps extends CommonProps {
  node: LVNode;
}

export function DotNode({ placed, node, zoom, dimmed, hidden, hovered, onHover, onClick }: DotProps) {
  const radius = 5;
  const showLabel = hovered || zoom >= 1.8;
  return (
    <g
      transform={`translate(${placed.cx},${placed.cy})`}
      style={{
        cursor: 'pointer',
        opacity: hidden ? 0.05 : dimmed ? 0.16 : 1,
        transition: 'opacity .15s',
        pointerEvents: hidden ? 'none' : 'auto',
      }}
      onMouseEnter={() => onHover(placed.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <circle
        r={hovered ? radius + 1.5 : radius}
        fill={placed.tier === 'position' ? 'var(--bub-position-line)' : 'var(--bub-lot-line)'}
        stroke="var(--white)"
        strokeWidth="1"
      />
      {showLabel && (
        <text
          textAnchor="middle"
          y={-radius - 4}
          fontFamily="var(--mono)"
          fontSize="8"
          fill="var(--ink)"
          style={{ paintOrder: 'stroke', stroke: 'var(--white)', strokeWidth: 2.5 }}
        >
          {node.code === '' ? truncate(node.label, 14) : truncate(node.code, 14)}
        </text>
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
  onHover,
  onClick,
  sampleTier,
  expanded,
  onOpenTable,
}: ClusterProps) {
  const radius = RADII.cluster;
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
        strokeWidth={hovered ? 2 : 1.2}
        style={{ transition: 'all .15s' }}
      />
      {showLabel && (
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
      )}
      {(hovered || zoom >= 0.8) && (
        <TableBadge x={-radius * 0.78} y={radius * 0.78} size={10} onOpen={onOpenTable} />
      )}
      {hovered && (
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
