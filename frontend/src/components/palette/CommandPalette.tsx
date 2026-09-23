// Kommandopalette (WP-P, Schritt 1): Strg/Cmd + K öffnet ein Feld, in das man
// tippt, was passieren soll — Ansicht wechseln, Filter setzen, zu einer OZ
// springen.
//
// **Warum überhaupt:** die Kopfleiste trägt sieben Ansichten und dreizehn
// Facetten. Wer weiß, was er sucht, soll nicht erst das richtige Menü finden
// müssen. Die Palette ist eine zweite Tür zum selben Zustand — sie löst
// dieselben Aktionen aus wie die Chips daneben und kennt keine eigene Logik.
//
// **Positionen** kommen über `matchPos` in die Liste (Suchfeld-Logik, eine
// Quelle, .claude/CLAUDE.md), nicht über einen zweiten Suchpfad.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Chip } from '../ui/Chip';
import {
  buildCommands,
  groupOrder,
  positionCommand,
  type Command,
  type CommandGroup,
} from '../../lib/palette/commands';
import { rankCommands } from '../../lib/palette/match';
import { EMPTY_FILTERS, matchFacts, prepareFilters } from '../../lib/matchPos';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/** So viele Zeilen zeigt die Liste — mehr liest niemand, und Enter meint die erste. */
const MAX_ZEILEN = 12;
/** Positionen darunter, damit ein Gewerk mit 4000 Treffern die Liste nicht auffrisst. */
const MAX_POSITIONEN = 6;
/** Ab hier lohnt die Positions-Suche; ein einzelner Buchstabe trifft alles. */
const MIN_ZEICHEN_POSITION = 2;

function istPaletteTaste(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
}

export function CommandPalette() {
  const { lv, index, parents, filter, view } = useViewer();
  const dispatch = useViewerDispatch();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [aktiv, setAktiv] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Jedes Öffnen beginnt leer. Eine Palette, die den letzten Befehl noch
  // anzeigt, führt beim schnellen Tippen zuverlässig den falschen aus.
  const oeffne = useCallback((): void => {
    setQuery('');
    setAktiv(0);
    setOpen(true);
  }, []);

  // Strg/Cmd + K greift überall, auch im Suchfeld: die Tastenkombination ist
  // in Browsern und Editoren dieselbe, und wer sie drückt, will die Palette.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!istPaletteTaste(event)) return;
      event.preventDefault();
      setQuery('');
      setAktiv(0);
      setOpen((offen) => !offen);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Der Fokus gehört beim Öffnen ins Eingabefeld — die Palette ist eine
  // Tastatur-Sache. Als Ref-Rückruf statt Effekt: das Feld entsteht erst mit
  // dem Overlay, und ein Effekt würde einen Renderdurchlauf später greifen.
  const fokussiere = useCallback((element: HTMLInputElement | null): void => {
    inputRef.current = element;
    element?.focus();
  }, []);

  const befehle = useMemo(() => {
    if (lv === null) return [];
    return buildCommands({
      summary: lv.summary,
      filters: filter.filters,
      search: filter.search,
      hideMode: filter.hideMode,
      view: view.mode,
    });
  }, [lv, filter.filters, filter.search, filter.hideMode, view.mode]);

  // Positionen zur Eingabe: der Scan bricht ab, sobald genug beisammen ist —
  // bei 10.000 Positionen kostet die Liste damit auch beim Tippen nichts.
  const positionen = useMemo(() => {
    if (query.trim().length < MIN_ZEICHEN_POSITION) return [];
    const active = prepareFilters(EMPTY_FILTERS, query);
    const treffer: Command[] = [];
    for (let slot = 0; slot < index.size && treffer.length < MAX_POSITIONEN; slot++) {
      if (!matchFacts(index.facts[slot], active)) continue;
      const node = index.nodes[slot];
      treffer.push(positionCommand(node, parents.get(node.id) ?? null, view.mode));
    }
    return treffer;
  }, [query, index, parents, view.mode]);

  const gruppen = useMemo(() => groupOrder(query), [query]);

  // Dieselbe Reihenfolge wie die gezeichnete Liste — sonst liefen die
  // Pfeiltasten über die Rangfolge, während die Liste nach Gruppen sortiert
  // steht, und die Markierung spränge zwischen den Abschnitten hin und her.
  const treffer = useMemo(() => {
    const sonstige = rankCommands(befehle, query, MAX_ZEILEN - positionen.length);
    return [...positionen, ...sonstige].sort(
      (a, b) => gruppen.indexOf(a.group) - gruppen.indexOf(b.group),
    );
  }, [befehle, positionen, query, gruppen]);

  const ausfuehren = useCallback(
    (command: Command): void => {
      for (const action of command.actions) dispatch(action);
      setOpen(false);
    },
    [dispatch],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      // Stoppt hier: sonst räumt der Escape der Ansicht zusätzlich die Auswahl.
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setAktiv((i) => (treffer.length === 0 ? 0 : (i + 1) % treffer.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setAktiv((i) => (treffer.length === 0 ? 0 : (i - 1 + treffer.length) % treffer.length));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const command = treffer[aktiv];
      if (command !== undefined) ausfuehren(command);
    }
  };

  if (lv === null) return null;

  return (
    <>
      <Chip onClick={oeffne} title="Kommandopalette (Strg/Cmd + K)">
        ⌕ Befehle
      </Chip>
      {open &&
        createPortal(
          <div
            className="nur-bildschirm"
            // Die Palette hängt per Portal an <body> — sie liegt über allem,
            // auch über dem Vollbild-Graphen, und darf nicht mit aufs Blatt.
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingTop: '12vh',
              background: 'rgba(26,37,51,0.12)',
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-label="Kommandopalette"
              onKeyDown={onKeyDown}
              style={{
                width: 'min(560px, calc(100vw - 32px))',
                background: 'var(--white)',
                border: '1px solid var(--line2)',
                boxShadow: 'var(--shadow-popover)',
                fontFamily: 'var(--mono)',
                fontSize: 'var(--fs-meta)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span style={{ color: 'var(--mute)' }}>⌕</span>
                <input
                  ref={fokussiere}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setAktiv(0);
                  }}
                  aria-label="Befehl oder OZ"
                  placeholder="Ansicht, Filter oder OZ"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    font: 'inherit',
                    color: 'var(--ink)',
                  }}
                />
                <span style={{ color: 'var(--mute)', fontSize: 'var(--fs-label)' }}>ESC</span>
              </div>

              <div role="listbox" aria-label="Treffer" style={{ maxHeight: 360, overflow: 'auto' }}>
                {treffer.length === 0 && (
                  <div style={{ padding: '12px', color: 'var(--mute)' }}>Kein Befehl</div>
                )}
                {gruppen.map((group) => (
                  <Gruppe
                    key={group}
                    group={group}
                    treffer={treffer}
                    aktiv={aktiv}
                    onHover={setAktiv}
                    onPick={ausfuehren}
                  />
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

interface GruppeProps {
  group: CommandGroup;
  treffer: readonly Command[];
  aktiv: number;
  onHover: (index: number) => void;
  onPick: (command: Command) => void;
}

function Gruppe({ group, treffer, aktiv, onHover, onPick }: GruppeProps) {
  const zeilen = treffer
    .map((command, index) => ({ command, index }))
    .filter((zeile) => zeile.command.group === group);
  if (zeilen.length === 0) return null;
  return (
    <div>
      <div
        style={{
          padding: '8px 12px 4px',
          color: 'var(--mute)',
          fontSize: 'var(--fs-label)',
          letterSpacing: 'var(--ls-caps)',
          textTransform: 'uppercase',
        }}
      >
        {group}
      </div>
      {zeilen.map(({ command, index }) => (
        <button
          key={command.id}
          type="button"
          role="option"
          aria-selected={index === aktiv}
          onMouseEnter={() => onHover(index)}
          onClick={() => onPick(command)}
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            border: 'none',
            borderLeft: `2px solid ${index === aktiv ? 'var(--blue)' : 'transparent'}`,
            textAlign: 'left',
            font: 'inherit',
            cursor: 'pointer',
            background: index === aktiv ? 'var(--blueS)' : 'transparent',
            color: command.on === true || index === aktiv ? 'var(--blueD)' : 'var(--ink)',
          }}
        >
          <span
            style={{
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {command.label}
          </span>
          {command.hint !== undefined && (
            <span
              style={{
                color: 'var(--mute)',
                flexShrink: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {command.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
