// Regelbasierter Klassifizierer — einzige Implementierung des Classifier-Interfaces
// im MVP. Orchestriert die drei Stufen aus docs/architecture/pipeline.md:
//   Stufe 0 StlbMatch → Stufe 1 Bauteiltyp → Stufe 2 RulesetRegistry.
// Nach außen bleibt das ein einziger, synchroner, deterministischer Aufruf.

import { detectBauteiltyp } from './bauteiltyp';
import { extractKeywords } from './keywords';
import { detectPositionsart } from './positionsart';
import { createDefaultRegistry, RulesetRegistry } from './rulesets/registry';
import type { RulesetContext } from './rulesets/types';
import { getStlbCatalog, matchStlb, type StlbLeistungsbereich } from './stlbCatalog';
import { normalizeItem, type NormalizedItem } from './text';
import type { Classifier, ClassificationResult, ClassifierInput, Positionsart } from './types';

const CLASSIFIER_ID = 'rule';
const VERSION = 1;

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

    // ── Stufe 0: Leistungsbereich aus dem Referenzkatalog, sonst Heuristik.
    const match = matchStlb(text.all, this.catalog);
    const gewerkLb = match === null ? null : match.lb.lbNummer;
    const gewerk = match === null ? null : match.lb.lbBezeichnung;
    const positionsart: Positionsart =
      match?.lb.positionsartDefault ??
      (match === null ? detectPositionsart(text) : refineWithLbHit(text));

    const attributes: Record<string, unknown> = {
      positionsart,
      gewerkLb,
      gewerk,
      keywords: extractKeywords(text),
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
      return this.result({ ...attributes, ...ruleset.extract(context) }, ruleset.id);
    }

    // ── Stufe 1 + 2: Bauteiltyp bestimmen, passendes Ruleset auflösen.
    const bauteiltyp = detectBauteiltyp(text);
    const ruleset = this.registry.resolve(bauteiltyp, gewerkLb);
    const context: RulesetContext = { item, text, bauteiltyp, gewerkLb, positionsart };
    return this.result(
      { ...attributes, bauteiltyp, ...ruleset.extract(context) },
      ruleset.id,
    );
  }

  private result(attributes: Record<string, unknown>, rulesetId: string): ClassificationResult {
    return {
      attributes,
      meta: {
        classifier: CLASSIFIER_ID,
        ruleset: rulesetId,
        version: VERSION,
        confidence: 1.0,
      },
    };
  }
}
