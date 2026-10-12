// Geführte Tour über dem Hauptscreen (Mockup v7, Bereich K): ein Spotlight auf
// einem echten Bedienelement plus eine kleine Karte daneben. Das Spotlight
// fängt keine Klicks ab — wer mag, klickt das markierte Element selbst; manche
// Schritte warten genau darauf (`done` in tourSteps.ts).
//
// Nach dem ersten LV einer Sitzung bietet Bubble die Tour einmal an.
// Das Angebot steht über der Legende: feste Teile bleiben stehen, Neues weicht aus. Ob sie
// schon angeboten war, steht nur im React-State: ein Reload bietet sie wieder
// an, gespeichert wird nichts (.claude/CLAUDE.md, kein localStorage).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import { CARD_TARGET, POINT_TARGET, TOUR_STEPS, type TourPrepare } from './tourSteps';

/**
 * Abstand zwischen zwei Suchen nach dem Ziel. Der Punkt-Schritt sucht über alle
 * Punkte (bei ~10k Positionen ebenso viele Elemente) — das nicht in jedem Frame.
 */
const SEARCH_MS = 100;
/** So lange darf ein Ziel fehlen, bevor die Tour den Schritt überspringt. */
const MISSING_MS = 800;
/** Luft zwischen Element und Spotlight-Rand. */
const PAD = 6;
/** Kleinster Durchmesser des runden Spotlights — ein Punkt ist oft nur 6 px groß. */
const ROUND_MIN = 40;
const CARD_WIDTH = 300;
/** Platz, den die Karte unter dem Ziel braucht; sonst steht sie darüber. */
const CARD_SPACE = 190;
const EDGE = 12;

const BUTTON =
  'h-[28px] cursor-pointer rounded-[var(--r-sm)] border px-[10px] font-mono text-[10.5px]';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Erstes Element zum Selektor, das im Fenster sichtbar ist. */
function findVisible(selector: string): Element | null {
  for (const element of document.querySelectorAll(selector)) {
    if (isVisible(element.getBoundingClientRect())) return element;
  }
  return null;
}

function isVisible(rect: DOMRect): boolean {
  if (rect.width === 0 && rect.height === 0) return false;
  return !(
    rect.right < 0 ||
    rect.bottom < 0 ||
    rect.left > window.innerWidth ||
    rect.top > window.innerHeight
  );
}

function sameBox(a: Box | null, b: Box | null): boolean {
  if (a === null || b === null) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/** Spotlight-Fläche: etwas größer als das Ziel, beim Punkt rund und mindestens ROUND_MIN. */
function spotBox(rect: Box, round: boolean): Box {
  if (!round) {
    return {
      top: rect.top - PAD,
      left: rect.left - PAD,
      width: rect.width + 2 * PAD,
      height: rect.height + 2 * PAD,
    };
  }
  const size = Math.max(ROUND_MIN, rect.width + 2 * PAD, rect.height + 2 * PAD);
  return {
    top: rect.top + rect.height / 2 - size / 2,
    left: rect.left + rect.width / 2 - size / 2,
    width: size,
    height: size,
  };
}

type CardPlace = { left: number; top: number } | { left: number; bottom: number };

/**
 * Karte unter das Ziel, sonst darüber. Ist das Ziel fast so hoch wie das Fenster
 * (Positionskarte), passt beides nicht — dann daneben, auf der Seite mit mehr Platz.
 */
function cardPlace(spot: Box, width: number, height: number): CardPlace {
  const clampX = (x: number): number =>
    Math.min(Math.max(EDGE, x), Math.max(EDGE, width - CARD_WIDTH - EDGE));
  const centered = clampX(spot.left + spot.width / 2 - CARD_WIDTH / 2);
  if (spot.top + spot.height + CARD_SPACE < height) {
    return { left: centered, top: spot.top + spot.height + EDGE };
  }
  if (spot.top > CARD_SPACE) return { left: centered, bottom: height - spot.top + EDGE };
  const roomLeft = spot.left;
  const roomRight = width - spot.left - spot.width;
  const left =
    roomLeft >= roomRight ? spot.left - CARD_WIDTH - EDGE : spot.left + spot.width + EDGE;
  const top = Math.min(
    Math.max(EDGE, spot.top + spot.height / 2 - CARD_SPACE / 2),
    height - CARD_SPACE,
  );
  return { left: clampX(left), top };
}

function runPrepare(prepare: TourPrepare, dispatch: ReturnType<typeof useViewerDispatch>): void {
  switch (prepare) {
    case 'closeSide':
      dispatch({ type: 'sidePanel', panel: null });
      return;
    case 'openFilter':
      dispatch({ type: 'sidePanel', panel: 'filter' });
      return;
    case 'closeSelection':
      dispatch({ type: 'closeSelection' });
      return;
    case 'ensureSelection': {
      // Wer den Punkt-Schritt übersprungen hat, bekommt trotzdem eine Karte:
      // der Klick läuft über denselben Weg wie ein echter Klick im Graphen.
      if (document.querySelector(CARD_TARGET) !== null) return;
      findVisible(POINT_TARGET)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }
  }
}

export function Tour() {
  const state = useViewer();
  const dispatch = useViewerDispatch();
  const { lv } = state;
  const { step: index, seen } = state.view.tour;
  const step = index === null ? undefined : TOUR_STEPS[index];

  const [box, setBox] = useState<Box | null>(null);
  /** Richtung der letzten Bewegung — ein fehlendes Ziel wird in dieselbe Richtung übersprungen. */
  const direction = useRef<1 | -1>(1);

  const go = useCallback(
    (next: number | null): void => {
      if (next !== null && index !== null) direction.current = next < index ? -1 : 1;
      const valid = next !== null && next >= 0 && next < TOUR_STEPS.length;
      dispatch({ type: 'tour', step: valid ? next : null });
    },
    [dispatch, index],
  );

  // Beim Betreten eines Schritts den Bildschirm vorbereiten.
  useEffect(() => {
    if (index === null) return;
    for (const prepare of TOUR_STEPS[index]?.prepare ?? []) runPrepare(prepare, dispatch);
  }, [index, dispatch]);

  // Ziel verfolgen: Fenster, Zoom und Seitenfenster verschieben es laufend.
  // Ein Frame-Takt ist billig (eine Abfrage) und braucht keine Beobachter je Ziel.
  useEffect(() => {
    if (index === null) return;
    const selector = TOUR_STEPS[index]?.target;
    if (selector === undefined) return;
    let frame = 0;
    let missingSince: number | null = null;
    let last: Box | null = null;
    // Gefundenes Ziel merken: je Frame dann nur ein `getBoundingClientRect`,
    // neu gesucht wird erst, wenn es weg oder aus dem Bild ist.
    let element: Element | null = null;
    let searchedAt = -Infinity;
    const tick = (): void => {
      const now = Date.now();
      let rect = element?.isConnected === true ? element.getBoundingClientRect() : null;
      if (rect !== null && !isVisible(rect)) rect = null;
      if (rect === null && now - searchedAt >= SEARCH_MS) {
        searchedAt = now;
        element = findVisible(selector);
        rect = element?.getBoundingClientRect() ?? null;
      }
      if (rect === null) {
        missingSince ??= now;
        if (now - missingSince > MISSING_MS) {
          go(index + direction.current);
          return;
        }
      } else {
        missingSince = null;
        const next = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
        if (!sameBox(last, next)) {
          last = next;
          setBox(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setBox(null);
    };
  }, [index, go]);

  // Wartende Schritte gehen weiter, sobald man das Verlangte getan hat. Erst
  // „scharf", wenn die Bedingung im Schritt einmal nicht erfüllt war — sonst
  // spränge der Punkt-Schritt bei einer noch offenen Karte sofort weiter.
  const fulfilled = step?.done?.(state) ?? false;
  const armed = useRef<number | null>(null);
  useEffect(() => {
    if (index === null) return;
    if (!fulfilled) armed.current = index;
    else if (armed.current === index) go(index + 1);
  }, [fulfilled, index, go]);

  // Escape beendet die Tour — in der Capture-Phase, damit es nicht zusätzlich
  // die Auswahl zurücknimmt (ViewerPage).
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      go(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, go]);

  if (lv === null) return null;

  if (index === null) {
    if (seen) return null;
    return (
      <div
        // Kein `dialog`: das Angebot blockiert nichts, und Escape soll weiter
        // die Positionskarte schließen (useDismiss, `yieldToDialogs`).
        role="group"
        aria-label="Tour anbieten"
        className="ov-glass absolute bottom-[112px] left-[16px] z-[12] flex items-center gap-[10px] py-[8px] pl-[14px] pr-[8px] lg:bottom-[68px]"
      >
        <span className="font-sans text-[13px] text-ink">Neu hier?</span>
        <button
          type="button"
          onClick={() => go(0)}
          className={`${BUTTON} border-blue bg-blue text-white hover:bg-blueD`}
        >
          Kurze Tour
        </button>
        <button
          type="button"
          onClick={() => go(null)}
          aria-label="Tour nicht anzeigen"
          className="cursor-pointer border-none bg-transparent px-[6px] font-mono text-[11px] text-mute hover:text-ink"
        >
          ✕
        </button>
      </div>
    );
  }

  if (step === undefined || box === null) return null;

  const spot = spotBox(box, step.round === true);
  const place = cardPlace(spot, window.innerWidth, window.innerHeight);
  const waiting = step.done !== undefined && !fulfilled;
  const last = index === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Abdunkeln über einen riesigen Schatten: das Loch bleibt klickbar, weil
          die Fläche selbst keine Klicks annimmt. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[50] border-2 border-blue transition-all duration-200"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          borderRadius: step.round === true ? '50%' : 'var(--r-sm)',
          boxShadow: '0 0 0 9999px var(--spot)',
        }}
      />
      <div
        role="dialog"
        aria-label={`Tour: ${step.title}`}
        className="ov-glass fixed z-[51] flex flex-col gap-[8px] p-[14px]"
        style={{
          width: CARD_WIDTH,
          maxWidth: `calc(100vw - ${2 * EDGE}px)`,
          ...place,
        }}
      >
        <div className="flex items-baseline justify-between gap-[8px]">
          <b className="font-sans text-[14px] font-semibold text-ink">{step.title}</b>
          <span className="font-mono text-[10px] text-mute">
            {index + 1} / {TOUR_STEPS.length}
          </span>
        </div>
        <p className="m-0 font-sans text-[12.5px] leading-[1.45] text-dim">{step.text}</p>
        {waiting && step.todo !== undefined && (
          <p className="m-0 font-mono text-[10.5px] text-blueD">→ {step.todo}</p>
        )}
        <div className="mt-[2px] flex items-center gap-[6px]">
          <button
            type="button"
            onClick={() => go(null)}
            className="cursor-pointer border-none bg-transparent p-0 font-mono text-[10.5px] text-mute hover:text-ink"
          >
            Beenden
          </button>
          <span className="flex-1" />
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              className={`${BUTTON} border-line bg-surface text-ink hover:bg-sunken`}
            >
              Zurück
            </button>
          )}
          <button
            type="button"
            onClick={() => go(last ? null : index + 1)}
            className={
              waiting
                ? `${BUTTON} border-line bg-surface text-dim hover:bg-sunken`
                : `${BUTTON} border-blue bg-blue text-white hover:bg-blueD`
            }
          >
            {last ? 'Fertig' : waiting ? 'Überspringen' : 'Weiter'}
          </button>
        </div>
      </div>
    </>
  );
}
