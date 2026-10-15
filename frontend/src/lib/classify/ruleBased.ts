// Regelbasierter Klassifizierer — einzige Implementierung des Classifier-Interfaces
// im MVP. Orchestriert die Stufen aus docs/architecture/pipeline.md:
//   Extraktoren → Positionsart → Bauteiltyp → Ruleset.
// Nach außen bleibt das ein einziger, synchroner, deterministischer Aufruf.
//
// Kein Leistungsbereich (Entscheidung 0044): ohne gepflegten Katalog traf der
// Abgleich fast nichts. Was gilt, steht im Text der Position.
//
// Die Extraktoren (WP-J) laufen **vor** den Rulesets. Ein Ruleset darf ihr
// Ergebnis überschreiben, aber nie löschen — deshalb stehen die
// Extraktor-Attribute links vom Spread des Rulesets.

import { detectBauteiltyp } from './bauteiltyp';
import { runExtractors, type ExtractorContext } from './extractors';
import { extractKeywords } from './keywords';
import { detectPositionsart } from './positionsart';
import { createDefaultRegistry, RulesetRegistry } from './rulesets/registry';
import type { RulesetContext } from './rulesets/types';
import { normalizeItem } from './text';
import type {
  Classifier,
  ClassificationResult,
  ClassifierInput,
  Positionsart,
  Span,
} from './types';

const CLASSIFIER_ID = 'rule';
const VERSION = 2;

export interface RuleBasedOptions {
  registry?: RulesetRegistry;
}

export class RuleBasedClassifier implements Classifier {
  private readonly registry: RulesetRegistry;

  constructor(options: RuleBasedOptions = {}) {
    this.registry = options.registry ?? createDefaultRegistry();
  }

  classify(item: ClassifierInput): ClassificationResult {
    const text = normalizeItem(item);
    const positionsart: Positionsart = detectPositionsart(text);

    // ── Extraktoren: Normen, Maße, Platzhalter, Verweise, Fristen — samt
    //    Fundstelle im Langtext.
    const extractorContext: ExtractorContext = {
      shortText: item.shortText,
      longText: item.longText,
      unit: item.unit,
      inputFields: item.inputFields,
      text,
    };
    const generic = runExtractors(extractorContext);

    const attributes: Record<string, unknown> = {
      positionsart,
      keywords: extractKeywords(text),
      ...generic.attributes,
    };

    // ── Nicht-Bauteil: eigenes, kleineres Schema — kein bauteiltyp.
    if (positionsart !== 'bauteil') {
      const ruleset = this.registry.resolveByPositionsart(positionsart);
      const context: RulesetContext = { item, text, bauteiltyp: null, positionsart };
      return this.result({ ...attributes, ...ruleset.extract(context) }, ruleset.id, generic.spans);
    }

    const bauteiltyp = detectBauteiltyp(text);
    const ruleset = this.registry.resolveBauteil();
    const context: RulesetContext = { item, text, bauteiltyp, positionsart };
    return this.result(
      { ...attributes, bauteiltyp, ...ruleset.extract(context) },
      ruleset.id,
      generic.spans,
    );
  }

  private result(
    attributes: Record<string, unknown>,
    rulesetId: string,
    spans: Span[],
  ): ClassificationResult {
    return {
      attributes,
      meta: { classifier: CLASSIFIER_ID, ruleset: rulesetId, version: VERSION, confidence: 1.0 },
      spans,
    };
  }
}
