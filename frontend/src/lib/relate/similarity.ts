// Ähnliche Positionen finden (WP-M, Schritte 1–4). Läuft **einmal beim Laden**
// im Worker (lib/pipeline/runPipeline.ts), nie im Render.
//
// Der teure Weg wäre, jede Position mit jeder zu vergleichen: bei 10.000
// Positionen sind das rund 50 Millionen Paare. Drei Stufen halten das klein:
//
//  1. **Vorgruppierung** nach Gewerk, Einheit und Bauteiltyp. Verglichen wird
//     nur innerhalb einer Gruppe — eine Betonwand in m³ und eine Stunde
//     Facharbeiter haben nichts miteinander zu tun.
//  2. **Gleiche Texte zusammenfassen.** Wiederholte Leistungen stehen in echten
//     LVs wortgleich da. Sie werden über eine Signatur in einem Schritt
//     gebündelt; verglichen wird danach nur noch ein Stellvertreter je
//     Schreibweise.
//  3. **Invertierter Index über Schindeln.** Ein Stellvertreter sieht nur
//     Kandidaten, mit denen er mindestens zwei Wortpaare teilt.
//
// Die Cluster entstehen über eine Union-Find-Struktur: was paarweise ähnlich
// ist, landet in einer Gruppe. Das kann über mehrere Schritte verketten
// (A~B, B~C ⇒ A, B, C zusammen). Genau das ist bei Varianten derselben
// Leistung gewollt; der konservative Schwellwert hält die Ketten kurz.

import { jaccard, relateTokens, shingles } from './text';
import { outlierBounds, outlierDirection, statsOf } from './stats';
import { attrString } from '../attributes';
import { canonicalUnit, unitLabel } from '../units';
import type { Cluster, Outlier, RelationResult } from './types';
import type { PositionIndex } from '../index/positionIndex';
import type { PositionSummary } from '../../types/lvNode';

/**
 * Standard-Schwellwert, bewusst konservativ: lieber eine Gruppe weniger als
 * eine, die niemand nachvollziehen kann. Einstellbar über `buildRelations`.
 */
export const DEFAULT_THRESHOLD = 0.62;

/** Gewicht des Kurztexts gegenüber dem Langtext im Textvergleich. */
const KURZ_WEIGHT = 0.6;
/** Gewicht der Merkmals-Übereinstimmung gegenüber dem Textvergleich. */
const MERKMAL_WEIGHT = 0.3;

/**
 * Schindeln, die in mehr Stellvertretern einer Gruppe vorkommen, taugen nicht
 * zum Vorauswählen ("nach Aufmaß" steht überall). Sie bleiben beim Suchen der
 * Kandidaten außen vor — sonst wächst die Kandidatenliste auf die ganze Gruppe.
 */
const MAX_POSTING = 256;
/** Obergrenze bewerteter Kandidaten je Stellvertreter — deckelt die Laufzeit. */
const MAX_COMPARISONS = 256;
/** So viele gemeinsame Schindeln muss ein Kandidat mindestens mitbringen. */
const MIN_SHARED = 2;

/** Keys, die nie ein Merkmal sind: Provenance, Fundstellen, reine Zähler. */
const IGNORED_KEYS: ReadonlySet<string> = new Set([
  '_meta',
  '_spans',
  // Der Leistungsbereich ist die Herkunft des Gewerks, kein zweites Merkmal.
  'gewerkLb',
  // Reine Anzahl zu `platzhalter` — als Unterschied nur Rauschen.
  'platzhalterAnzahl',
]);

/** Merkmale, die durch die Vorgruppierung ohnehin gleich sind. */
const GROUPING_KEYS: ReadonlySet<string> = new Set(['gewerk', 'bauteiltyp', 'einheit']);

/** Pseudo-Key für „die Kurztexte lauten verschieden". */
export const KURZTEXT_KEY = 'kurztext';

/** Trennzeichen in zusammengesetzten Schlüsseln — kommt in Texten nicht vor. */
const SEP = String.fromCharCode(0);

interface Profile {
  /** Schlüssel der Vorgruppierung. */
  bucket: string;
  kurz: Set<string>;
  lang: Set<string>;
  /** Kurz- und Langtext-Schindeln zusammen — Grundlage des Kandidatenindex. */
  alle: string[];
  /**
   * Gleicher normalisierter Text **und** gleiche Merkmale ⇒ gleiche Signatur.
   * Nur dann ist die Abkürzung „ohne Vergleich zusammenlegen" auch bei jedem
   * Schwellwert richtig: die beiden Positionen hätten den Wert 1 bekommen.
   */
  signature: string;
  merkmale: Map<string, string>;
  /** Ohne Textinhalt lässt sich nichts über Ähnlichkeit sagen. */
  empty: boolean;
}

/** Merkmalswerte einer Position als Key → Anzeigewert. */
export function merkmaleOf(position: PositionSummary): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(position.attributes)) {
    if (IGNORED_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      const list = value.filter(
        (entry): entry is string => typeof entry === 'string' && entry !== '',
      );
      // Sortiert: die Reihenfolge im Text ist kein Unterschied in der Sache.
      if (list.length > 0) {
        out.set(key, [...list].sort((a, b) => a.localeCompare(b, 'de')).join(' · '));
      }
      continue;
    }
    if (typeof value === 'boolean') out.set(key, value ? 'ja' : 'nein');
    else if (typeof value === 'number') out.set(key, String(value));
    else if (typeof value === 'string' && value !== '') out.set(key, value);
  }
  const einheit = canonicalUnit(position.unit);
  if (einheit !== null) out.set('einheit', unitLabel(einheit));
  out.set('positionstyp', position.positionType);
  return out;
}

/** Merkmale als stabile Zeichenkette — Reihenfolge darf nichts ausmachen. */
function signatureOf(merkmale: ReadonlyMap<string, string>): string {
  return [...merkmale]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
}

function profileOf(position: PositionSummary): Profile {
  const merkmale = merkmaleOf(position);
  const kurzTokens = relateTokens(position.shortText);
  const langTokens = relateTokens(position.longText);
  const kurz = shingles(kurzTokens);
  const lang = shingles(langTokens);
  const gewerk = attrString(position.attributes, 'gewerk') ?? '—';
  const bauteiltyp = attrString(position.attributes, 'bauteiltyp') ?? '—';
  const einheit = canonicalUnit(position.unit) ?? '—';
  return {
    bucket: `${gewerk}${SEP}${einheit}${SEP}${bauteiltyp}`,
    kurz,
    lang,
    alle: [...new Set([...kurz, ...lang])],
    signature: `${kurzTokens.join(' ')}${SEP}${langTokens.join(' ')}${SEP}${signatureOf(merkmale)}`,
    merkmale,
    empty: kurzTokens.length === 0 && langTokens.length === 0,
  };
}

/**
 * Textähnlichkeit: Kurztext zählt mehr als Langtext. Der Kurztext *benennt* die
 * Leistung, der Langtext beschreibt Ausführung und Nachbarschaft und ist in
 * vielen LVs zu großen Teilen Standardtext (classify/text.ts#subjectText).
 */
function textSimilarity(a: Profile, b: Profile): number {
  const kurz = a.kurz.size > 0 && b.kurz.size > 0 ? jaccard(a.kurz, b.kurz) : null;
  const lang = a.lang.size > 0 && b.lang.size > 0 ? jaccard(a.lang, b.lang) : null;
  if (kurz === null) return lang ?? 0;
  if (lang === null) return kurz;
  return KURZ_WEIGHT * kurz + (1 - KURZ_WEIGHT) * lang;
}

/**
 * Anteil übereinstimmender Merkmale über alle Keys, die mindestens eine der
 * beiden Positionen trägt. `null`, wenn keine vergleichbaren Merkmale
 * vorliegen — dann entscheidet der Text allein, statt eine Null zu erfinden.
 */
function merkmalSimilarity(a: Profile, b: Profile): number | null {
  let gleich = 0;
  let gesamt = 0;
  for (const [key, value] of a.merkmale) {
    if (GROUPING_KEYS.has(key)) continue;
    gesamt++;
    if (b.merkmale.get(key) === value) gleich++;
  }
  for (const key of b.merkmale.keys()) {
    if (GROUPING_KEYS.has(key) || a.merkmale.has(key)) continue;
    gesamt++;
  }
  return gesamt === 0 ? null : gleich / gesamt;
}

/** Gesamtmaß aus Text und Merkmalen (0…1). */
function similarityOf(a: Profile, b: Profile): number {
  const text = textSimilarity(a, b);
  const merkmale = merkmalSimilarity(a, b);
  return merkmale === null ? text : (1 - MERKMAL_WEIGHT) * text + MERKMAL_WEIGHT * merkmale;
}

/**
 * Ähnlichkeit zweier Positionen (0…1) — dieselbe Rechnung, die auch die Cluster
 * bildet. Öffentlich für Tests und künftige Einzelabfragen (WP-N).
 */
export function positionSimilarity(a: PositionSummary, b: PositionSummary): number {
  return similarityOf(profileOf(a), profileOf(b));
}

/** Union-Find über Stellvertreter — verbindet, was paarweise ähnlich ist. */
class UnionFind {
  private readonly parent: Int32Array;

  constructor(size: number) {
    this.parent = new Int32Array(size);
    for (let i = 0; i < size; i++) this.parent[i] = i;
  }

  find(i: number): number {
    let root = i;
    while (this.parent[root] !== root) root = this.parent[root];
    // Pfad verkürzen, damit wiederholte Suchen flach bleiben.
    let walk = i;
    while (this.parent[walk] !== root) {
      const next = this.parent[walk];
      this.parent[walk] = root;
      walk = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/** Ein Stellvertreter steht für alle Positionen mit exakt gleichem Text. */
interface Rep {
  slots: number[];
  profile: Profile;
}

interface AcceptedPair {
  a: number;
  score: number;
}

export interface RelateOptions {
  /** Ab welcher Ähnlichkeit zwei Positionen zusammengehören (0…1). */
  threshold?: number;
}

export function buildRelations(index: PositionIndex, options: RelateOptions = {}): RelationResult {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  if (index.size === 0) return { clusters: [], clustered: 0, total: 0, threshold };

  const reps: Rep[] = [];
  const bucketReps = new Map<string, number[]>();
  const bySignature = new Map<string, number>();

  for (let slot = 0; slot < index.size; slot++) {
    const profile = profileOf(index.positions[slot]);
    // Positionen ohne Text: über sie lässt sich keine Ähnlichkeit aussagen.
    if (profile.empty) continue;
    const key = `${profile.bucket}${SEP}${profile.signature}`;
    const known = bySignature.get(key);
    if (known !== undefined) {
      reps[known].slots.push(slot);
      continue;
    }
    const repIndex = reps.length;
    reps.push({ slots: [slot], profile });
    bySignature.set(key, repIndex);
    const list = bucketReps.get(profile.bucket);
    if (list === undefined) bucketReps.set(profile.bucket, [repIndex]);
    else list.push(repIndex);
  }

  const union = new UnionFind(reps.length);
  const accepted: AcceptedPair[] = [];
  for (const members of bucketReps.values()) {
    if (members.length > 1) comparePairs(reps, members, threshold, union, accepted);
  }

  return collectClusters(index, reps, union, accepted, threshold);
}

/** Stellvertreter einer Vorgruppe paarweise vergleichen — über den Index. */
function comparePairs(
  reps: readonly Rep[],
  members: readonly number[],
  threshold: number,
  union: UnionFind,
  accepted: AcceptedPair[],
): void {
  // Invertierter Index: Schindel → Platz in `members` (nicht Slot im LV).
  const postings = new Map<string, number[]>();
  members.forEach((rep, position) => {
    for (const shingle of reps[rep].profile.alle) {
      const list = postings.get(shingle);
      if (list === undefined) postings.set(shingle, [position]);
      else list.push(position);
    }
  });

  const shared = new Map<number, number>();
  for (let a = 0; a < members.length; a++) {
    shared.clear();
    const profileA = reps[members[a]].profile;
    for (const shingle of profileA.alle) {
      const list = postings.get(shingle);
      // Allerweltsschindeln übergehen: sie würden die ganze Gruppe einsammeln.
      if (list === undefined || list.length > MAX_POSTING) continue;
      for (const b of list) {
        if (b > a) shared.set(b, (shared.get(b) ?? 0) + 1);
      }
    }

    const minShared = Math.min(MIN_SHARED, profileA.alle.length);
    let budget = MAX_COMPARISONS;
    for (const [b, count] of shared) {
      if (count < minShared) continue;
      // Schon verbunden: der Vergleich könnte am Ergebnis nichts ändern.
      if (union.find(members[a]) === union.find(members[b])) continue;
      if (budget-- <= 0) break;
      const score = similarityOf(profileA, reps[members[b]].profile);
      if (score < threshold) continue;
      union.union(members[a], members[b]);
      accepted.push({ a: members[a], score });
    }
  }
}

/** Aus den verbundenen Stellvertretern die fertigen Cluster bauen. */
function collectClusters(
  index: PositionIndex,
  reps: readonly Rep[],
  union: UnionFind,
  accepted: readonly AcceptedPair[],
  threshold: number,
): RelationResult {
  const byRoot = new Map<number, number[]>();
  reps.forEach((_rep, i) => {
    const root = union.find(i);
    const list = byRoot.get(root);
    if (list === undefined) byRoot.set(root, [i]);
    else list.push(i);
  });

  // Ähnlichkeit je Gruppe: die angenommenen Paarwerte plus je Dublette eine 1.
  const scores = new Map<number, { sum: number; count: number }>();
  const addScore = (root: number, score: number): void => {
    const entry = scores.get(root);
    if (entry === undefined) scores.set(root, { sum: score, count: 1 });
    else {
      entry.sum += score;
      entry.count++;
    }
  };
  for (const pair of accepted) addScore(union.find(pair.a), pair.score);
  reps.forEach((rep, i) => {
    for (let n = 1; n < rep.slots.length; n++) addScore(union.find(i), 1);
  });

  const clusters: Cluster[] = [];
  let clustered = 0;
  for (const [root, group] of byRoot) {
    const slots = group.flatMap((rep) => reps[rep].slots).sort((a, b) => a - b);
    if (slots.length < 2) continue;
    clustered += slots.length;
    const score = scores.get(root);
    clusters.push(clusterOf(index, slots, score === undefined ? 1 : score.sum / score.count));
  }

  // Größte zuerst — die tragen die meiste Wiederholung und lohnen den Blick.
  clusters.sort((a, b) => b.positionIds.length - a.positionIds.length);
  return { clusters, clustered, total: index.size, threshold };
}

function clusterOf(index: PositionIndex, slots: readonly number[], similarity: number): Cluster {
  const positions = slots.map((slot) => index.positions[slot]);
  const positionIds = slots.map((slot) => index.nodes[slot].id);
  const { gemeinsameMerkmale, unterscheidendeMerkmale } = compareMerkmale(positions);

  return {
    id: `cluster:${positionIds[0]}`,
    positionIds,
    label: labelOf(positions),
    gemeinsameMerkmale,
    unterscheidendeMerkmale,
    ausreisser: [
      ...outliersOf(index.unitPrice, slots, positionIds, 'ep'),
      ...outliersOf(index.quantity, slots, positionIds, 'menge'),
    ],
    unitPrice: statsOf(slots.map((slot) => index.unitPrice[slot])),
    quantity: statsOf(slots.map((slot) => index.quantity[slot])),
    similarity,
  };
}

/** Was alle teilen und was sie auseinanderhält (WP-M, Schritt 2). */
function compareMerkmale(positions: readonly PositionSummary[]): {
  gemeinsameMerkmale: Record<string, string>;
  unterscheidendeMerkmale: string[];
} {
  const werte = new Map<string, Set<string>>();
  const traeger = new Map<string, number>();
  for (const position of positions) {
    for (const [key, value] of merkmaleOf(position)) {
      const set = werte.get(key);
      if (set === undefined) werte.set(key, new Set([value]));
      else set.add(value);
      traeger.set(key, (traeger.get(key) ?? 0) + 1);
    }
  }

  const gemeinsameMerkmale: Record<string, string> = {};
  const unterschiede: Array<[string, number]> = [];
  for (const [key, values] of werte) {
    // Ein Merkmal, das nur ein Teil der Gruppe trägt, ist ein Unterschied —
    // auch wenn die Träger sich einig sind.
    if (values.size === 1 && traeger.get(key) === positions.length) {
      gemeinsameMerkmale[key] = [...values][0];
    } else {
      unterschiede.push([key, values.size]);
    }
  }

  if (new Set(positions.map((position) => position.shortText)).size > 1) {
    unterschiede.push([KURZTEXT_KEY, 2]);
  }

  // Das vielfältigste Merkmal zuerst: dort steckt der eigentliche Unterschied.
  unterschiede.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'));
  return { gemeinsameMerkmale, unterscheidendeMerkmale: unterschiede.map(([key]) => key) };
}

function outliersOf(
  column: Float64Array,
  slots: readonly number[],
  positionIds: readonly string[],
  field: Outlier['field'],
): Outlier[] {
  const values = slots.map((slot) => column[slot]);
  const stats = statsOf(values);
  if (stats === null) return [];
  const bounds = outlierBounds(stats);
  if (bounds === null) return [];

  const out: Outlier[] = [];
  values.forEach((value, i) => {
    const direction = outlierDirection(value, bounds);
    if (direction === null) return;
    out.push({ positionId: positionIds[i], field, direction, value, median: stats.median });
  });
  return out;
}

/**
 * Name der Gruppe: der häufigste Kurztext, bei Gleichstand der kürzere. Er
 * stammt immer aus der Datei — Bubble erfindet keine Überschrift.
 */
function labelOf(positions: readonly PositionSummary[]): string {
  const counts = new Map<string, number>();
  for (const position of positions) {
    const text = position.shortText.trim();
    if (text !== '') counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [text, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && text.length < best.length)) {
      best = text;
      bestCount = count;
    }
  }
  return best ?? 'Ohne Kurztext';
}
