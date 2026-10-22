// Rechtsklick-Menü auf eine Position (Issue #155): auf einem Punkt im Graphen, einer
// Zeile der Tabelle und einer Karte im Vergleich. Die Einträge wirken wie die Knöpfe
// der Positionskarte. Ein Abschnitt bekommt nur die Sprünge: aus dem Graphen in die
// Tabelle, aus Tabelle und Vergleich in den Graphen (und in die Tabelle).
//
// Der Rechtsklick selbst ändert weder Filter noch Auswahl (ein Filterzustand,
// .claude/CLAUDE.md); erst ein Eintrag wie „In der Tabelle zeigen" wählt aus.
//
// Ein Menü für die ganze Seite: der Provider hält Ziel und Ort, `usePositionMenu`
// öffnet es. Das Menü hängt am Dokument des Klicks — die abgekoppelte Tabelle
// (Entscheidung 0039) bekommt es in ihrem eigenen Fenster.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { PROGRESS_CHOICES, setImportantNow, setProgressNow } from './markers';
import { MenuContext, type MenuSource, type OpenMenu } from './positionMenuContext';
import { useJumpToPosition } from './useJumpToPosition';
import { IMPORTANT_INFO } from '../../lib/annotations';
import { EMPTY_SHARED, sharedHash } from '../../lib/share/urlState';
import { MAX_COMPARE, useViewer, useViewerDispatch } from '../../state/viewer';

interface MenuTarget {
  id: string;
  /** Ort im Fenster (clientX/Y des Klicks). */
  x: number;
  y: number;
  from: MenuSource;
  doc: Document;
}

const MENU_WIDTH = 240;
/** Abstand zum Fensterrand, den das Menü einhält. */
const EDGE = 8;

const ITEM =
  'flex h-[30px] w-full shrink-0 cursor-pointer items-center gap-[8px] rounded-[var(--r-sm)] border-none bg-transparent px-[8px] text-left font-mono text-[12px] text-ink hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none';

function Mark({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className="ml-auto w-[10px] text-center text-blue">
      {on ? '●' : ''}
    </span>
  );
}

/** Link auf die Position, wie ihn die Adresszeile führt (useShareLink). */
function positionLink(doc: Document, hash: string, fileId: string | null): string {
  const { origin, pathname, search } = doc.location;
  return `${origin}${pathname}${search}${sharedHash({ ...EMPTY_SHARED, pos: hash, lv: fileId })}`;
}

function Menu({ target, onClose }: { target: MenuTarget; onClose: () => void }) {
  const {
    nodes,
    lv,
    annotations,
    selection: { compare },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpToPosition = useJumpToPosition();
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ left: target.x, top: target.y });
  const node = nodes.get(target.id);

  // Nach dem Zeichnen messen und vom Rand weg schieben (nach links bzw. oben).
  useLayoutEffect(() => {
    const element = ref.current;
    const view = target.doc.defaultView;
    if (element === null || view === null) return;
    const { width, height } = element.getBoundingClientRect();
    const left = target.x + width + EDGE > view.innerWidth ? target.x - width : target.x;
    const top = Math.min(target.y, view.innerHeight - height - EDGE);
    setPlace({ left: Math.max(EDGE, left), top: Math.max(EDGE, top) });
    element.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
  }, [target]);

  useEffect(() => {
    const view = target.doc.defaultView;
    if (view === null) return;
    const onDown = (event: MouseEvent): void => {
      if (!(ref.current?.contains(event.target as Node) ?? false)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // Escape schließt nur das Menü, nicht zusätzlich die Karte dahinter.
      event.stopImmediatePropagation();
      onClose();
    };
    view.addEventListener('mousedown', onDown, true);
    view.addEventListener('keydown', onKey, true);
    view.addEventListener('blur', onClose);
    view.addEventListener('resize', onClose);
    return () => {
      view.removeEventListener('mousedown', onDown, true);
      view.removeEventListener('keydown', onKey, true);
      view.removeEventListener('blur', onClose);
      view.removeEventListener('resize', onClose);
    };
  }, [target, onClose]);

  if (node === undefined) return null;
  const position = node.position;
  const id = node.id;
  const run = (action: () => void) => (): void => {
    action();
    onClose();
  };

  const moveFocus = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const items = [
      ...(ref.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? []),
    ];
    const at = items.indexOf(target.doc.activeElement as HTMLElement);
    items[(at + step + items.length) % items.length]?.focus();
  };

  const current = annotations.progress.get(id) ?? null;
  const important = annotations.important.has(id);
  const inCompare = compare.includes(id);
  const compareFull = compare.length >= MAX_COMPARE && !inCompare;
  const title =
    position !== null
      ? `${position.oz} · ${position.shortText}`
      : `${node.code} ${node.label ?? ''}`;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={position !== null ? `Position ${position.oz}` : 'Abschnitt'}
      onKeyDown={moveFocus}
      onContextMenu={(event) => event.preventDefault()}
      data-graph-overlay=""
      data-keeps-popover=""
      className="ov-window fixed z-[70] flex flex-col gap-[1px] p-[5px]"
      style={{ left: place.left, top: place.top, width: MENU_WIDTH }}
    >
      <div className="truncate px-[8px] pb-[5px] pt-[3px] font-mono text-[11px] text-mute">
        {title.trim()}
      </div>
      {position !== null && (
        <>
          {PROGRESS_CHOICES.map(({ value, label }) => (
            <button
              key={label}
              type="button"
              role="menuitemradio"
              aria-checked={value === current}
              onClick={run(() => {
                if (value !== current) setProgressNow(dispatch, id, value);
              })}
              className={ITEM}
            >
              {label}
              <Mark on={value === current} />
            </button>
          ))}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={important}
            onClick={run(() => setImportantNow(dispatch, id, !important))}
            className={ITEM}
          >
            <span aria-hidden="true" className="font-display font-bold text-red">
              {IMPORTANT_INFO.glyph}
            </span>
            {IMPORTANT_INFO.label}
            <Mark on={important} />
          </button>
          <span aria-hidden="true" className="mx-[4px] my-[3px] h-px shrink-0 bg-line" />
          <button
            type="button"
            role="menuitem"
            disabled={compareFull}
            title={compareFull ? `Höchstens ${MAX_COMPARE} Positionen im Vergleich` : undefined}
            onClick={run(() => dispatch({ type: 'toggleCompare', positionId: id }))}
            className={`${ITEM} disabled:cursor-default disabled:opacity-50`}
          >
            {inCompare ? 'Aus dem Vergleich nehmen' : 'Zum Vergleich hinzufügen'}
          </button>
        </>
      )}
      {target.from !== 'graph' && (
        <button
          type="button"
          role="menuitem"
          onClick={run(() => {
            if (position !== null) jumpToPosition(id, { stayInView: true });
            else dispatch({ type: 'selectNode', id });
            dispatch({ type: 'graphFocus' });
          })}
          className={ITEM}
        >
          Im Graph zeigen
        </button>
      )}
      {target.from !== 'table' && (
        <button
          type="button"
          role="menuitem"
          onClick={run(() => {
            if (position !== null) jumpToPosition(id);
            else dispatch({ type: 'openInTable', id });
          })}
          className={ITEM}
        >
          In der Tabelle zeigen
        </button>
      )}
      {position !== null && (
        <button
          type="button"
          role="menuitem"
          onClick={run(() => {
            const link = positionLink(target.doc, position.hashes.id, lv?.fileId ?? null);
            const failed = (): void =>
              dispatch({ type: 'notice', message: 'Link konnte nicht kopiert werden.' });
            // Ohne sicheren Kontext fehlt die Zwischenablage; writeText kann auch sofort werfen.
            const clipboard = target.doc.defaultView?.navigator.clipboard;
            if (clipboard === undefined) return failed();
            Promise.resolve()
              .then(() => clipboard.writeText(link))
              .then(
                () => dispatch({ type: 'notice', message: 'Link zur Position kopiert.' }),
                failed,
              );
          })}
          className={ITEM}
        >
          Link zur Position kopieren
        </button>
      )}
    </div>,
    target.doc.body,
  );
}

export function PositionMenuProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<MenuTarget | null>(null);
  const open = useCallback<OpenMenu>(
    (id, x, y, from, doc = document) => setTarget({ id, x, y, from, doc }),
    [],
  );
  const close = useCallback(() => setTarget(null), []);
  return (
    <MenuContext.Provider value={open}>
      {children}
      {target !== null && (
        <Menu key={`${target.id}-${target.x}-${target.y}`} target={target} onClose={close} />
      )}
    </MenuContext.Provider>
  );
}
