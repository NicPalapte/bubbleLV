// Regelbasierter Klassifizierer — einzige Implementierung des Classifier-Interfaces
// im MVP. Orchestriert die Stufen aus docs/architecture/pipeline.md:
//   Stufe 0 StlbMatch → Extraktoren → Stufe 1 Bauteiltyp → Stufe 2 RulesetRegistry.
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
  getStlbCatalog,
  matchStlb,
  type StlbLeistungsbereich,
  type StlbMatch,
} from './stlbCatalog';
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

/**
 * Leistungsbereich aus den Überschriften der übergeordneten Abschnitte. In
 * realen LVs steht das Gewerk regelmäßig nur dort ("Titel 02 Erdarbeiten") und
 * nicht in jeder Positionszeile — ohne diesen Rückgriff bliebe die Hälfte eines
 * LV ohne Gewerk, obwohl die Datei es sagt.
 *
 * Die nächstgelegene Überschrift gewinnt: sie beschreibt die Position genauer
 * als das Los darüber. Es wird nichts erfunden — gesucht wird mit demselben
 * Katalog wie im Positionstext, eine Überschrift ohne LB-Treffer liefert nichts.
 */
function matchHeadings(
  headings: readonly string[],
  catalog: StlbLeistungsbereich[],
): StlbMatch | null {
  for (const heading of headings) {
    const hit = matchStlb(normalize(heading), catalog);
    if (hit !== null) return hit;
  }
  return null;
}

/**
 * Ein LB-Treffer ohne `positionsart_default` gilt laut Katalog vorläufig als
 * "bauteil" — die Heuristik darf aber weiterhin eine eindeutig nicht-physische
 * Position (Stundenlohn, Planung) aus diesem LB herausziehen.
 */
function refineWithLbHit(text: NormalizedItem): Positionsart {
  const heuristic = detectPositionsart(text);
  return heuristic === 'sonstige' ? 'bauteil' : heuristic;
}

export interface RuleBasedOptions {
  /** Referenzkatalog; Standard ist der mitgelieferte STLB-Bau-Katalog. */
  catalog?: StlbLeistungsbereich[];
  registry?: RulesetRegistry;
}

export class RuleBasedClassifier implements Classifier {
  private readonly catalog: StlbLeistungsbereich[];
  private readonly registry: RulesetRegistry;

  constructor(options: RuleBasedOptions = {}) {
    this.catalog = options.catalog ?? getStlbCatalog();
    this.registry = options.registry ?? createDefaultRegistry();
  }

  classify(item: ClassifierInput): ClassificationResult {
    const text = normalizeItem(item);

    // ── Stufe 0: Leistungsbereich aus dem Referenzkatalog. Zuerst der
    //    Positionstext, danach die Überschriften darüber.
    const own = matchStlb(text.all, this.catalog);
    const inherited = own === null ? matchHeadings(item.headings ?? [], this.catalog) : null;
    const match = own ?? inherited;
    const gewerkQuelle: GewerkQuelle | null =
      own !== null ? 'position' : inherited !== null ? 'abschnitt' : null;
    const gewerkLb = match === null ? null : match.lb.lbNummer;
    const gewerk = match === null ? null : match.lb.lbBezeichnung;
    // Die Positionsart verfeinert nur ein Treffer **im Positionstext**: dass
    // eine Position unter „Betonarbeiten" steht, macht sie noch nicht zum
    // Bauteil (dort stehen auch Vorhaltung und Stundenlohn).
    const positionsart: Positionsart =
      match?.lb.positionsartDefault ??
      (own === null ? detectPositionsart(text) : refineWithLbHit(text));

    // ── Gewerkeunabhängige Extraktoren: Normen, Maße, Material, Platzhalter,
    //    Verweise, Fristen — samt Fundstelle im Langtext.
    const extractorContext: ExtractorContext = {
      shortText: item.shortText,
      longText: item.longText,
      unit: item.unit,
      text,
      catalog: this.catalog,
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
      };
      return this.result(
        { ...attributes, ...ruleset.extract(context) },
        ruleset.id,
        generic.spans,
        gewerkQuelle,
      );
    }

    // ── Stufe 1 + 2: Bauteiltyp bestimmen, passendes Ruleset auflösen.
    const bauteiltyp = detectBauteiltyp(text);
    const ruleset = this.registry.resolve(bauteiltyp, gewerkLb);
    const context: RulesetContext = { item, text, bauteiltyp, gewerkLb, positionsart };
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
