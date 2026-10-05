// Ansicht, Filter und Auswahl im URL-Fragment (WP-P, Schritt 2).
//
// **Warum das Fragment und nicht die Query:** alles hinter `#` sendet ein
// Browser **nie** an einen Server — weder beim Aufruf noch im Referrer. Die
// Zusage „Fachdaten verlassen den Browser nicht" (.claude/CLAUDE.md) bleibt
// damit gewahrt, auch wenn jemand einen Link weitergibt. Begründung und
// verworfene Wege: docs/decisions/0023-zustand-im-url-fragment.md.
//
// **Was im Link steht:** die Ansicht, die Filter (Facetten, Suche,
// Mengenbereich, Umgang mit Nicht-Treffern) und die OZ der gewählten Position.
//
// Ein Teil davon stammt aus der Datei, und zwar mehr als nur die OZ: die
// Facetten `normen` und `beton` tragen die Bezeichnung, die im Langtext steht
// („DIN EN 1992-1-1", „C30/37"), und in der Suche steht, was jemand getippt
// hat — oft ein Wort aus dem Kurztext. Das ist gewollt, denn genau dafür teilt
// man einen Link („schau dir die C30/37-Positionen an"), und es sind
// Normbezeichnungen, keine Projektdaten. Wer einen Link weitergibt, gibt seinen
// Blick auf das LV weiter — das ist der Zweck.
//
// **Was nicht drin steht:** Dateiname, Projektname, Kurz- und Langtexte,
// Mengen, Preise, Prüf-Hinweise. Ein Link ohne dieselbe Datei ist nutzlos —
// und genau so ist es gewollt.

import { FACETS_BY_ID } from '../facets';
import type { Range } from '../matchPos';

/** Die Ansichten, die ein Link benennen darf (Werte von `ViewMode`). */
const VIEWS = ['overview', 'graph', 'table', 'matrix', 'check', 'similar', 'compare'] as const;
const HIDE_MODES = ['dim', 'hide'] as const;

export interface SharedState {
  view: (typeof VIEWS)[number];
  search: string;
  /** Facetten-ID → gewählte Werte. Leere Mengen stehen nicht im Link. */
  facets: Record<string, string[]>;
  menge: Range | null;
  hideMode: (typeof HIDE_MODES)[number];
  /** OZ der gewählten Position; `null`, wenn keine gewählt ist. */
  oz: string | null;
}

// Der Graph ist der Hauptscreen (docs/decisions/0032-graph-als-hauptscreen.md) —
// ein Link ohne Ansicht öffnet ihn. Alte Links mit `overview`, `table`, `check`
// oder `compare` lesen sich weiter; der Reducer öffnet dann das passende Fenster.
export const EMPTY_SHARED: SharedState = {
  view: 'graph',
  search: '',
  facets: {},
  menge: null,
  hideMode: 'dim',
  oz: null,
};

/** Trennzeichen im Fragment — kurz und in URLs unauffällig. */
const TEIL = '~';
const WERT = ',';

/**
 * Wert für das Fragment. `encodeURIComponent` lässt `~` stehen (es gilt als
 * unreserviert) — genau unser Trennzeichen. Ein Kurztext oder eine OZ mit `~`
 * würde die Teile sonst auseinanderreißen, deshalb die Nachbehandlung.
 */
function enc(value: string): string {
  return encodeURIComponent(value).replace(/~/g, '%7E');
}

/**
 * Zustand → Fragment. Nur was vom Standard abweicht, landet im Link: ein
 * unveränderter Zustand ergibt ein leeres Fragment, und die Adresszeile bleibt
 * sauber, solange niemand etwas eingestellt hat.
 */
export function encodeShared(state: SharedState): string {
  const teile: string[] = [];
  if (state.view !== EMPTY_SHARED.view) teile.push(`v=${state.view}`);
  if (state.search !== '') teile.push(`q=${enc(state.search)}`);
  if (state.menge !== null) teile.push(`m=${state.menge[0]}${WERT}${state.menge[1]}`);
  if (state.hideMode !== EMPTY_SHARED.hideMode) teile.push(`h=${state.hideMode}`);
  if (state.oz !== null) teile.push(`p=${enc(state.oz)}`);
  for (const [facetId, values] of Object.entries(state.facets)) {
    if (values.length === 0) continue;
    const liste = values.map(enc).join(WERT);
    teile.push(`f.${facetId}=${liste}`);
  }
  return teile.join(TEIL);
}

/**
 * Wert aus dem Fragment; `null`, wenn die Prozent-Kodierung defekt ist.
 * `decodeURIComponent('%')` **wirft** — und ein Link, der beim Kopieren in
 * einen Chat abgeschnitten wurde, dürfte sonst die ganze App mitreißen.
 */
function dec(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** Zahl aus dem Fragment; `null`, sobald sie keine ist. */
function zahl(text: string): number | null {
  if (text === '') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function bereich(text: string): Range | null {
  const [von, bis] = text.split(WERT);
  const a = zahl(von ?? '');
  const b = zahl(bis ?? '');
  if (a === null || b === null || a > b) return null;
  return [a, b];
}

/** Ergebnis von `decodeSharedChecked`: der Zustand und was am Link nicht passte. */
export interface CheckedShared {
  state: SharedState;
  /** Deutsche Namen der verworfenen Teile, in der Reihenfolge des Links. */
  verworfen: string[];
}

/**
 * Fragment → Zustand. **Alles wird geprüft**: ein Link kann von irgendwoher
 * kommen, und ein unbekannter Ansichtsname oder eine erfundene Facette darf
 * die App nicht in einen Zustand bringen, den ihre Oberfläche nicht kennt.
 * Was nicht passt, fällt weg; der Rest des Links gilt trotzdem — und
 * `verworfen` nennt, was wegfiel, damit die Oberfläche es sagen kann (Issue #95).
 *
 * Teile ohne `=` zählen nicht als verworfen: ein fremder Anker wie `#abschnitt`
 * ist kein Teilen-Link, und die App hat nichts zu melden.
 */
export function decodeSharedChecked(fragment: string): CheckedShared {
  const roh = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (roh === '') return { state: EMPTY_SHARED, verworfen: [] };

  const state: SharedState = { ...EMPTY_SHARED, facets: {} };
  const verworfen: string[] = [];
  for (const teil of roh.split(TEIL)) {
    const trenner = teil.indexOf('=');
    if (trenner < 0) continue;
    const schluessel = teil.slice(0, trenner);
    const wert = teil.slice(trenner + 1);

    if (schluessel === 'v') {
      const view = VIEWS.find((kandidat) => kandidat === wert);
      if (view === undefined) verworfen.push('Ansicht');
      else state.view = view;
      continue;
    }
    if (schluessel === 'q') {
      const suche = dec(wert);
      if (suche === null) verworfen.push('Suche');
      state.search = suche ?? '';
      continue;
    }
    if (schluessel === 'm') {
      state.menge = bereich(wert);
      if (state.menge === null) verworfen.push('Mengenbereich');
      continue;
    }
    if (schluessel === 'h') {
      const mode = HIDE_MODES.find((kandidat) => kandidat === wert);
      if (mode === undefined) verworfen.push('Umgang mit Nicht-Treffern');
      else state.hideMode = mode;
      continue;
    }
    if (schluessel === 'p') {
      const oz = dec(wert);
      if (oz === null) verworfen.push('Auswahl');
      state.oz = oz === null || oz === '' ? null : oz;
      continue;
    }
    if (schluessel.startsWith('f.')) {
      const facetId = schluessel.slice(2);
      // Eine Facette, die es nicht gibt, ist kein Filter, sondern ein Tippfehler
      // oder ein Link aus einer anderen Fassung — sie fällt weg.
      if (!FACETS_BY_ID.has(facetId)) {
        verworfen.push(`Filter „${facetId}"`);
        continue;
      }
      const teile = wert.split(WERT).map(dec);
      const values = teile.filter((value): value is string => value !== null && value !== '');
      // Ein Wert mit defekter Kodierung ist ein beschädigter Link; ein leerer
      // (`f.x=`) ist dagegen nur ein leerer Filter und nichts zu melden.
      if (teile.includes(null)) verworfen.push(`Filter „${facetId}"`);
      if (values.length > 0) state.facets[facetId] = values;
    }
  }
  return { state, verworfen };
}

/** Wie `decodeSharedChecked`, nur der Zustand — für alle, die nichts melden. */
export function decodeShared(fragment: string): SharedState {
  return decodeSharedChecked(fragment).state;
}

/**
 * Fragment für die Adresszeile, inklusive `#`. Leer, wenn nichts eingestellt
 * ist — dann soll auch kein einsames `#` stehen bleiben.
 */
export function sharedHash(state: SharedState): string {
  const fragment = encodeShared(state);
  return fragment === '' ? '' : `#${fragment}`;
}
