// Prüfregeln (WP-K), seit Entscheidung 0085 Regeln im Format `bubble-rule-v1` mit der
// Wirkung „Prüfhinweis“ (docs/domain/reference/regeln.json). Was hier entsteht, sind **Hinweise, keine Urteile**
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
import type { LVNode } from '../../types/lvNode';

export type FlagCategory = 'geld' | 'menge' | 'risiko' | 'norm' | 'frist' | 'vob';
export type FlagSeverity = 'hinweis' | 'beachten';

/** Ein Fund an einer Position. */
export interface Flag {
  /** Kennung der Regel, z. B. „v1-bedarfsposition“. */
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
  /** Elternknoten je Knoten-ID — für Regeln, die im Hauptabschnitt suchen (M1). */
  parents: ReadonlyMap<string, LVNode | null>;
}

/** Was eine eingebaute Logik je Position meldet; den Rest setzt `runChecks`. */
export type Fund = Pick<Flag, 'title' | 'span'>;

/** Eine Regel mit ihrem Zustand für diesen Datensatz. */
export interface RuleStatus {
  /** Kennung der Regel (`bubble-rule-v1`), z. B. „v1-bedarfsposition“. */
  id: string;
  /** Kurzzeichen für die Liste, z. B. „V1“; leer bei Regeln ohne. */
  code: string;
  label: string;
  category: FlagCategory;
  severity: FlagSeverity;
  hint: string;
  /** Norm-Verweis aus der Regel; leer, wenn es keinen gibt. */
  ruleRef: string;
  /**
   * `true`, sobald der Owner den Norm-Verweis bestätigt hat. Solange `false`,
   * zeigt die Oberfläche den Verweis ausdrücklich als „zu bestätigen" —
   * Conocto behauptet keine Fundstelle in der Norm, die niemand geprüft hat
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
