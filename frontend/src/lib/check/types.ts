// Prüfregeln (WP-K). Was hier entsteht, sind **Hinweise, keine Urteile**
// (docs/domain/vob-pruefungen.md):
//  - jede Meldung zeigt die Fundstelle, nie nur eine Behauptung,
//  - jede Regel ist einzeln abschaltbar,
//  - Formulierung: „hier lohnt ein Blick", nicht „das ist unzulässig",
//  - fehlen Referenzdaten, greift die Regel nicht — das ist kein Fehler.
//
// Ergebnisse gehören **nicht** in `attributes`: ein Hinweis ist keine
// Eigenschaft der Position, sondern eine Bewertung (data-model.md#flag).

import type { Span } from '../classify';
import type { PositionIndex } from '../index/positionIndex';
import type { LVSummary } from '../index/summary';

export type FlagCategory = 'geld' | 'menge' | 'risiko' | 'norm' | 'frist' | 'vob';
export type FlagSeverity = 'hinweis' | 'beachten';

/** Ein Fund an einer Position. */
export interface Flag {
  /** Regel-ID, z. B. "V1". */
  id: string;
  category: FlagCategory;
  severity: FlagSeverity;
  /** Knoten-ID der Position — Sprungziel aus der Prüfliste. */
  positionId: string;
  /** Was gefunden wurde, in einem Halbsatz. */
  title: string;
  /** Fundstelle im Langtext, wo es eine gibt. */
  span?: Span;
}

/** Warum eine Regel nicht läuft. `null` = sie läuft. */
export type InactiveReason = string | null;

export interface CheckContext {
  index: PositionIndex;
  summary: LVSummary;
}

export interface CheckRule {
  /** Stabile ID, zugleich Schlüssel in docs/domain/reference/pruefregeln.csv. */
  id: string;
  /** Überschrift der Gruppe in der Prüfliste. */
  label: string;
  category: FlagCategory;
  severity: FlagSeverity;
  /** Was die Regel sucht und warum ein Blick lohnt — ein Satz, kein Urteil. */
  hint: string;
  /**
   * Prüffunktion. Fehlt sie, ist die Regel angemeldet, aber noch nicht
   * umgesetzt — sie erscheint in der Liste als inaktiv, statt still zu fehlen.
   */
  check?(context: CheckContext): Flag[];
  /**
   * Referenzdatei, ohne deren Inhalt die Regel nicht laufen kann. Enthält sie
   * nur die Kopfzeile, bleibt die Regel inaktiv — kein Fehler, nur ein
   * sichtbarer Grund in der Prüfliste.
   */
  requires?: {
    /** Pfad, wie ihn der Owner kennt. */
    file: string;
    /** Ob die Datei Zeilen enthält, mit denen die Regel arbeiten kann. */
    available(): boolean;
  };
}

/** Eine Regel mit ihrem Zustand für diesen Datensatz. */
export interface RuleStatus {
  id: string;
  label: string;
  category: FlagCategory;
  severity: FlagSeverity;
  hint: string;
  /** Norm-Verweis aus der Referenzdatei; leer, wenn es keinen gibt. */
  ruleRef: string;
  /**
   * `true`, sobald der Owner den Norm-Verweis bestätigt hat. Solange `false`,
   * zeigt die Oberfläche den Verweis ausdrücklich als „zu bestätigen" —
   * Bubble behauptet keine Fundstelle in der Norm, die niemand geprüft hat
   * (docs/domain/vob-pruefungen.md#was-der-owner-bestätigen-muss).
   */
  refConfirmed: boolean;
  active: boolean;
  inactiveReason: InactiveReason;
  /** Anzahl der Funde dieser Regel im geladenen LV. */
  count: number;
}

export interface CheckResult {
  /** Alle Funde, nach Regel und Dokumentreihenfolge sortiert. */
  flags: Flag[];
  /** Jede angemeldete Regel mit ihrem Zustand — auch die inaktiven. */
  rules: RuleStatus[];
}

export const EMPTY_CHECK_RESULT: CheckResult = { flags: [], rules: [] };
