// Provider für den Viewer-Session-State. Berechnet die abgeleiteten Sichten
// (Knoten-Index, Elternzuordnung, flacher Positions-Index, Trefferzahlen,
// Farben) an genau einer Stelle — Baum, Graph, Tabelle und Überblick
// bekommen dasselbe Ergebnis (Issue #18, WP-L).

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { annotationAllowList } from '../lib/annotations';
import {
  checkRulesOf,
  EMPTY_HINTS,
  hintsByPosition,
  mergeChecks,
  runChecks,
  type CheckResult,
  type HintIndex,
} from '../lib/check';
import { GRUNDSTOCK, isActive } from '../lib/rules/rules';
import {
  buildPositionIndex,
  EMPTY_POSITION_INDEX,
  filterMask,
  type PositionIndex,
} from '../lib/index/positionIndex';
import { withLearnedMaterials } from '../lib/index/learnedMaterials';
import { materialTermsOf, type LearnedTerm } from '../lib/highlight/terms';
import { EMPTY_SUMMARY, summarize, type LVSummary } from '../lib/index/summary';
import { prepareFilters, type ActiveFilters } from '../lib/matchPos';
import { measure } from '../lib/perf';
import { countEvent, usageEventOf } from '../lib/usage/count';
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
  type ViewerAction,
  type ViewerDerived,
} from './viewer';
import { useAdmin } from './admin';
import { readWorkspace, saveWorkspace } from '../lib/persist/lastLv';
import { toStoredWorkspace } from '../lib/workspace/split';
import { INITIAL_WORKSPACE } from './viewState';
import type { LoadedLV } from '../lib/pipeline/runPipeline';
import type { LVNode } from '../types/lvNode';

const EMPTY_NODES: ReadonlyMap<string, LVNode> = new Map();
const GRUNDSTOCK_IDS: ReadonlySet<string> = new Set(GRUNDSTOCK.map((rule) => rule.id));
/** Pause nach der letzten Regeländerung, bevor neu geprüft wird (Tippen im Editor). */
const RECHECK_DELAY = 250;
const EMPTY_PARENTS: ReadonlyMap<string, LVNode | null> = new Map();
const EMPTY_MATCHES: MatchIndex = { counts: new Map(), filtering: false };

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(viewerReducer, INITIAL_VIEWER_STATE);

  // Zählen beim Auslösen, nicht im Reducer: der bleibt eine reine Funktion
  // (Entscheidung 0056).
  const dispatch = useCallback((action: ViewerAction): void => {
    rawDispatch(action);
    const event = usageEventOf(action);
    if (event !== null) countEvent(event);
  }, []);

  // Letzte Anordnung im Splitscreen (Entscheidung 0073): erst lesen, dann schreiben —
  // sonst würde der Anfangszustand die gemerkte Anordnung überschreiben.
  const [layoutRead, setLayoutRead] = useState(false);
  useEffect(() => {
    let active = true;
    void readWorkspace().then((raw) => {
      if (!active) return;
      const stored = toStoredWorkspace(raw, INITIAL_WORKSPACE.closed);
      if (stored !== null) rawDispatch({ type: 'workspaceRestore', workspace: stored });
      setLayoutRead(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const layoutQueue = useRef<Promise<unknown>>(Promise.resolve());
  const { workspace } = state.view;
  useEffect(() => {
    if (!layoutRead) return;
    layoutQueue.current = layoutQueue.current.then(() => saveWorkspace(workspace));
  }, [workspace, layoutRead]);

  const tree = state.lv?.tree ?? null;
  const { search, filters } = state.filter;

  const structure = useMemo(() => {
    if (tree === null) return { nodes: EMPTY_NODES, parents: EMPTY_PARENTS };
    return { nodes: indexNodes(tree), parents: indexParents(tree) };
  }, [tree]);

  // Der flache Positions-Index entsteht einmal je geladenem LV. Er muss hier
  // gebaut werden und nicht im Worker: er verweist auf die Baumknoten, und
  // Objektidentität überlebt den structuredClone der Worker-Grenze nicht.
  const baseIndex = useMemo<PositionIndex>(() => {
    if (tree === null) return EMPTY_POSITION_INDEX;
    return measure('Positions-Index', () => buildPositionIndex(tree));
  }, [tree]);

  // Als Material gelernte Begriffe zählen in der Facette „Material" mit (Entscheidung
  // 0066). Nur bei neuem LV oder geänderten Begriffen; ohne Begriffe derselbe Index
  // und die Zählung aus dem Laden.
  const { rules, grundstockOff } = useAdmin();
  // Als Text verglichen: `rules` ist nach jeder Änderung an eigenen Regeln neu.
  const materialKey = JSON.stringify(materialTermsOf(rules));
  const learnedMaterials = useMemo(
    () => JSON.parse(materialKey) as readonly LearnedTerm[],
    [materialKey],
  );
  const index = useMemo<PositionIndex>(
    () => measure('Gelernte Materialien', () => withLearnedMaterials(baseIndex, learnedMaterials)),
    [baseIndex, learnedMaterials],
  );
  const loadedSummary = state.lv?.summary ?? EMPTY_SUMMARY;
  const summary = useMemo<LVSummary>(
    () => (index === baseIndex ? loadedSummary : summarize(index)),
    [index, baseIndex, loadedSummary],
  );

  // Eine Aufbereitung je Filterwechsel — Trefferzahlen, Tabelle und Überblick
  // rechnen gegen dieselbe.
  // Die Zulassungsliste aus Markierungen/Kommentaren ändert sich nur, solange
  // ihr Filter an ist — sonst bleibt sie `null` und kein Tastendruck im
  // Kommentarfeld löst einen Filterlauf aus.
  const allow = useMemo(
    () =>
      annotationAllowList(
        state.annotations,
        state.filter.notes,
        // Alle IDs braucht nur „Offen" — sonst kein Durchlauf über 10k Positionen.
        state.filter.notes.progress === 'offen' ? index.nodes.map((node) => node.id) : [],
      ),
    [state.annotations, state.filter.notes, index],
  );
  const active = useMemo<ActiveFilters>(
    () => prepareFilters(filters, search, allow),
    [filters, search, allow],
  );

  const matches = useMemo<MatchIndex>(() => {
    if (tree === null) return EMPTY_MATCHES;
    return measure('Filter', () => computeMatchCounts(tree, index, active));
  }, [tree, index, active]);

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

  // Prüfung mit den Regeln dieser Firma (Entscheidung 0089): Der Worker prüft beim Laden mit
  // dem Grundstock. Abgeschaltete Grundstock-Regeln fallen hier nur weg; eigene Prüfregeln
  // laufen dazu — im Effekt und kurz verzögert, nie im Render und nicht je Taste.
  const offKey = JSON.stringify([...grundstockOff].sort());
  const ownCheckKey = JSON.stringify(
    checkRulesOf(rules).filter((rule) => !GRUNDSTOCK_IDS.has(rule.id) && isActive(rule)),
  );
  const [ownCheck, setOwnCheck] = useState<{
    lv: LoadedLV;
    check: CheckResult;
  } | null>(null);
  useEffect(() => {
    const lv = state.lv;
    if (lv === null || ownCheckKey === '[]') return;
    const timer = setTimeout(() => {
      const ownRules = JSON.parse(ownCheckKey) as ReturnType<typeof checkRulesOf>;
      const check = measure('Eigene Prüfregeln', () =>
        runChecks(baseIndex, lv.summary, ownRules, structure.parents),
      );
      setOwnCheck({ lv, check });
    }, RECHECK_DELAY);
    return () => clearTimeout(timer);
  }, [state.lv, ownCheckKey, baseIndex, structure.parents]);
  // Bis die neue Rechnung fertig ist, gelten die letzten Funde eigener Regeln für dieses LV.
  const own = ownCheckKey !== '[]' && ownCheck?.lv === state.lv ? ownCheck.check : null;
  const loadedCheck = state.lv?.check ?? null;
  const check = useMemo(
    () =>
      loadedCheck === null
        ? null
        : mergeChecks(loadedCheck, new Set(JSON.parse(offKey) as string[]), own),
    [loadedCheck, offKey, own],
  );
  const lv = useMemo(
    // Ohne Änderung dasselbe Objekt wie geladen — manche Stellen vergleichen `lv`.
    () =>
      state.lv === null || check === null || check === state.lv.check
        ? state.lv
        : { ...state.lv, check },
    [state.lv, check],
  );

  // Hinweise je Position (WP-R, R1). Hängt am Import und am Regel-Schalter,
  // nicht am Filter: was hier steht, gilt für das ganze LV — der Ring an der
  // Bubble verschwindet ohnehin mit der Bubble, sobald der Filter sie ausblendet.
  const hints = useMemo<HintIndex>(() => {
    if (check === null) return EMPTY_HINTS;
    return hintsByPosition(check, state.filter.mutedRules);
  }, [check, state.filter.mutedRules]);

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
      summary,
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
      sectionColors,
      hints,
    }),
    [
      tree,
      structure,
      index,
      summary,
      active,
      state.selection.nodeId,
      state.selection.positionId,
      comparePositions,
      matches,
      mask,
      sectionColors,
      hints,
    ],
  );

  const value = useMemo(() => ({ ...state, ...derived, lv }), [state, derived, lv]);

  return (
    <ViewerStateContext.Provider value={value}>
      <ViewerDispatchContext.Provider value={dispatch}>{children}</ViewerDispatchContext.Provider>
    </ViewerStateContext.Provider>
  );
}
