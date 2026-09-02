// Bubble — TreeRow: eine Zeile der LV-Struktur (Abschnitt oder Position).
// Portiert aus .claude/skills/bubble-design/components/core/TreeRow.jsx.
//
// Ergänzungen gegenüber der Skill-Vorlage:
//  - ARIA (`treeitem`, aria-level/-selected/-expanded): das Markup ist aus Divs
//    gebaut und wäre sonst keine Baumstruktur.
//  - `onToggle`: das Auf-/Zuklappen hängt am Dreieck, nicht an der ganzen Zeile,
//    damit ein Klick auf die Zeile den Knoten auswählen kann.

import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

export interface TreeRowProps {
  code: string;
  label: string;
  depth?: number;
  /** Positionszeile: kein Dreieck, eingerückt, leichteres Gewicht. */
  leaf?: boolean;
  open?: boolean;
  selected?: boolean;
  /** Linker Balken, wenn nicht ausgewählt. */
  accent?: string;
  /** Meist <StatusPill dotOnly/>. */
  status?: ReactNode;
  count?: ReactNode;
  /** Ausgefiltert, aber weiter sichtbar (hideMode 'dim'). */
  dimmed?: boolean;
  onClick?: () => void;
  onToggle?: () => void;
  title?: string;
}

export function TreeRow({
  code,
  label,
  depth = 0,
  leaf = false,
  open = false,
  selected = false,
  accent,
  status,
  count,
  dimmed = false,
  onClick,
  onToggle,
  title,
}: TreeRowProps) {
  const toggle = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    if (onToggle === undefined) return;
    event.stopPropagation();
    onToggle();
  };

  return (
    <div
      onClick={onClick}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={leaf || onToggle === undefined ? undefined : open}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: leaf ? '4px 12px' : 'var(--pad-tree-row)',
        paddingLeft: 12 + depth * 6,
        borderLeft: selected ? '2px solid var(--blue)' : `2px solid ${accent ?? 'transparent'}`,
        background: selected ? 'var(--blueS)' : 'transparent',
        color: selected ? 'var(--blueD)' : 'var(--ink)',
        fontFamily: 'var(--mono)',
        fontSize: leaf ? 'var(--fs-body)' : 'var(--fs-row)',
        opacity: dimmed ? 'var(--dim-section)' : 1,
        cursor: 'pointer',
      }}
    >
      {!leaf && (
        // Auf-/Zuklappen ist eine eigene Schaltfläche neben der Zeile: die Zeile
        // selbst navigiert. Als <span> war sie nur mit der Maus erreichbar.
        <button
          type="button"
          onClick={toggle}
          disabled={onToggle === undefined}
          aria-label={open ? `${label} zuklappen` : `${label} aufklappen`}
          style={{
            width: 10,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--mute)',
            fontSize: 9,
            lineHeight: 1,
            cursor: onToggle === undefined ? 'default' : 'pointer',
          }}
        >
          {onToggle === undefined ? '' : open ? '▾' : '▸'}
        </button>
      )}
      {code !== '' && (
        <span style={{ color: 'var(--mute)', fontSize: 10, flexShrink: 0 }}>{code}</span>
      )}
      <span
        style={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: leaf ? 400 : 500,
        }}
      >
        {label}
      </span>
      {status}
      {count !== undefined && (
        <span
          style={{
            color: 'var(--mute)',
            fontSize: 'var(--fs-label)',
            minWidth: 32,
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}
