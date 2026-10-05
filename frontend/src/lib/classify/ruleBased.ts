// Regelbasierter Klassifizierer — einzige Implementierung des Classifier-Interfaces
// im MVP. Orchestriert die Stufen aus docs/architecture/pipeline.md:
//   Stufe 0 Leistungsbereich → Extraktoren → Stufe 1 Bauteiltyp → Stufe 2 RulesetRegistry.
// Alle Stichwort-Zuordnungen laufen über die Mappingtabelle (mapping.ts).
// Nach außen bleibt das ein einziger, synchroner, deterministischer Aufruf.
//
// Die gewerkeunabhängigen Extraktoren (WP-J) laufen **vor** den Rulesets: ein
// Normverweis oder ein Maß bedeutet in jedem Gewerk dasselbe. Ein Ruleset darf
// ihr Ergebnis überschreiben (es weiß mehr über sein Gewerk), aber nie löschen —
// deshalb stehen die Extraktor-Attribute links vom Spread des Rulesets.

import { detectBauteiltyp } from './bauteiltyp';
import { runExtractors, type ExtractorContext } from './extractors';
import { extractKeywords } from './keywords';
import { detectPositionsart } from './positionsart';
import { createDefaultRegistry, RulesetRegistry } from './rulesets/registry';
import type { RulesetContext } from './rulesets/types';
import {
  getMapping,
  matchTextOf,
  matchTextOfHeading,
  type DimensionMatch,
  type MappingIndex,
} from './mapping';
import { getStlbCatalog, type StlbLeistungsbereich } from './stlbCatalog';
import { normalize, normalizeItem, type NormalizedItem } from './text';
import type {
  Classifier,
  ClassificationResult,
  ClassifierInput,
  GewerkQuelle,
  Positionsart,
  Span,
} from './types';

const CLASSIFIER_ID = 'rule';
const VERSION = 1;

interface LeistungsbereichTreffer {
  lb: StlbLeistungsbereich;
  match: DimensionMatch;
}

/**
 * Leistungsbereich: zuerst der Positionstext, danach die Überschriften der
 * übergeordneten Abschnitte. In realen LVs steht das Gewerk regelmäßig nur dort
 * ("Titel 02 Erdarbeiten") und nicht in jeder Positionszeile — ohne diesen Rückgriff
 * bliebe die Hälfte eines LV ohne Gewerk, obwohl die Datei es sagt.
 *
 * Die nächstgelegene Überschrift gewinnt: sie beschreibt die Position genauer
 * als das Los darüber. Es wird nichts erfunden — eine Überschrift ohne Treffer
 * liefert nichts, und ein Code, der nicht im Katalog steht, hat keine Bezeichnung.
 */
function matchLeistungsbereich(
  text: NormalizedItem,
  headings: readonly string[],
  mapping: MappingIndex,
  catalog: ReadonlyMap<string, StlbLeistungsbereich>,
): LeistungsbereichTreffer | null {
  const texte = [matchTextOf(text), ...headings.map((h) => matchTextOfHeading(normalize(h)))];
  const match = mapping.match('leistungsbereich', texte);
  const lb = match === null ? undefined : catalog.get(match.code);
  return match === null || lb === undefined ? null : { lb, match };
}

/**
 * Ein LB-Treffer im Positionstext gilt vorläufig als "bauteil" — die Heuristik darf
 * aber weiterhin eine eindeutig nicht-physische Position (Stundenlohn, Planung)
 * aus diesem LB herausziehen.
 */
function refineWithLbHit(text: NormalizedItem, mapping: MappingIndex): Positionsart {
  const heuristic = detectPositionsart(text, mapping);
  return heuristic === 'sonstige' ? 'bauteil' : heuristic;
}

export interface RuleBasedOptions {
  /** Referenzkatalog; Standard ist der mitgelieferte STLB-Bau-Katalog. */
  catalog?: StlbLeistungsbereich[];
  /** Mappingtabelle; Standard ist die mitgelieferte `zuordnung.csv`. */
  mapping?: MappingIndex;
  registry?: RulesetRegistry;
}

export class RuleBasedClassifier implements Classifier {
  private readonly catalog: ReadonlyMap<string, StlbLeistungsbereich>;
  private readonly mapping: MappingIndex;
  private readonly registry: RulesetRegistry;

  constructor(options: RuleBasedOptions = {}) {
    const catalog = options.catalog ?? getStlbCatalog();
    this.catalog = new Map(catalog.map((lb) => [lb.lbNummer, lb]));
    this.mapping = options.mapping ?? getMapping();
    this.registry = options.registry ?? createDefaultRegistry();
  }

  classify(item: ClassifierInput): ClassificationResult {
    const text = normalizeItem(item);

    // ── Stufe 0: Leistungsbereich über die Mappingtabelle. Zuerst der
    //    Positionstext, danach die Überschriften darüber.
    const lbHit = matchLeistungsbereich(text, item.headings ?? [], this.mapping, this.catalog);
    const own = lbHit !== null && lbHit.match.fundstelle === 0;
    const gewerkQuelle: GewerkQuelle | null =
      lbHit === null ? null : own ? 'position' : 'abschnitt';
    const gewerkLb = lbHit === null ? null : lbHit.lb.lbNummer;
    const gewerk = lbHit === null ? null : lbHit.lb.lbBezeichnung;
    // Die Positionsart verfeinert nur ein Treffer **im Positionstext**: dass
    // eine Position unter „Betonarbeiten" steht, macht sie noch nicht zum
    // Bauteil (dort stehen auch Vorhaltung und Stundenlohn).
    const positionsart: Positionsart = own
      ? refineWithLbHit(text, this.mapping)
      : detectPositionsart(text, this.mapping);

    // ── Gewerkeunabhängige Extraktoren: Normen, Maße, Material, Platzhalter,
    //    Verweise, Fristen — samt Fundstelle im Langtext.
    const extractorContext: ExtractorContext = {
      shortText: item.shortText,
      longText: item.longText,
      unit: item.unit,
      text,
      mapping: this.mapping,
    };
    const generic = runExtractors(extractorContext);

    const attributes: Record<string, unknown> = {
      positionsart,
      gewerkLb,
      gewerk,
      keywords: extractKeywords(text),
      ...generic.attributes,
    };

    // ── Nicht-Bauteil: eigenes, kleineres Schema — kein bauteiltyp/beton/tragend.
    if (positionsart !== 'bauteil') {
      const ruleset = this.registry.resolveByPositionsart(positionsart);
      const context: RulesetContext = {
        item,
        text,
        bauteiltyp: null,
        gewerkLb,
        positionsart,
        mapping: this.mapping,
      };
      return this.result(
        { ...attributes, ...ruleset.extract(context) },
        ruleset.id,
        generic.spans,
        gewerkQuelle,
      );
    }

    // ── Stufe 1 + 2: Bauteiltyp bestimmen, passendes Ruleset auflösen.
    const bauteiltyp = detectBauteiltyp(text, this.mapping);
    const ruleset = this.registry.resolve(bauteiltyp, gewerkLb);
    const context: RulesetContext = {
      item,
      text,
      bauteiltyp,
      gewerkLb,
      positionsart,
      mapping: this.mapping,
    };
    return this.result(
      { ...attributes, bauteiltyp, ...ruleset.extract(context) },
      ruleset.id,
      generic.spans,
      gewerkQuelle,
    );
  }

  private result(
    attributes: Record<string, unknown>,
    rulesetId: string,
    spans: Span[],
    gewerkQuelle: GewerkQuelle | null,
  ): ClassificationResult {
    return {
      attributes,
      meta: {
        classifier: CLASSIFIER_ID,
        ruleset: rulesetId,
        version: VERSION,
        confidence: 1.0,
        gewerkQuelle,
      },
      spans,
    };
  }
}
