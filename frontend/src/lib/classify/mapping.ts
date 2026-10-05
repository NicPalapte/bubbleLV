// Mappingtabelle: Stichwort → Code in einer Dimension (docs/decisions/0032).
// Eine Datei für alle Zuordnungen (Leistungsbereich, Positionsart, Bauteiltyp,
// Material, …); gepflegt unter docs/domain/reference/zuordnung.csv. Sie wird zur
// Build-Zeit als Rohtext eingebunden — kein fetch, kein Netzwerk-Request.
//
// Ein Abgleich liefert je Dimension einen Hauptwert plus Alternativen. Bleibt ein
// Gleichstand zwischen verschiedenen Codes, ist das Ergebnis `mehrdeutig` — der
// Hauptwert steht trotzdem fest (Tabellenreihenfolge), die Oberfläche kann beide
// Optionen zeigen.

import mappingCsv from './data/zuordnung.csv?raw';
import { parseCsv } from '../csv';
import { subjectText, type NormalizedItem } from './text';

/** Gliederungen, zu denen eine Position zugeordnet wird. */
export const DIMENSIONEN = [
  'leistungsbereich',
  'positionsart',
  'bauteiltyp',
  'material',
  'qualifikation',
  'planungsart',
  'einrichtungsart',
  'steinart',
  // Nur Format: noch keine Daten (ADR 0032, Kostengruppen nach DIN 276).
  'kostengruppe',
] as const;

export type Dimension = (typeof DIMENSIONEN)[number];

export function isDimension(value: string): value is Dimension {
  return (DIMENSIONEN as readonly string[]).includes(value);
}

/** Gegen welchen Text das Stichwort geprüft wird. */
export type Wo = 'kurztext' | 'alle';

/** Herkunft einer Zeile; `lernregel` gilt vor allen anderen. */
export type Quelle = 'katalog' | 'code' | 'owner' | 'lernregel';

/**
 * `bestaetigt` — vom Owner geprüft. `uebernommen` — aus dem Code übernommen, wirkt,
 * ist aber noch nicht geprüft. `entwurf` — wirkt nicht.
 */
export type Status = 'bestaetigt' | 'uebernommen' | 'entwurf';

export interface MappingRow {
  dimension: Dimension;
  code: string;
  /** Kleingeschrieben. */
  stichwort: string;
  wo: Wo;
  gewicht: number;
  quelle: Quelle;
  status: Status;
  hinweis: string;
}

const QUELLEN: readonly Quelle[] = ['katalog', 'code', 'owner', 'lernregel'];
const STATUS: readonly Status[] = ['bestaetigt', 'uebernommen', 'entwurf'];

/**
 * Das CSV-Feld trimmt Leerraum, ein Stichwort wie " ks-" (nur nach Leerzeichen,
 * also am Wortanfang) braucht aber ein Leerzeichen am Rand. `_` steht dafür.
 */
function decodeStichwort(raw: string): string {
  let word = raw.toLowerCase();
  if (word.startsWith('_')) word = ` ${word.slice(1)}`;
  if (word.length > 1 && word.endsWith('_')) word = `${word.slice(0, -1)} `;
  return word;
}

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * Zeilen der Tabelle. Unbekannte Dimensionen und leere Stichworte fallen weg
 * ("Referenzdaten fehlen ⇒ inaktiv, kein Fehler"). Ein unbekannter Status gilt als
 * `entwurf` — die vorsichtige Annahme.
 */
export function parseMappingCsv(csv: string): MappingRow[] {
  const rows: MappingRow[] = [];
  for (const row of parseCsv(csv)) {
    const dimension = row.get('dimension').toLowerCase();
    const code = row.get('code');
    const stichwort = decodeStichwort(row.get('stichwort'));
    if (!isDimension(dimension) || code === '' || stichwort.trim() === '') continue;

    const gewicht = Number(row.get('gewicht'));
    rows.push({
      dimension,
      code,
      stichwort,
      wo: pick(row.get('wo').toLowerCase(), ['kurztext', 'alle'], 'alle'),
      gewicht: Number.isFinite(gewicht) ? gewicht : 0,
      quelle: pick(row.get('quelle').toLowerCase(), QUELLEN, 'owner'),
      status: pick(row.get('status').toLowerCase(), STATUS, 'entwurf'),
      hinweis: row.get('hinweis'),
    });
  }
  return rows;
}

/** Ein Text, gegen den abgeglichen wird, in den zwei Sichten aus `Wo`. */
export interface MatchText {
  /** Der benennende Text; fehlt der Kurztext, steht hier der gesamte Text. */
  kurztext: string;
  alle: string;
}

/** Sichten einer Position. */
export function matchTextOf(item: NormalizedItem): MatchText {
  return { kurztext: subjectText(item), alle: item.all };
}

/** Sichten einer Überschrift: sie ist ein einzelner kurzer Text. */
export function matchTextOfHeading(heading: string): MatchText {
  return { kurztext: heading, alle: heading };
}

export interface Candidate {
  code: string;
  /** Das Stichwort, das den Treffer ausgelöst hat. */
  stichwort: string;
  gewicht: number;
  quelle: Quelle;
}

export interface DimensionMatch {
  code: string;
  stichwort: string;
  /** Index des Textes, der getroffen hat: 0 = Position, danach Überschriften. */
  fundstelle: number;
  /** Andere Codes, die in derselben Fundstelle ebenfalls getroffen haben. */
  alternativen: Candidate[];
  /** Gleichstand zwischen verschiedenen Codes — Hauptwert ist dann nur der erste. */
  mehrdeutig: boolean;
}

interface Entry extends Candidate {
  wo: Wo;
  /** Zeilennummer in der Tabelle; entscheidet bei Gleichstand. */
  order: number;
}

/** Lernregeln zuerst, alles andere gleichrangig. */
function rank(entry: Entry): number {
  return entry.quelle === 'lernregel' ? 0 : 1;
}

/** Besser = kleiner. Quelle, dann Gewicht, Wortlänge, Tabellenreihenfolge. */
function compare(a: Entry, b: Entry): number {
  return (
    rank(a) - rank(b) ||
    b.gewicht - a.gewicht ||
    b.stichwort.length - a.stichwort.length ||
    a.order - b.order
  );
}

/** Gleichstand ohne die Tabellenreihenfolge. */
function tied(a: Entry, b: Entry): boolean {
  return (
    rank(a) === rank(b) && a.gewicht === b.gewicht && a.stichwort.length === b.stichwort.length
  );
}

function toCandidate(entry: Entry): Candidate {
  return {
    code: entry.code,
    stichwort: entry.stichwort,
    gewicht: entry.gewicht,
    quelle: entry.quelle,
  };
}

export class MappingIndex {
  private readonly byDimension = new Map<Dimension, Entry[]>();

  constructor(rows: readonly MappingRow[]) {
    rows.forEach((row, order) => {
      if (row.status === 'entwurf') return;
      const entries = this.byDimension.get(row.dimension) ?? [];
      entries.push({
        code: row.code,
        stichwort: row.stichwort,
        gewicht: row.gewicht,
        quelle: row.quelle,
        wo: row.wo,
        order,
      });
      this.byDimension.set(row.dimension, entries);
    });
  }

  /**
   * Gleicher Abgleich für jede Dimension. `texte` steht in Prioritätsreihenfolge
   * (Position, danach Überschriften von innen nach außen): der erste Text mit
   * einem Treffer entscheidet. Innerhalb dieses Textes gewinnt je Code das beste
   * Stichwort, über die Codes hinweg dieselbe Reihenfolge wie in `compare`.
   * Kein Treffer → null, kein Fehler.
   */
  match(dimension: Dimension, texte: readonly MatchText[]): DimensionMatch | null {
    const entries = this.byDimension.get(dimension);
    if (entries === undefined) return null;

    for (let fundstelle = 0; fundstelle < texte.length; fundstelle++) {
      const text = texte[fundstelle];
      const best = new Map<string, Entry>();
      for (const entry of entries) {
        const haystack = entry.wo === 'kurztext' ? text.kurztext : text.alle;
        if (!haystack.includes(entry.stichwort)) continue;
        const current = best.get(entry.code);
        if (current === undefined || compare(entry, current) < 0) best.set(entry.code, entry);
      }
      if (best.size === 0) continue;

      const [primary, ...rest] = [...best.values()].sort(compare);
      return {
        code: primary.code,
        stichwort: primary.stichwort,
        fundstelle,
        alternativen: rest.map(toCandidate),
        mehrdeutig: rest.some((other) => tied(primary, other)),
      };
    }
    return null;
  }

  /** Alle Stichworte einer Dimension, dedupliziert und längste zuerst. */
  vocabulary(dimension: Dimension): string[] {
    const words = new Set((this.byDimension.get(dimension) ?? []).map((e) => e.stichwort));
    return [...words].sort((a, b) => b.length - a.length);
  }
}

let bundled: MappingIndex | null = null;

/** Die mitgelieferte Mappingtabelle. */
export function getMapping(): MappingIndex {
  bundled ??= new MappingIndex(parseMappingCsv(mappingCsv));
  return bundled;
}
