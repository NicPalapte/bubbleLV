// Referenzdaten der Prüfregeln. Alles Normative kommt aus gepflegten CSV unter
// docs/domain/reference/ — nichts davon steht im Code
// (docs/domain/vob-pruefungen.md#ablage-der-referenzdaten). Enthält eine Datei
// nur die Kopfzeile, bleibt die zugehörige Regel inaktiv: kein Fehler, nur ein
// sichtbarer Hinweis in der Prüfliste.

import herstellerCsv from './data/hersteller-produktnamen.csv?raw';
import regelnCsv from './data/pruefregeln.csv?raw';
import risikoCsv from './data/risiko-formulierungen.csv?raw';
import nebenleistungenCsv from './data/vob-nebenleistungen.csv?raw';
import { parseCsv } from '../csv';

/** Status einer Regel laut Referenzdatei. */
export type RegelStatus = 'bestaetigt' | 'zu_bestaetigen' | 'aus';

export interface RegelEintrag {
  id: string;
  status: RegelStatus;
  normVerweis: string;
}

function toStatus(raw: string): RegelStatus {
  const value = raw.trim().toLowerCase();
  if (value === 'bestaetigt' || value === 'bestätigt') return 'bestaetigt';
  if (value === 'aus') return 'aus';
  // Unbekannt oder leer heißt: noch nicht bestätigt. Die vorsichtige Annahme.
  return 'zu_bestaetigen';
}

let regeln: Map<string, RegelEintrag> | null = null;

/** Regel-Stammdaten je ID; fehlt eine ID, gibt es keinen Eintrag. */
export function regelEintrag(id: string): RegelEintrag | undefined {
  regeln ??= new Map(
    parseCsv(regelnCsv)
      .map((row): RegelEintrag => ({
        id: row.get('regel_id'),
        status: toStatus(row.get('status')),
        normVerweis: row.get('norm_verweis'),
      }))
      .filter((entry) => entry.id !== '')
      .map((entry) => [entry.id, entry]),
  );
  return regeln.get(id);
}

export interface RisikoFormulierung {
  /** Wortlaut, kleingeschrieben — so wie er im Text gesucht wird. */
  text: string;
  regelId: string;
  schweregrad: 'hinweis' | 'beachten';
}

let risiko: RisikoFormulierung[] | null = null;

/** Formulierungen, die ein Risiko auf den AN schieben (V4). */
export function risikoFormulierungen(): RisikoFormulierung[] {
  risiko ??= parseCsv(risikoCsv)
    .map((row): RisikoFormulierung => ({
      text: row.get('formulierung').toLowerCase(),
      regelId: row.get('regel_id'),
      schweregrad: row.get('schweregrad').toLowerCase() === 'hinweis' ? 'hinweis' : 'beachten',
    }))
    .filter((entry) => entry.text !== '');
  return risiko;
}

/** Hersteller-/Produktnamen (V3) — leer, solange niemand sie gepflegt hat. */
export function herstellerNamen(): string[] {
  return parseCsv(herstellerCsv)
    .map((row) => row.get('name'))
    .filter((name) => name !== '');
}

/** Nebenleistungen je ATV (V8) — leer, solange niemand sie gepflegt hat. */
export function nebenleistungen(): string[] {
  return parseCsv(nebenleistungenCsv)
    .map((row) => row.get('leistungstext'))
    .filter((text) => text !== '');
}
