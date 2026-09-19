// Typsichere Lesezugriffe auf `PositionSummary.attributes`. Die Klassifizierung
// liefert bewusst ein offenes Record (neue Rulesets bringen neue Keys mit), die UI
// braucht daraus aber verlässliche Strings.

import type { ClassificationMeta, GewerkQuelle, Span } from './classify';
import type { PositionSummary } from '../types/lvNode';

/** Reservierte Keys: Provenance und Fundstellen, nie eine Facette. */
const RESERVED_KEYS: ReadonlySet<string> = new Set(['_meta', '_spans']);

/**
 * Anzeigenamen der Klassifizierungs-Attribute. Sie stehen hier und nicht in
 * einer Komponente, weil inzwischen mehrere Ansichten sie brauchen:
 * Eigenschaften-Panel, Positionskarte im Graphen und die Merkmalslisten der
 * Ansicht „Ähnlichkeit" (WP-M).
 */
const ATTRIBUTE_LABELS: Record<string, string> = {
  positionsart: 'Positionsart',
  gewerk: 'Gewerk',
  gewerkLb: 'Leistungsbereich (STLB-Bau)',
  bauteiltyp: 'Bauteiltyp',
  beton: 'Druckfestigkeit',
  expo: 'Expositionsklassen',
  feuchtigkeitsklasse: 'Feuchtigkeitsklasse',
  tragend: 'Tragend',
  dicke: 'Dicke',
  hoehe: 'Höhe',
  laenge: 'Länge',
  gewicht: 'Gewicht',
  steinart: 'Steinart',
  keywords: 'Besonderheiten',
  normen: 'Normen',
  material: 'Material',
  verweise: 'Verweise',
  fristen: 'Zeitbezug',
  platzhalter: 'Offene Stellen',
  platzhalterAnzahl: 'Anzahl offener Stellen',
  qualifikation: 'Qualifikation',
  zeiteinheit: 'Zeiteinheit',
  planungsart: 'Planungsart',
  einrichtungsart: 'Art der Einrichtung',
  // Keine Attribute, sondern Felder der Position — die Merkmalsvergleiche der
  // Ansicht „Ähnlichkeit" behandeln sie wie Merkmale (lib/relate/similarity.ts).
  einheit: 'Einheit',
  positionstyp: 'Positionstyp',
  kurztext: 'Kurztext',
};

/** Anzeigename eines Attribut-Keys; unbekannte Keys stehen unverändert da. */
export function attributeLabel(key: string): string {
  return ATTRIBUTE_LABELS[key] ?? key;
}

export function attrString(attributes: Record<string, unknown>, key: string): string | null {
  const value = attributes[key];
  if (typeof value === 'string') return value === '' ? null : value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'ja' : 'nein';
  return null;
}

export function attrStrings(attributes: Record<string, unknown>, key: string): string[] {
  const value = attributes[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry !== '');
}

export function attrBoolean(attributes: Record<string, unknown>, key: string): boolean | null {
  const value = attributes[key];
  return typeof value === 'boolean' ? value : null;
}

/** Provenance-Block; von den Facetten ignoriert (docs/architecture/data-model.md). */
export function attrMeta(attributes: Record<string, unknown>): ClassificationMeta | null {
  const meta = attributes._meta;
  if (meta === null || typeof meta !== 'object') return null;
  const record = meta as Record<string, unknown>;
  if (typeof record.classifier !== 'string' || typeof record.ruleset !== 'string') return null;
  const quelle = record.gewerkQuelle;
  return {
    classifier: record.classifier,
    ruleset: record.ruleset,
    version: typeof record.version === 'number' ? record.version : 0,
    confidence: typeof record.confidence === 'number' ? record.confidence : 0,
    gewerkQuelle: quelle === 'position' || quelle === 'abschnitt' ? (quelle as GewerkQuelle) : null,
  };
}

/**
 * Fundstellen im Langtext (docs/architecture/data-model.md#spans). Fremde oder
 * unvollständige Einträge werden verworfen statt geraten — `attributes` ist ein
 * offenes Record und kann alles enthalten.
 */
export function attrSpans(attributes: Record<string, unknown>): Span[] {
  const value = attributes._spans;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Span => {
    if (entry === null || typeof entry !== 'object') return false;
    const span = entry as Record<string, unknown>;
    return (
      typeof span.key === 'string' &&
      typeof span.label === 'string' &&
      typeof span.start === 'number' &&
      typeof span.end === 'number' &&
      span.end > span.start
    );
  });
}

/** Fachliche Attribute in Anzeigereihenfolge, ohne reservierte Keys und Leerwerte. */
export function displayAttributes(position: PositionSummary): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(position.attributes)) {
    if (RESERVED_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      const list = value.filter((entry): entry is string => typeof entry === 'string');
      if (list.length > 0) out.push([key, list.join(' · ')]);
      continue;
    }
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'boolean') out.push([key, value ? 'ja' : 'nein']);
    else if (typeof value === 'string' || typeof value === 'number') out.push([key, String(value)]);
  }
  return out;
}
