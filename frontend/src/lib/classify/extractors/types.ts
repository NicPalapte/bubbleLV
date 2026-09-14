// Gewerkeunabhängige Extraktoren (WP-J). Sie laufen **vor** den
// gewerkespezifischen Rulesets und liefern Merkmale, die in jedem Gewerk
// dieselbe Bedeutung haben — Normverweise, Maße, Material, offene
// Textergänzungen, Verweise, Fristen.
//
// Zwei Regeln gelten für alle:
//  - **Geschlossenes Vokabular als Wert, Fundstelle als Beleg.** Der Attributwert
//    ist ein kurzer, wiederkehrender Begriff ("Winterbau"), damit er als Facette
//    taugt; der Span trägt die tatsächlich gefundene Textstelle.
//  - **Kein Treffer ⇒ kein Key.** Ein leeres Array oder ein `null` würde im
//    Eigenschaften-Panel als Merkmal erscheinen, das es nicht gibt.
//
// Gearbeitet wird auf dem **Rohtext**: Spans sind Zeichen-Indizes im Langtext,
// und die normalisierte Fassung aus text.ts (kleingeschrieben, Leerraum
// zusammengezogen) hat andere Indizes. Die Muster tragen deshalb `i` und `\s+`
// statt sich auf Vornormalisierung zu verlassen.

import type { StlbLeistungsbereich } from '../stlbCatalog';
import type { NormalizedItem } from '../text';
import type { Span } from '../types';

export interface ExtractorContext {
  /** Rohtext des Kurztexts. */
  readonly shortText: string;
  /** Rohtext des Langtexts — Bezugspunkt aller Spans. */
  readonly longText: string;
  readonly unit: string | null;
  /** Kleingeschriebene Fassung für Stichwortvergleiche. */
  readonly text: NormalizedItem;
  /** Referenzkatalog; speist die materialbezogenen Stichworte. */
  readonly catalog: readonly StlbLeistungsbereich[];
}

export interface ExtractorResult {
  attributes: Record<string, unknown>;
  spans: Span[];
}

export interface Extractor {
  /** Stabile Kennung, zugleich der Attribut-Key, den der Extraktor liefert. */
  id: string;
  extract(context: ExtractorContext): ExtractorResult;
}

export const EMPTY_RESULT: ExtractorResult = { attributes: {}, spans: [] };
