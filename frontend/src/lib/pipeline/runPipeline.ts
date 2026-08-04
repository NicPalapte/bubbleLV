// Datei → Parser → Klassifizierung → Baum (docs/architecture/pipeline.md#ablauf).
//
// Die Pipeline ist absichtlich zweigeteilt: `parseToDraft` braucht `DOMParser`,
// der laut HTML-Spezifikation nur im Window-Scope existiert und in keinem
// Browser im Worker-Scope verfügbar ist. Der Schritt läuft deshalb im
// Haupt-Thread (nativer XML-Parser, entsprechend schnell), während
// `classifyAndBuild` — der rechenintensive Teil mit einer Regelauswertung je
// Position — in den Worker ausgelagert wird (siehe pipeline.worker.ts).

import { classifyDraft, getClassifier } from '../classify';
import { getGaebParser, mapToLvDraft } from '../gaeb';
import { buildTree } from '../tree/buildTree';
import type { LVDraft } from '../../types/lvDraft';
import type { LVNode } from '../../types/lvNode';

export interface LoadedLV {
  tree: LVNode;
  projectName: string | null;
  client: string | null;
  fileName: string;
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
  return {
    tree: buildTree(classified),
    projectName: classified.projectName,
    client: classified.client,
    fileName,
  };
}

/** Ganze Pipeline synchron — Fallback ohne Worker und Testpfad. */
export function runPipeline(bytes: ArrayBuffer, fileName: string): LoadedLV {
  return classifyAndBuild(parseToDraft(bytes, fileName), fileName);
}
