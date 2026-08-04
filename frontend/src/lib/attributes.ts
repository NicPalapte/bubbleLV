// Typsichere Lesezugriffe auf `PositionSummary.attributes`. Die Klassifizierung
// liefert bewusst ein offenes Record (neue Rulesets bringen neue Keys mit), die UI
// braucht daraus aber verlässliche Strings.

import type { ClassificationMeta } from './classify';
import type { PositionSummary } from '../types/lvNode';

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
  return {
    classifier: record.classifier,
    ruleset: record.ruleset,
    version: typeof record.version === 'number' ? record.version : 0,
    confidence: typeof record.confidence === 'number' ? record.confidence : 0,
  };
}

/** Fachliche Attribute in Anzeigereihenfolge, ohne `_meta` und ohne Leerwerte. */
export function displayAttributes(position: PositionSummary): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(position.attributes)) {
    if (key === '_meta') continue;
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
