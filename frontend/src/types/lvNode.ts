// Baumformat, das buildTree() aus LVDraft erzeugt (siehe
// docs/architecture/pipeline.md#in-memory-baum). Ein Contract für Tree-Spalte,
// Bubble-Graph und Tabelle.

import type { PositionType } from './lvDraft';

export type LVNodeKind = 'project' | 'lot' | 'section' | 'position';

export interface PositionSummary {
  oz: string;
  shortText: string;
  longText: string;
  unit: string | null;
  quantity: number | null;
  unitPrice: number | null;
  positionType: PositionType;
  attributes: Record<string, unknown>;
}

export interface LVNode {
  id: string;
  kind: LVNodeKind;
  /** Vollständige Nummer, z. B. die OZ „01.07.0010". */
  code: string;
  /**
   * Nummer der eigenen Ebene ohne den Präfix des Elternknotens („0010").
   * Der Graph beschriftet damit, weil dort die Hierarchie schon aus der Lage
   * hervorgeht (Issue #41); Baum und Tabelle zeigen weiter `code`.
   */
  ownCode: string;
  label: string | null;
  positionCount: number;
  totalPrice: number;
  children: LVNode[];
  position: PositionSummary | null;
}
