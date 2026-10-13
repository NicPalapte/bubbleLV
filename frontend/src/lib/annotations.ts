// Eigene Markierungen und Kommentare je Position (Entscheidung 0047).
//
// Schlüssel ist die Knoten-ID der Position. Sie entsteht beim Laden aus OZ und
// Reihenfolge (lib/tree/buildTree.ts) und ist für dieselbe Datei immer gleich —
// deshalb passen gespeicherte Kommentare wieder, wenn die Datei neu geöffnet wird.
//
// Reine Funktionen über einem unveränderlichen Wert; der Zustand liegt im Viewer.

export interface Annotations {
  readonly marked: ReadonlySet<string>;
  /** Nur nicht-leere Kommentare; ein geleertes Feld löscht den Eintrag. */
  readonly notes: ReadonlyMap<string, string>;
}

export const EMPTY_ANNOTATIONS: Annotations = { marked: new Set(), notes: new Map() };

/** Filter „Markiert" bzw. „Mit Kommentar" — beide an heißt: beides muss zutreffen. */
export interface AnnotationFilter {
  readonly marked: boolean;
  readonly commented: boolean;
}

export const NO_ANNOTATION_FILTER: AnnotationFilter = { marked: false, commented: false };

export function toggleMark(annotations: Annotations, id: string): Annotations {
  const marked = new Set(annotations.marked);
  if (!marked.delete(id)) marked.add(id);
  return { ...annotations, marked };
}

export function setNote(annotations: Annotations, id: string, text: string): Annotations {
  const current = annotations.notes.get(id) ?? '';
  // Nur Leerraum zählt als leer, gespeichert wird der Text aber wie getippt.
  const next = text.trim() === '' ? '' : text;
  if (current === next) return annotations;
  const notes = new Map(annotations.notes);
  if (next === '') notes.delete(id);
  else notes.set(id, next);
  return { ...annotations, notes };
}

/**
 * Positionen, die der Filter zulässt — `null`, wenn er aus ist. Als ID-Menge
 * vorberechnet, damit `matchPos` je Position nur einmal nachschlägt.
 */
export function annotationAllowList(
  annotations: Annotations,
  filter: AnnotationFilter,
): ReadonlySet<string> | null {
  if (!filter.marked && !filter.commented) return null;
  const allowed = new Set<string>();
  if (filter.marked) {
    for (const id of annotations.marked) {
      if (!filter.commented || annotations.notes.has(id)) allowed.add(id);
    }
    return allowed;
  }
  for (const id of annotations.notes.keys()) allowed.add(id);
  return allowed;
}

/** Form für die IndexedDB: Arrays statt Set/Map, damit auch ältere Browser klonen. */
export interface StoredAnnotations {
  readonly marked: readonly string[];
  readonly notes: ReadonlyArray<readonly [string, string]>;
}

export function toStored(annotations: Annotations): StoredAnnotations {
  return { marked: [...annotations.marked], notes: [...annotations.notes] };
}

export function fromStored(value: unknown): Annotations {
  if (typeof value !== 'object' || value === null) return EMPTY_ANNOTATIONS;
  const raw = value as Record<string, unknown>;
  const marked = Array.isArray(raw.marked)
    ? raw.marked.filter((id): id is string => typeof id === 'string')
    : [];
  const notes = Array.isArray(raw.notes)
    ? raw.notes.filter(
        (entry): entry is [string, string] =>
          Array.isArray(entry) &&
          typeof entry[0] === 'string' &&
          typeof entry[1] === 'string' &&
          entry[1].trim() !== '',
      )
    : [];
  return { marked: new Set(marked), notes: new Map(notes) };
}
