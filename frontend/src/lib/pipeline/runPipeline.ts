// Datei → Parser → Klassifizierung → Baum (docs/architecture/pipeline.md#ablauf).
//
// Die Pipeline ist absichtlich zweigeteilt: `parseToDraft` braucht `DOMParser`,
// der laut HTML-Spezifikation nur im Window-Scope existiert und in keinem
// Browser im Worker-Scope verfügbar ist. Der Schritt läuft deshalb im
// Haupt-Thread (nativer XML-Parser, entsprechend schnell), während
// `classifyAndBuild` — der rechenintensive Teil mit einer Regelauswertung je
// Position — in den Worker ausgelagert wird (siehe pipeline.worker.ts).

import { runChecks, type CheckResult } from '../check';
import { classifyDraft, getClassifier } from '../classify';
import { getGaebParser, mapToLvDraft } from '../gaeb';
import { buildPositionIndex } from '../index/positionIndex';
import { summarize, type LVSummary } from '../index/summary';
import { measure } from '../perf';
import { buildRelations, type RelationResult } from '../relate';
import { buildTree } from '../tree/buildTree';
import type { LVDraft } from '../../types/lvDraft';
import type { LVNode } from '../../types/lvNode';

export interface LoadedLV {
  tree: LVNode;
  projectName: string | null;
  client: string | null;
  fileName: string;
  /** Facetten-Zähler und Wertebereiche, fertig berechnet (WP-I, Schritt 2). */
  summary: LVSummary;
  /** Hinweise der Prüfregeln, fertig berechnet (WP-K). */
  check: CheckResult;
  /**
   * Ähnlichkeits-Cluster, Unterschiede und Ausreißer (WP-M). Entstehen hier —
   * also im Worker, sobald dessen Schwelle greift — und nie im Render
   * (.claude/CLAUDE.md#kritische-constraints).
   */
  relations: RelationResult;
}

/**
 * Bytes statt Text: der Parser liest das Encoding aus der XML-Deklaration
 * (GAEB-Exporte sind oft ISO-8859-1). Vorab als UTF-8 dekodierter Text würde
 * Umlaute in Positionstexten zerstören.
 *
 * @throws {GAEBParseError | GAEBValidationError | GAEBVersionError}
 */
export function parseToDraft(bytes: ArrayBuffer, fileName: string): LVDraft {
  return mapToLvDraft(getGaebParser().parse(bytes, fileName));
}

export function classifyAndBuild(draft: LVDraft, fileName: string): LoadedLV {
  const classified = classifyDraft(draft, getClassifier());
  const tree = buildTree(classified);
  // Der Index dient hier nur als Rechenbasis der Aggregate und wird danach
  // verworfen: er verweist auf die Baumknoten, und diese Verweise überleben den
  // structuredClone aus dem Worker nicht. Die Ansichten bauen ihn auf dem
  // Haupt-Thread über dem empfangenen Baum neu auf (state/ViewerProvider.tsx).
  const index = buildPositionIndex(tree);
  const summary = summarize(index);
  // Beziehungen vor den Prüfregeln: Regel G4 vergleicht den Einheitspreis
  // gegen seinen Cluster und braucht ihn deshalb fertig.
  const relations = measure('Beziehungen', () => buildRelations(index));
  return {
    tree,
    projectName: classified.projectName,
    client: classified.client,
    fileName,
    summary,
    // Prüfregeln sehen das ganze LV (Anteil an der Gesamtsumme, Mengen-Rang) und
    // laufen deshalb hier — einmal, nie im Render.
    check: runChecks(index, summary, relations),
    relations,
  };
}

/** Ganze Pipeline synchron — Fallback ohne Worker und Testpfad. */
export function runPipeline(bytes: ArrayBuffer, fileName: string): LoadedLV {
  return classifyAndBuild(parseToDraft(bytes, fileName), fileName);
}
