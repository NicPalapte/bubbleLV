// Bubble — Popover: die einzige erhobene Fläche im System (der einzige Schatten).
// Hängt per Portal an <body> und positioniert sich absolut zum Viewport, ausgehend
// von `anchorRef` — nicht mehr `position: relative`+`absolute` im Elternelement.
// Grund: die Filter-Chip-Reihe in der Kopfleiste muss bei schmalen Fenstern
// scrollen bzw. Chips in ein Overflow-Menü verschieben können (Issue #24); ein
// scrollender/verschachtelter Container hätte ein kind-positioniertes Popover
// abgeschnitten. Portiert (Grundform) aus
// .claude/skills/bubble-design/components/core/Popover.jsx.
//
// Verschachtelung: ein Popover, das aus einem anderen Popover heraus geöffnet
// wird (Facetten-Chip im Menü „Weitere Filter“), hängt sich per Portal in das
// umgebende Popover statt an <body>. Sonst läge es im DOM neben dem äußeren
// Popover, dessen `useDismiss` würde jeden Klick darin als „außerhalb“ werten
// und beim mousedown schließen — der Chip wäre weg, bevor der click ankommt,
// der Filterwert liee sich nicht setzen.

import { createPortal } from 'react-dom';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

/** Luft, die zwischen Popover und Fensterrand bleiben soll. */
const VIEWPORT_MARGIN = 8;

/** Umgebendes Popover, in das ein verschachteltes Popover portiert wird. */
const PopoverHostContext = createContext<HTMLElement | null>(null);

export interface PopoverProps {
  open: boolean;
  children: ReactNode;
  /** min-width in px: 200 Picker, 244 Facetten, 260 Bereichsregler. */
  width?: number;
  align?: 'left' | 'right';
  /** Element, an dem sich das Popover ausrichtet (i. d. R. der Chip-Wrapper). */
  anchorRef: RefObject<HTMLElement | null>;
}

/**
 * `ref` gibt den eigenen (portierten) DOM-Knoten nach außen — der Aufrufer
 * braucht ihn für die Außerhalb-Klick-Erkennung (`useDismiss`), weil das
 * Popover nicht mehr im Anker-Element steckt, sondern am Portal-Ziel
 * (<body> oder dem umgebenden Popover) hängt.
 */
export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(
  { open, children, width = 244, align = 'left', anchorRef },
  forwardedRef,
) {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLDivElement);

  // Der eigene Knoten als State (nicht nur als Ref): geschachtelte Popover
  // brauchen ihn als Portal-Ziel, und ein Ref allein löst kein Rendern aus.
  const [hostNode, setHostNode] = useState<HTMLDivElement | null>(null);
  const setNode = useCallback((element: HTMLDivElement | null): void => {
    ref.current = element;
    setHostNode(element);
  }, []);
  const parentHost = useContext(PopoverHostContext);

  // Position folgt dem Anker im Viewport statt einem Elternelement — läuft bei
  // jedem Öffnen sowie bei Resize/Scroll neu, weil ein per Portal gehängtes
  // Popover sich sonst nicht mitbewegt.
  useLayoutEffect(() => {
    if (!open) return;
    const element = ref.current;
    const anchor = anchorRef.current;
    if (element === null || anchor === null) return;

    const place = (): void => {
      const rect = anchor.getBoundingClientRect();
      const naturalLeft = align === 'right' ? rect.right - element.offsetWidth : rect.left;
      const maxLeft = window.innerWidth - element.offsetWidth - VIEWPORT_MARGIN;
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, naturalLeft),
        Math.max(VIEWPORT_MARGIN, maxLeft),
      );
      element.style.left = `${left}px`;
      element.style.top = `${rect.bottom + 6}px`;
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, anchorRef]);

  if (!open) return null;
  return createPortal(
    <PopoverHostContext.Provider value={hostNode}>
      <div
        ref={setNode}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          minWidth: width,
          background: 'var(--white)',
          border: '1px solid var(--line2)',
          boxShadow: 'var(--shadow-popover)',
          fontFamily: 'var(--mono)',
          fontSize: 'var(--fs-meta)',
        }}
      >
        {children}
      </div>
    </PopoverHostContext.Provider>,
    parentHost ?? document.body,
  );
});

export function PopoverHead({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'var(--mute)',
        letterSpacing: 'var(--ls-caps)',
        fontSize: 'var(--fs-label)',
        textTransform: 'uppercase',
      }}
    >
      <span>{children}</span>
      {onReset !== undefined && (
        <button
          type="button"
          onClick={onReset}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--blue)',
            font: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'inherit',
          }}
        >
          zurücksetzen
        </button>
      )}
    </div>
  );
}

export interface PopoverRowProps {
  children: ReactNode;
  on?: boolean;
  onClick?: () => void;
  /** Mehrfachauswahl-Zeile einer Facette. */
  checkbox?: boolean;
  /** Rechtsbündiger Zähler. */
  trailing?: ReactNode;
  /** Zusätzlicher Inhalt zwischen Checkbox und Text (z. B. Status-Punkt). */
  leading?: ReactNode;
  title?: string;
}

export function PopoverRow({
  children,
  on = false,
  onClick,
  checkbox = false,
  trailing,
  leading,
  title,
}: PopoverRowProps) {
  return (
    // Echte Schaltfläche statt <div>: die Facettenwerte sind sonst weder mit der
    // Tastatur wählbar noch als (Mehrfach-)Auswahl erkennbar.
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={checkbox ? on : undefined}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 8,
        padding: 'var(--pad-popover-row)',
        border: 'none',
        textAlign: 'left',
        font: 'inherit',
        cursor: 'pointer',
        background: on ? 'var(--blueS)' : 'transparent',
        color: on ? 'var(--blueD)' : 'var(--ink)',
      }}
    >
      {checkbox && (
        <span
          style={{
            width: 12,
            height: 12,
            flexShrink: 0,
            border: `1px solid ${on ? 'var(--blue)' : 'var(--line2)'}`,
            background: on ? 'var(--blue)' : 'var(--white)',
            color: '#fff',
            fontSize: 9,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {on ? '✓' : ''}
        </span>
      )}
      {leading}
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {children}
      </span>
      {trailing !== undefined && (
        <span style={{ color: 'var(--mute)', flexShrink: 0 }}>{trailing}</span>
      )}
    </button>
  );
}
