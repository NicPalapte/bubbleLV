// Überschrift eines Knotens, wie sie in Tabelle und Überblick steht. Eine
// Stelle für beide: sonst hieße derselbe Abschnitt in der Treemap anders als
// in der Gruppenzeile der Tabelle, und niemand erkennt ihn wieder.

import type { LVNode } from '../../types/lvNode';

const KIND_PREFIX: Record<string, string> = { lot: 'LOS', section: '§' };

export function headingOf(node: LVNode): string {
  const title = node.label !== null && node.label !== '' ? node.label : 'Ohne Bezeichnung';
  if (node.code === '') return title;
  const prefix = KIND_PREFIX[node.kind];
  return `${prefix === undefined ? node.code : `${prefix} ${node.code}`} · ${title}`;
}
