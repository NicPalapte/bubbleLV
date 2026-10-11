// Provider für den Viewer-Session-State. Berechnet die abgeleiteten Sichten
// (Knoten-Index, Elternzuordnung, flacher Positions-Index, Trefferzahlen,
// Farben) an genau einer Stelle — Baum, Graph, Tabelle und Überblick
// bekommen dasselbe Ergebnis (Issue #18, WP-L).

import { useMemo, useReducer, type ReactNode } from 'react';
import { EMPTY_HINTS, hintsByPosition, type HintIndex } from '../lib/check';
import { buildColorScale, EMPTY_COLOR_SCALE, type ColorScale } from '../lib/colors';
import { NO_GEWERK } from '../lib/facets';
import {
  buildPositionIndex,
  EMPTY_POSITION_INDEX,
  filterMask,
  type PositionIndex,
} from '../lib/index/positionIndex';
import { prepareFilters, type ActiveFilters } from '../lib/matchPos';
import { measure } from '../lib/perf';
import { indexNodes, indexParents } from '../lib/tree/buildTree';
import {
  buildSectionColors,
  EMPTY_SECTION_COLORS,
  type SectionColors,
} from '../lib/tree/mainSection';
import { computeMatchCounts, type MatchIndex } from '../lib/tree/matchCounts';
import {
  INITIAL_VIEWER_STATE,
  ViewerDispatchContext,
  ViewerStateContext,
  viewerReducer,
  type ViewerDerived,
} from './viewer';
import type { LVNode } from '../types/lvNode';

const EMPTY_NODES: ReadonlyMap<string, LVNode> = new Map();
const EMPTY_PARENTS: ReadonlyMap<string, LVNode | null> = new Map();
const EMPTY_MATCHES: MatchIndex = { counts: new Map(), filtering: false };

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(viewerReducer, INITIAL_VIEWER_STATE);

  const tree = state.lv?.tree ?? null;
  const { search, filters } = state.filter;

  const structure = useMemo(() => {
    if (tree === null) return { nodes: EMPTY_NODES, parents: EMPTY_PARENTS };
    return { nodes: indexNodes(tree), parents: indexParents(tree) };
  }, [tree]);

  // Der flache Positions-Index entsteht einmal je geladenem LV. Er muss hier
  // gebaut werden und nicht im Worker: er verweist auf die Baumknoten, und
  // Objektidentität überlebt den structuredClone der Worker-Grenze nicht.
  const index = useMemo<PositionIndex>(() => {
    if (tree === null) return EMPTY_POSITION_INDEX;
    return measure('Positions-Index', () => buildPositionIndex(tree));
  }, [tree]);

  // Eine Aufbereitung je Filterwechsel — Trefferzahlen, Tabelle und Überblick
  // rechnen gegen dieselbe.
  const active = useMemo<ActiveFilters>(() => prepareFilters(filters, search), [filters, search]);

  const matches = useMemo<MatchIndex>(() => {
    if (tree === null) return EMPTY_MATCHES;
    return measure('Filter', () => computeMatchCounts(tree, index, active));
  }, [tree, index, active]);

  // Eine Farbskala je geladenem LV, gültig für alle Ansichten (WP-L). Die
  // Gewerk-Namen stehen in den vorberechneten Facetten-Zählern bereits sortiert
  // — damit bekommt dasselbe LV immer dieselben Farben.
  const gewerkColors = useMemo<ColorScale>(() => {
    const values = state.lv?.summary.facets.get('gewerk');
    if (values === undefined) return EMPTY_COLOR_SCALE;
    // „Ohne Gewerk" bleibt farblos — es soll kein Gewerk vortäuschen.
    return buildColorScale([...values.keys()].filter((key) => key !== NO_GEWERK));
  }, [state.lv]);

  // Punktfarbe nach Hauptabschnitt — einmal je LV, über die ganze Datei, damit
  // ein Filter keine Farbe verschiebt (Entscheidung 0043).
  const sectionColors = useMemo<SectionColors>(() => {
    if (tree === null) return EMPTY_SECTION_COLORS;
    return buildSectionColors(index, structure.parents);
  }, [tree, index, structure.parents]);

  // Trefferbitmaske für den Graphen — `null`, solange nicht gefiltert wird.
  const mask = useMemo<Uint8Array | null>(
    () => (tree === null || !active.filtering ? null : filterMask(index, active)),
    [tree, index, active],
  );

  // Hinweise je Position (WP-R, R1). Hängt am Import und am Regel-Schalter,
  // nicht am Filter: was hier steht, gilt für das ganze LV — der Ring an der
  // Bubble verschwindet ohnehin mit der Bubble, sobald der Filter sie ausblendet.
  const hints = useMemo<HintIndex>(() => {
    const check = state.lv?.check ?? null;
    if (check === null) return EMPTY_HINTS;
    return hintsByPosition(check, state.filter.mutedRules);
  }, [state.lv, state.filter.mutedRules]);

  const comparePositions = useMemo<readonly LVNode[]>(
    () =>
      state.selection.compare.flatMap((id) => {
        const node = structure.nodes.get(id);
        return node === undefined ? [] : [node];
      }),
    [state.selection.compare, structure.nodes],
  );

  const derived = useMemo<ViewerDerived>(
    () => ({
      tree,
      nodes: structure.nodes,
      parents: structure.parents,
      index,
      active,
      selectedNode:
        state.selection.nodeId === null
          ? null
          : (structure.nodes.get(state.selection.nodeId) ?? null),
      selectedPosition:
        state.selection.positionId === null
          ? null
          : (structure.nodes.get(state.selection.positionId) ?? null),
      comparePositions,
      matches,
      mask,
      gewerkColors,
      sectionColors,
      hints,
    }),
    [
      tree,
      structure,
      index,
      active,
      state.selection.nodeId,
      state.selection.positionId,
      comparePositions,
      matches,
      mask,
      gewerkColors,
      sectionColors,
      hints,
    ],
  );

  const value = useMemo(() => ({ ...state, ...derived }), [state, derived]);

  return (
    <ViewerStateContext.Provider value={value}>
      <ViewerDispatchContext.Provider value={dispatch}>{children}</ViewerDispatchContext.Provider>
    </ViewerStateContext.Provider>
  );
}
