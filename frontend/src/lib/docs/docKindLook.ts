// Anzeige der Dokumentart (Entscheidung 0096): Name und Punktfarbe je Art.

import { DOC_KIND_LABEL, type DocKind } from '@core';

/** Punktfarbe je Art; verwandte Arten teilen eine Farbe. */
const DOT: Readonly<Record<DocKind, string>> = {
  baubeschreibung: 'var(--dot-1)',
  vorbemerkungen: 'var(--dot-1)',
  'anhang-baubeschreibung': 'var(--dot-1)',
  vertrag: 'var(--dot-2)',
  formblatt: 'var(--dot-2)',
  lv: 'var(--dot-3)',
  gutachten: 'var(--dot-4)',
  plan: 'var(--dot-6)',
  terminplan: 'var(--dot-7)',
  aia: 'var(--dot-8)',
  bap: 'var(--dot-8)',
  foto: 'var(--dot-9)',
  sonstiges: 'var(--dot-10)',
};

export const NOT_FOUND_LABEL = 'Nicht erkannt';

export function kindDot(kind: DocKind | null): string {
  return kind === null ? 'var(--amber)' : DOT[kind];
}

export function kindLabel(kind: DocKind | null): string {
  return kind === null ? NOT_FOUND_LABEL : DOC_KIND_LABEL[kind];
}
