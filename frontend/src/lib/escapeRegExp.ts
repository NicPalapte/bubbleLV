// Freitext wörtlich in eine RegExp setzen. Gemeinsam für die Suchhervorhebung
// (components/common/Highlighted.tsx) und die Materialstichworte
// (lib/classify/extractors/material.ts) — beide bauen Muster aus fremdem Text.

/** Maskiert alle Zeichen, die in einer RegExp eine Bedeutung haben. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
