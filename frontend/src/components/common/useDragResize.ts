// Ziehen und Größe ändern für schwebende Flächen über dem Graph-Canvas.
//
// Herausgezogen aus `SelectionCard` (Issue #47), weil das Vergleichsfenster
// (WP-R, R3) dasselbe braucht. Zwei Kopien derselben Mechanik hätten sich
// auseinanderentwickelt — beim ersten Fehler in einer von beiden.
//
// Die Fläche hängt **rechts oben**: `right`/`top` statt `left`/`top`. Am Griff
// unten links wächst sie nach links und unten, die rechte Kante bleibt stehen.
// Am Griff unten rechts (`corner: 'right'`, Tabelle und Vergleich) bleibt die
// linke Kante stehen: Breite und `right` ändern sich dann gemeinsam.
//
// Ort und Größe hält der Aufrufer (Viewer-Zustand), nicht dieser Hook: beides
// soll den Ansichtswechsel überleben, und die Karte teilt ihre Breite mit dem
// Eigenschaften-Panel der Tabelle.

import { useCallback, useEffect, useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from 'react';

/** Abstand zum Fensterrand, der beim Ziehen sichtbar bleiben muss. */
const EDGE_MARGIN = 40;
/** Abstand zum Rand des Canvas, den die Fläche auch aufgezogen frei lässt. */
const EDGE_GAP = 16;
/** Schrittweite, wenn die Größe über die Pfeiltasten geändert wird. */
const KEY_STEP = 16;

export interface FloatPos {
  /** Abstand zur rechten Fensterkante. */
  right: number;
  top: number;
}

export interface FloatSize {
  width: number;
  /** `null` = so hoch wie der Inhalt, bis die Fläche einmal aufgezogen wurde. */
  height: number | null;
}

export interface DragResizeOptions {
  ref: RefObject<HTMLDivElement | null>;
  pos: FloatPos;
  size: FloatSize;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  setPos: (pos: FloatPos) => void;
  setSize: (size: FloatSize) => void;
  /** Ecke des Größen-Griffs; Standard unten links. */
  corner?: 'left' | 'right';
}

export interface DragResizeHandles {
  /** An den Ziehgriff: `<div {...handles.grip} />`. */
  grip: { onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void };
  /** An den Größen-Griff: `<button {...handles.resize} />`. */
  resize: {
    onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  };
}

/** Begrenzt `value` auf [min, max]; ein zu kleines `max` gewinnt nicht gegen `min`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Platz, der der Fläche zur Griffseite bzw. nach unten noch bleibt. Gemessen am
 * Canvas, auf dem sie liegt; in Umgebungen ohne Layout (Tests) fällt die
 * Rechnung auf das Fenstermaß zurück, damit die Grenzen sinnvoll bleiben.
 */
function roomFor(
  element: HTMLElement,
  corner: 'left' | 'right',
  minWidth: number,
  maxWidth: number,
  minHeight: number,
) {
  const own = element.getBoundingClientRect();
  const canvas = element.offsetParent?.getBoundingClientRect() ?? null;
  const width =
    canvas === null
      ? 0
      : corner === 'left'
        ? own.right - canvas.left - EDGE_GAP
        : canvas.right - own.left - EDGE_GAP;
  const height = canvas === null ? 0 : canvas.bottom - own.top - EDGE_GAP;
  // Ohne Layout (Tests) liefert der Browser lauter Nullen — dann gelten die
  // gemeinsamen Grenzen bzw. das Fenstermaß.
  return {
    width: width > minWidth ? Math.min(width, maxWidth) : maxWidth,
    height: height > minHeight ? height : window.innerHeight - 2 * EDGE_GAP,
  };
}

export function useDragResize(options: DragResizeOptions): DragResizeHandles {
  const { ref, pos, size, minWidth, maxWidth, minHeight, setPos, setSize } = options;
  const corner = options.corner ?? 'left';

  const drag = useRef({ on: false, x0: 0, y0: 0, right0: 0, top0: 0, width0: size.width });
  const resize = useRef({
    on: false,
    x0: 0,
    y0: 0,
    width0: 0,
    height0: 0,
    right0: 0,
    maxW: 0,
    maxH: 0,
  });

  /** Neue Breite setzen; am rechten Griff wandert `right` mit, die linke Kante bleibt. */
  const applySize = useCallback(
    (width: number, height: number, width0: number, right0: number): void => {
      if (corner === 'right') setPos({ right: right0 - (width - width0), top: pos.top });
      setSize({ width, height });
    },
    [corner, setPos, setSize, pos.top],
  );

  useEffect(() => {
    const move = (event: MouseEvent): void => {
      if (resize.current.on) {
        const state = resize.current;
        const dx = event.clientX - state.x0;
        // Am linken Griff vergrößert Ziehen nach links, am rechten nach rechts.
        applySize(
          clamp(state.width0 + (corner === 'left' ? -dx : dx), minWidth, state.maxW),
          clamp(state.height0 + (event.clientY - state.y0), minHeight, state.maxH),
          state.width0,
          state.right0,
        );
        return;
      }
      if (!drag.current.on) return;
      const dx = event.clientX - drag.current.x0;
      const dy = event.clientY - drag.current.y0;
      setPos({
        right: Math.min(
          Math.max(EDGE_MARGIN - drag.current.width0, drag.current.right0 - dx),
          window.innerWidth - EDGE_MARGIN,
        ),
        top: Math.min(Math.max(8, drag.current.top0 + dy), window.innerHeight - EDGE_MARGIN),
      });
    };
    const up = (): void => {
      drag.current.on = false;
      resize.current.on = false;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [applySize, setPos, corner, minWidth, minHeight]);

  const onGripMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLElement>): void => {
      event.stopPropagation();
      drag.current = {
        on: true,
        x0: event.clientX,
        y0: event.clientY,
        right0: pos.right,
        top0: pos.top,
        width0: size.width,
      };
    },
    [pos, size.width],
  );

  // Aus „auto" wird beim ersten Zug die gerade gerenderte Höhe — sonst springt
  // die Fläche auf die Mindesthöhe, bevor sie mitwächst.
  const currentHeight = useCallback(
    (): number => size.height ?? ref.current?.getBoundingClientRect().height ?? minHeight,
    [size.height, ref, minHeight],
  );

  const onResizeMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      const element = ref.current;
      if (element === null) return;
      const room = roomFor(element, corner, minWidth, maxWidth, minHeight);
      resize.current = {
        on: true,
        x0: event.clientX,
        y0: event.clientY,
        width0: size.width,
        height0: currentHeight(),
        right0: pos.right,
        maxW: room.width,
        maxH: room.height,
      };
    },
    [ref, corner, minWidth, maxWidth, minHeight, size.width, pos.right, currentHeight],
  );

  /** Pfeiltasten am Knopf: zur Griffseite und nach unten vergrößern, sonst verkleinern. */
  const onResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>): void => {
      const grow = corner === 'left' ? 'ArrowLeft' : 'ArrowRight';
      const shrink = corner === 'left' ? 'ArrowRight' : 'ArrowLeft';
      const dw = event.key === grow ? KEY_STEP : event.key === shrink ? -KEY_STEP : 0;
      const dh = event.key === 'ArrowDown' ? KEY_STEP : event.key === 'ArrowUp' ? -KEY_STEP : 0;
      if (dw === 0 && dh === 0) return;
      // Sonst wandert der Tastendruck weiter an den Canvas, der mit den
      // Pfeiltasten durch die Bubbles navigiert.
      event.preventDefault();
      event.stopPropagation();
      const element = ref.current;
      if (element === null) return;
      const room = roomFor(element, corner, minWidth, maxWidth, minHeight);
      applySize(
        clamp(size.width + dw, minWidth, room.width),
        clamp(currentHeight() + dh, minHeight, room.height),
        size.width,
        pos.right,
      );
    },
    [ref, corner, minWidth, maxWidth, minHeight, size.width, pos.right, currentHeight, applySize],
  );

  return {
    grip: { onMouseDown: onGripMouseDown },
    resize: { onMouseDown: onResizeMouseDown, onKeyDown: onResizeKeyDown },
  };
}
