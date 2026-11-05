// Pläne in Begleitdokumenten messen (Entscheidung 0093): eigene Notizen zur letzten
// Datei, neben den Stellen aus Entscheidung 0072.
//
// - Seitenart: Conocto schätzt Text oder Plan selbst (`guessPageKind`); gespeichert
//   wird nur, was der Mensch von Hand umstellt.
// - Maßstab je Seite: nur, was der Mensch übernommen hat (Plankopf oder Strecke).
// - Messungen: Punkte in Seiten-Einheiten, Art, Name, verknüpfte Positionen. Der Wert
//   wird immer aus dem aktuellen Maßstab gerechnet, nie gespeichert — ein neuer Maßstab
//   gilt so auch für alte Messungen.
// - Mengen je Position: Faktor für den Ansatz (z. B. Fläche × Tiefe) oder eine eigene
//   Rechnung (Rechenansatz). Daraus folgt die VA-Menge mit ihrer Herkunft.
//
// Positionen stehen in der Sitzung unter der Knoten-ID, im Speicher unter dem
// Positions-Hash (Entscheidung 0055) — wie alle Notizen (`rekeyPlanNotes`). Das PDF
// selbst wird nicht gespeichert. Reine Funktionen; Zeitpunkte kommen von außen.

import { polygonArea, polylineLength, ratioFromUnit, type PageKind, type PlanPoint } from '@core';

export type MeasureKind = 'laenge' | 'flaeche' | 'stueck';

export const MEASURE_KINDS: readonly MeasureKind[] = ['laenge', 'flaeche', 'stueck'];

export const MEASURE_LABEL: Readonly<Record<MeasureKind, string>> = {
  laenge: 'Länge',
  flaeche: 'Fläche',
  stueck: 'Stück',
};

export const MEASURE_UNIT: Readonly<Record<MeasureKind, string>> = {
  laenge: 'm',
  flaeche: 'm²',
  stueck: 'St',
};

export interface PageRef {
  readonly doc: string;
  /** Ab 1. */
  readonly page: number;
}

/** Von Hand umgestellte Seitenart. */
export interface PageKindEntry extends PageRef {
  readonly kind: PageKind;
}

/** Übernommener Maßstab einer Seite. */
export interface PlanScale extends PageRef {
  /** Meter in der Natur je Seiten-Einheit. */
  readonly unit: number;
  readonly source: 'plankopf' | 'strecke';
  readonly at: number;
}

export interface PlanMeasure extends PageRef {
  readonly id: string;
  readonly kind: MeasureKind;
  /** Seiten-Einheiten bei Maßstab 1; bei Stück je Bauteil ein Punkt. */
  readonly points: readonly PlanPoint[];
  readonly name: string;
  /** Verknüpfte Positionen, ohne Doppelte. */
  readonly links: readonly string[];
  readonly at: number;
}

/** Rechenzeichen im Ansatz. */
export type AnsatzOp = '+' | '-' | '*' | '/' | '(' | ')';

export const ANSATZ_OPS: readonly AnsatzOp[] = ['+', '-', '*', '/', '(', ')'];

/**
 * Baustein eines Rechenansatzes. Zahlen werden nie getippt (Nico, 05.11.2026): ein
 * Maß wird im Plan angetippt (gedruckte Zahl einer Maßkette, mit Fundstelle) oder eine
 * eigene Messung übernommen; dazwischen stehen Rechenzeichen.
 */
export type AnsatzTerm =
  | {
      readonly kind: 'mass';
      readonly value: number;
      readonly doc: string;
      readonly page: number;
      readonly start: number;
      readonly text: string;
    }
  | { readonly kind: 'messung'; readonly id: string }
  | { readonly kind: 'op'; readonly op: AnsatzOp };

/** Eigene Angaben zur Menge einer Position. */
export interface QuantityNote {
  /** Faktor auf die Summe der Messungen, z. B. Tiefe in m für m² → m³. */
  readonly factor?: number;
  /** Rechenansatz aus Bausteinen; hat Vorrang vor der Summe der Messungen. */
  readonly ansatz?: readonly AnsatzTerm[];
}

export interface PlanNotes {
  readonly kinds: readonly PageKindEntry[];
  readonly scales: readonly PlanScale[];
  readonly measures: readonly PlanMeasure[];
  readonly quantities: ReadonlyMap<string, QuantityNote>;
}

export const EMPTY_PLAN_NOTES: PlanNotes = {
  kinds: [],
  scales: [],
  measures: [],
  quantities: new Map(),
};

export function isEmptyPlanNotes(notes: PlanNotes): boolean {
  return (
    notes.kinds.length === 0 &&
    notes.scales.length === 0 &&
    notes.measures.length === 0 &&
    notes.quantities.size === 0
  );
}

const samePage = (a: PageRef, b: PageRef): boolean => a.doc === b.doc && a.page === b.page;
const byPage = (a: PageRef, b: PageRef): number =>
  a.doc === b.doc ? a.page - b.page : a.doc < b.doc ? -1 : 1;

/** Seitenart von Hand; `null` nimmt die Umstellung zurück (dann gilt die Schätzung). */
export function setPageKind(notes: PlanNotes, ref: PageRef, kind: PageKind | null): PlanNotes {
  const rest = notes.kinds.filter((entry) => !samePage(entry, ref));
  if (kind === null) {
    return rest.length === notes.kinds.length ? notes : { ...notes, kinds: rest };
  }
  if (notes.kinds.some((entry) => samePage(entry, ref) && entry.kind === kind)) return notes;
  return { ...notes, kinds: [...rest, { doc: ref.doc, page: ref.page, kind }].sort(byPage) };
}

export function pageKindOf(notes: PlanNotes, ref: PageRef): PageKind | null {
  return notes.kinds.find((entry) => samePage(entry, ref))?.kind ?? null;
}

/** Maßstab übernehmen; `null` entfernt ihn. Ungültige Werte ändern nichts. */
export function setScale(
  notes: PlanNotes,
  ref: PageRef,
  scale: { unit: number; source: PlanScale['source']; at: number } | null,
): PlanNotes {
  const rest = notes.scales.filter((entry) => !samePage(entry, ref));
  if (scale === null) {
    return rest.length === notes.scales.length ? notes : { ...notes, scales: rest };
  }
  if (!(scale.unit > 0) || !Number.isFinite(scale.unit)) return notes;
  const entry: PlanScale = { doc: ref.doc, page: ref.page, ...scale };
  return { ...notes, scales: [...rest, entry].sort(byPage) };
}

export function scaleOf(notes: PlanNotes, ref: PageRef): PlanScale | null {
  return notes.scales.find((entry) => samePage(entry, ref)) ?? null;
}

function validPoint(point: unknown): point is PlanPoint {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    typeof point[0] === 'number' &&
    typeof point[1] === 'number' &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1])
  );
}

const MIN_POINTS: Readonly<Record<MeasureKind, number>> = { laenge: 2, flaeche: 3, stueck: 1 };

function validMeasure(measure: PlanMeasure): boolean {
  return (
    measure.id !== '' &&
    measure.doc !== '' &&
    Number.isInteger(measure.page) &&
    measure.page >= 1 &&
    measure.points.length >= MIN_POINTS[measure.kind] &&
    measure.points.every(validPoint)
  );
}

/** Neue oder geänderte Messung (gleiche `id` ersetzt). */
export function putMeasure(notes: PlanNotes, measure: PlanMeasure): PlanNotes {
  if (!validMeasure(measure)) return notes;
  const clean: PlanMeasure = { ...measure, links: [...new Set(measure.links)] };
  const rest = notes.measures.filter((entry) => entry.id !== measure.id);
  return { ...notes, measures: [...rest, clean].sort((a, b) => byPage(a, b) || a.at - b.at) };
}

export function removeMeasure(notes: PlanNotes, id: string): PlanNotes {
  const rest = notes.measures.filter((entry) => entry.id !== id);
  return rest.length === notes.measures.length ? notes : { ...notes, measures: rest };
}

/** Verknüpfungen einer Messung setzen (Knoten-IDs). */
export function linkMeasure(notes: PlanNotes, id: string, links: readonly string[]): PlanNotes {
  const known = notes.measures.find((entry) => entry.id === id);
  if (known === undefined) return notes;
  return putMeasure(notes, { ...known, links });
}

export function measuresOfPage(notes: PlanNotes, ref: PageRef): PlanMeasure[] {
  return notes.measures.filter((entry) => samePage(entry, ref));
}

export function measuresOfPosition(notes: PlanNotes, id: string): PlanMeasure[] {
  return notes.measures.filter((entry) => entry.links.includes(id));
}

/** Wert einer Messung in m, m² oder Stück; ohne Maßstab (außer Stück) `null`. */
export function measureValue(measure: PlanMeasure, scale: PlanScale | null): number | null {
  if (measure.kind === 'stueck') return measure.points.length;
  if (scale === null) return null;
  return measure.kind === 'laenge'
    ? polylineLength(measure.points) * scale.unit
    : polygonArea(measure.points) * scale.unit * scale.unit;
}

/** Eigene Angaben zur Menge; leere Angaben entfernen den Eintrag. */
export function setQuantity(notes: PlanNotes, id: string, note: QuantityNote): PlanNotes {
  const factor =
    note.factor !== undefined &&
    note.factor > 0 &&
    Number.isFinite(note.factor) &&
    note.factor !== 1
      ? note.factor
      : undefined;
  const ansatz = note.ansatz !== undefined && note.ansatz.length > 0 ? note.ansatz : undefined;
  const quantities = new Map(notes.quantities);
  if (factor === undefined && ansatz === undefined) {
    if (!quantities.delete(id)) return notes;
  } else {
    quantities.set(id, {
      ...(factor === undefined ? {} : { factor }),
      ...(ansatz === undefined ? {} : { ansatz }),
    });
  }
  return { ...notes, quantities };
}

// --- Rechenansatz ------------------------------------------------------------------

/** Zahl aus einem gedruckten Maß: „6,50“, „6.50“, „1.250,5“, „650“ (cm bleiben cm). */
export function parseMass(text: string): number | null {
  const clean = text.trim().replace(/\s+/g, '');
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^\d+(?:[.,]\d+)?$/.test(clean)) return null;
  const value = clean.includes(',')
    ? Number(clean.replace(/\./g, '').replace(',', '.'))
    : Number(clean);
  return Number.isFinite(value) ? value : null;
}

/** Ansatz als Rechnung lesbar machen, z. B. „6,5 × 5 + 4,65 × 5“. */
export function ansatzText(ansatz: readonly AnsatzTerm[], nameOf: (id: string) => string): string {
  return ansatz
    .map((term) =>
      term.kind === 'mass'
        ? term.text
        : term.kind === 'messung'
          ? nameOf(term.id)
          : term.op === '*'
            ? '×'
            : term.op === '/'
              ? ':'
              : term.op,
    )
    .join(' ');
}

/** Wert eines Ansatzes; Messungen über `valueOf`. Unvollständig oder falsch: `null`. */
export function evaluateAnsatz(
  ansatz: readonly AnsatzTerm[],
  valueOf: (id: string) => number | null,
): number | null {
  let source = '';
  for (const term of ansatz) {
    if (term.kind === 'op') source += term.op;
    else {
      const value = term.kind === 'mass' ? term.value : valueOf(term.id);
      if (value === null) return null;
      // Klammern: negative Werte bleiben eine Zahl.
      source += `(${String(value)})`;
    }
  }
  return evaluateFormula(source);
}

/**
 * Rechnet einen einfachen Ansatz aus: Zahlen (Komma oder Punkt), + − * / × : und
 * Klammern. Alles andere ergibt `null` — kein `eval`, kein Funktionsaufruf.
 */
export function evaluateFormula(formula: string): number | null {
  const source = formula.replace(/\s+/g, '').replace(/×/g, '*').replace(/:/g, '/');
  if (source === '' || source.length > 200) return null;
  let at = 0;
  const peek = (): string => source[at] ?? '';
  function number(): number | null {
    const match = /^\d+(?:[.,]\d+)?/.exec(source.slice(at));
    if (match === null) return null;
    at += match[0].length;
    return Number(match[0].replace(',', '.'));
  }
  function factor(): number | null {
    if (peek() === '-') {
      at += 1;
      const value = factor();
      return value === null ? null : -value;
    }
    if (peek() === '(') {
      at += 1;
      const value = sum();
      if (value === null || peek() !== ')') return null;
      at += 1;
      return value;
    }
    return number();
  }
  function product(): number | null {
    let value = factor();
    while (value !== null && (peek() === '*' || peek() === '/')) {
      const op = peek();
      at += 1;
      const next = factor();
      if (next === null || (op === '/' && next === 0)) return null;
      value = op === '*' ? value * next : value / next;
    }
    return value;
  }
  function sum(): number | null {
    let value = product();
    while (value !== null && (peek() === '+' || peek() === '-')) {
      const op = peek();
      at += 1;
      const next = product();
      if (next === null) return null;
      value = op === '+' ? value + next : value - next;
    }
    return value;
  }
  const value = sum();
  return value === null || at !== source.length || !Number.isFinite(value) ? null : value;
}

// --- VA-Menge --------------------------------------------------------------------

export type Herkunft = 'Plan' | 'Rechenansatz';

export interface VaPart {
  readonly measure: PlanMeasure;
  readonly value: number | null;
}

export interface VaQuantity {
  /** `null`: nicht zu rechnen (Maßstab fehlt, Messarten gemischt, Ansatz falsch). */
  readonly value: number | null;
  readonly herkunft: Herkunft;
  readonly parts: readonly VaPart[];
  /** Summe der Messungen vor dem Faktor. */
  readonly base: number | null;
  readonly kind: MeasureKind | null;
  readonly factor: number;
  /** Warum `value` fehlt; kurz, für die Anzeige. */
  readonly reason: string | null;
}

/** VA-Menge einer Position (Knoten-ID); ohne Messung und ohne Rechnung `null`. */
export function vaOf(notes: PlanNotes, id: string): VaQuantity | null {
  const note = notes.quantities.get(id);
  const factor = note?.factor ?? 1;
  const parts = measuresOfPosition(notes, id).map((measure) => ({
    measure,
    value: measureValue(measure, scaleOf(notes, measure)),
  }));
  if (note?.ansatz !== undefined) {
    const value = evaluateAnsatz(note.ansatz, (measureId) => {
      const measure = notes.measures.find((entry) => entry.id === measureId);
      return measure === undefined ? null : measureValue(measure, scaleOf(notes, measure));
    });
    return {
      value,
      herkunft: 'Rechenansatz',
      parts,
      base: null,
      kind: null,
      factor: 1,
      reason: value === null ? 'Ansatz unvollständig' : null,
    };
  }
  if (parts.length === 0) return null;
  const kinds = new Set(parts.map((part) => part.measure.kind));
  const kind = kinds.size === 1 ? parts[0].measure.kind : null;
  const missing = parts.some((part) => part.value === null);
  const base = missing ? null : parts.reduce((total, part) => total + (part.value ?? 0), 0);
  const reason = kind === null ? 'Messarten gemischt' : missing ? 'Maßstab fehlt' : null;
  return {
    value: reason === null && base !== null ? base * factor : null,
    herkunft: 'Plan',
    parts,
    base,
    kind,
    factor,
    reason,
  };
}

/** Alle Positionen mit VA-Menge, für Tabelle und Export. */
export function positionsWithVa(notes: PlanNotes): Set<string> {
  const out = new Set(notes.quantities.keys());
  for (const measure of notes.measures) for (const id of measure.links) out.add(id);
  return out;
}

// --- Schlüssel, Zusammenführen, Speicherform ---------------------------------------

/** Schlüssel der Positionen austauschen; Unbekannte bleiben (wie `rekey`). */
export function rekeyPlanNotes(notes: PlanNotes, keys: ReadonlyMap<string, string>): PlanNotes {
  if (notes.measures.length === 0 && notes.quantities.size === 0) return notes;
  const key = (id: string): string => keys.get(id) ?? id;
  return {
    ...notes,
    measures: notes.measures.map((measure) =>
      measure.links.length === 0
        ? measure
        : { ...measure, links: [...new Set(measure.links.map(key))] },
    ),
    quantities: new Map([...notes.quantities].map(([id, value]) => [key(id), value])),
  };
}

/** Aus einer Notiz-Datei dazunehmen: Vorhandenes bleibt, Neues kommt dazu. */
export function mergePlanNotes(notes: PlanNotes, more: PlanNotes): PlanNotes {
  let out = notes;
  for (const entry of more.kinds) {
    if (pageKindOf(out, entry) === null) out = setPageKind(out, entry, entry.kind);
  }
  for (const entry of more.scales) {
    if (scaleOf(out, entry) === null) out = setScale(out, entry, entry);
  }
  const known = new Set(out.measures.map((measure) => measure.id));
  for (const measure of more.measures) if (!known.has(measure.id)) out = putMeasure(out, measure);
  for (const [id, note] of more.quantities) {
    if (!out.quantities.has(id)) out = setQuantity(out, id, note);
  }
  return out;
}

/** Form für IndexedDB und Notiz-Datei: Arrays statt Map. */
export interface StoredPlanNotes {
  readonly kinds?: readonly PageKindEntry[];
  readonly scales?: readonly PlanScale[];
  readonly measures?: readonly PlanMeasure[];
  readonly quantities?: ReadonlyArray<readonly [string, QuantityNote]>;
}

export function toStoredPlanNotes(notes: PlanNotes): StoredPlanNotes {
  return {
    ...(notes.kinds.length === 0 ? {} : { kinds: notes.kinds }),
    ...(notes.scales.length === 0 ? {} : { scales: notes.scales }),
    ...(notes.measures.length === 0 ? {} : { measures: notes.measures }),
    ...(notes.quantities.size === 0 ? {} : { quantities: [...notes.quantities] }),
  };
}

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function toPageRef(raw: Record<string, unknown>): PageRef | null {
  const { doc, page } = raw;
  if (typeof doc !== 'string' || doc === '') return null;
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) return null;
  return { doc, page };
}

const atOf = (raw: Record<string, unknown>): number =>
  typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;

const isMeasureKind = (value: unknown): value is MeasureKind =>
  value === 'laenge' || value === 'flaeche' || value === 'stueck';

function toTerm(value: unknown): AnsatzTerm | null {
  const raw = record(value);
  if (raw === null) return null;
  if (raw.kind === 'op') {
    return ANSATZ_OPS.includes(raw.op as AnsatzOp) ? { kind: 'op', op: raw.op as AnsatzOp } : null;
  }
  if (raw.kind === 'messung') {
    return typeof raw.id === 'string' && raw.id !== '' ? { kind: 'messung', id: raw.id } : null;
  }
  if (raw.kind !== 'mass') return null;
  const ref = toPageRef(raw);
  const { value: num, start, text } = raw;
  if (ref === null || typeof num !== 'number' || !Number.isFinite(num)) return null;
  if (typeof start !== 'number' || typeof text !== 'string') return null;
  return { kind: 'mass', value: num, ...ref, start, text };
}

/** Liest die gespeicherte Form; Unbrauchbares fällt still weg. */
export function fromStoredPlanNotes(value: unknown): PlanNotes {
  const raw = record(value);
  if (raw === null) return EMPTY_PLAN_NOTES;
  let notes = EMPTY_PLAN_NOTES;
  for (const item of Array.isArray(raw.kinds) ? raw.kinds : []) {
    const entry = record(item);
    const ref = entry === null ? null : toPageRef(entry);
    if (ref === null || (entry?.kind !== 'text' && entry?.kind !== 'plan')) continue;
    notes = setPageKind(notes, ref, entry.kind);
  }
  for (const item of Array.isArray(raw.scales) ? raw.scales : []) {
    const entry = record(item);
    const ref = entry === null ? null : toPageRef(entry);
    if (ref === null || entry === null || typeof entry.unit !== 'number') continue;
    const source = entry.source === 'strecke' ? 'strecke' : 'plankopf';
    notes = setScale(notes, ref, { unit: entry.unit, source, at: atOf(entry) });
  }
  for (const item of Array.isArray(raw.measures) ? raw.measures : []) {
    const entry = record(item);
    const ref = entry === null ? null : toPageRef(entry);
    if (ref === null || entry === null || !isMeasureKind(entry.kind)) continue;
    if (typeof entry.id !== 'string' || !Array.isArray(entry.points)) continue;
    const points = entry.points.filter(validPoint).map(([x, y]): PlanPoint => [x, y]);
    const links = Array.isArray(entry.links)
      ? entry.links.filter((id): id is string => typeof id === 'string' && id !== '')
      : [];
    notes = putMeasure(notes, {
      ...ref,
      id: entry.id,
      kind: entry.kind,
      points,
      name: typeof entry.name === 'string' ? entry.name : '',
      links,
      at: atOf(entry),
    });
  }
  for (const item of Array.isArray(raw.quantities) ? raw.quantities : []) {
    if (!Array.isArray(item) || typeof item[0] !== 'string') continue;
    const note = record(item[1]);
    if (note === null) continue;
    const ansatz = Array.isArray(note.ansatz)
      ? note.ansatz.map(toTerm).filter((term): term is AnsatzTerm => term !== null)
      : [];
    notes = setQuantity(notes, item[0], {
      ...(typeof note.factor === 'number' ? { factor: note.factor } : {}),
      ...(ansatz.length > 0 ? { ansatz } : {}),
    });
  }
  return isEmptyPlanNotes(notes) ? EMPTY_PLAN_NOTES : notes;
}

/** Zahl deutsch mit zwei Nachkommastellen, z. B. „1.250,50“. */
export function formatAmount(value: number, digits = 2): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Wert einer Messung mit Einheit; ohne Maßstab „—“. */
export function formatMeasure(value: number | null, kind: MeasureKind): string {
  if (value === null) return '—';
  return `${formatAmount(value, kind === 'stueck' ? 0 : 2)} ${MEASURE_UNIT[kind]}`;
}

/** Mittelpunkt der Punkte, für die Beschriftung im Plan. */
export function centerOf(points: readonly PlanPoint[]): PlanPoint {
  if (points.length === 0) return [0, 0];
  let x = 0;
  let y = 0;
  for (const [px, py] of points) {
    x += px;
    y += py;
  }
  return [x / points.length, y / points.length];
}

/**
 * Baustein an einen Ansatz hängen: zwei Werte hintereinander verbindet ein „+“ (mehrere
 * Maßketten), ein Rechenzeichen nach einem Rechenzeichen ersetzt es (Klammern bleiben).
 */
export function appendTerm(ansatz: readonly AnsatzTerm[], term: AnsatzTerm): AnsatzTerm[] {
  const last = ansatz.at(-1);
  const isValue = (item: AnsatzTerm | undefined): boolean =>
    item !== undefined && (item.kind !== 'op' || item.op === ')');
  if (term.kind !== 'op') {
    return isValue(last) ? [...ansatz, { kind: 'op', op: '+' }, term] : [...ansatz, term];
  }
  const binary = (item: AnsatzTerm | undefined): boolean =>
    item?.kind === 'op' && item.op !== '(' && item.op !== ')';
  const opensGroup = last === undefined || (last.kind === 'op' && last.op === '(');
  // Am Anfang oder nach „(“ ergibt nur Minus einen Sinn.
  if (binary(term) && opensGroup && term.op !== '-') return [...ansatz];
  if (binary(last) && binary(term)) return [...ansatz.slice(0, -1), term];
  if (term.op === '(' && isValue(last)) return [...ansatz, { kind: 'op', op: '*' }, term];
  return [...ansatz, term];
}

/** Maßstab als „1:100“; krumme Werte mit einer Nachkommastelle. */
export function ratioLabel(unit: number): string {
  const ratio = ratioFromUnit(unit);
  const round = Math.round(ratio);
  return `1:${Math.abs(ratio - round) < 0.05 ? String(round) : formatAmount(ratio, 1)}`;
}
