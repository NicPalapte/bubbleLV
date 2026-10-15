// Referenzdaten der Prüfregeln. Alles Normative kommt aus gepflegten CSV unter
// docs/domain/reference/ — nichts davon steht im Code
// (docs/domain/vob-pruefungen.md#ablage-der-referenzdaten). Enthält eine Datei
// nur die Kopfzeile, bleibt die zugehörige Regel inaktiv: kein Fehler, nur ein
// sichtbarer Hinweis in der Prüfliste.

import herstellerCsv from '@reference/hersteller-produktnamen.csv?raw';
import parameterCsv from '@reference/pruefregeln-parameter.csv?raw';
import stichworteCsv from '@reference/pruefregeln-stichworte.csv?raw';
import regelnCsv from '@reference/pruefregeln.csv?raw';
import risikoCsv from '@reference/risiko-formulierungen.csv?raw';
import nebenleistungenCsv from '@reference/vob-nebenleistungen.csv?raw';
import { parseCsv } from '../csv';
import {
  compileAusser,
  compileStichworte,
  splitStichworte,
  stichwortQuelle,
  WORD_CHAR,
} from '../classify/material/stichwort';
import type { FlagCategory, FlagSeverity } from './types';

/** Status einer Regel laut Referenzdatei. */
export type RegelStatus = 'bestaetigt' | 'zu_bestaetigen' | 'aus';

export interface RegelEintrag {
  id: string;
  status: RegelStatus;
  normVerweis: string;
  /** Überschrift in der Prüfliste. */
  name: string;
  /** Ein Satz: was die Regel sucht und warum ein Blick lohnt. */
  hinweis: string;
  /** `null`, wenn die Zelle leer oder unbekannt ist — dann bleibt die Regel inaktiv. */
  kategorie: FlagCategory | null;
  schwere: FlagSeverity | null;
}

const KATEGORIEN: readonly FlagCategory[] = ['geld', 'menge', 'risiko', 'norm', 'frist', 'vob'];

function toKategorie(raw: string): FlagCategory | null {
  const value = raw.trim().toLowerCase();
  return KATEGORIEN.find((kategorie) => kategorie === value) ?? null;
}

function toSchwere(raw: string): FlagSeverity | null {
  const value = raw.trim().toLowerCase();
  return value === 'hinweis' || value === 'beachten' ? value : null;
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
        name: row.get('name'),
        hinweis: row.get('hinweis'),
        kategorie: toKategorie(row.get('kategorie')),
        schwere: toSchwere(row.get('schwere')),
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

export interface HerstellerMuster {
  /** Name je Gruppe: Gruppe `i + 1` des Musters gehört zu `namen[i]`. */
  namen: readonly string[];
  /** Alle Namen und Produktnamen in einem Muster (global, mit Wortgrenzen). */
  pattern: RegExp;
}

let hersteller: HerstellerMuster | null = null;

/**
 * Hersteller-/Produktnamen (V3) als **ein** Suchmuster: ein Durchlauf je Text
 * statt einer pro Zeile der Tabelle. `null`, solange niemand sie gepflegt hat.
 */
export function herstellerMuster(): HerstellerMuster | null {
  if (hersteller !== null) return hersteller.namen.length > 0 ? hersteller : null;
  const namen: string[] = [];
  const gruppen: string[] = [];
  for (const row of parseCsv(herstellerCsv)) {
    const name = row.get('name');
    const quelle = stichwortQuelle([name, ...splitStichworte(row.get('stichworte'))]);
    if (name === '' || quelle === null) continue;
    namen.push(name);
    gruppen.push(`(${quelle})`);
  }
  hersteller = {
    namen,
    pattern: new RegExp(`(?<!${WORD_CHAR})(?:${gruppen.join('|')})(?!${WORD_CHAR})`, 'giu'),
  };
  return namen.length > 0 ? hersteller : null;
}

/** Nebenleistungen je ATV (V8) — leer, solange niemand sie gepflegt hat. */
export function nebenleistungen(): string[] {
  return parseCsv(nebenleistungenCsv)
    .map((row) => row.get('leistungstext'))
    .filter((text) => text !== '');
}

// ── Parameter und Stichworte je Regel ───────────────────────────────────────

const PARAMETER_DATEI = 'docs/domain/reference/pruefregeln-parameter.csv';

let parameter: Map<string, string> | null = null;

/** Rohwert eines Parameters; `undefined`, wenn die Zeile fehlt oder leer ist. */
export function regelParameter(id: string, name: string): string | undefined {
  parameter ??= new Map(
    parseCsv(parameterCsv)
      .filter((row) => row.get('regel_id') !== '' && row.get('wert') !== '')
      .map((row) => [`${row.get('regel_id')}/${row.get('parameter')}`, row.get('wert')]),
  );
  return parameter.get(`${id}/${name}`);
}

/**
 * Ein Parameter als Zahl, deutsch oder englisch geschrieben („1,5" = „1.5").
 * Wirft, wenn er fehlt — die Regel erscheint dann als inaktiv mit diesem Grund.
 */
export function regelZahl(id: string, name: string): number {
  const roh = regelParameter(id, name);
  const zahl = roh === undefined ? NaN : Number(roh.replace(',', '.'));
  if (!Number.isFinite(zahl)) {
    throw new Error(`Parameter „${name}" für ${id} fehlt in ${PARAMETER_DATEI}.`);
  }
  return zahl;
}

/** Ein Parameter als Text; wirft wie `regelZahl`, wenn er fehlt. */
export function regelText(id: string, name: string): string {
  const roh = regelParameter(id, name);
  if (roh === undefined) {
    throw new Error(`Parameter „${name}" für ${id} fehlt in ${PARAMETER_DATEI}.`);
  }
  return roh;
}

export interface RegelStichwort {
  /** Was gefunden wurde, z. B. „Gutachten". */
  wert: string;
  /** Die Stichworte der Zelle, wie sie in der Tabelle stehen. */
  stichworte: readonly string[];
  /** Global, mit Wortgrenzen (classify/material/stichwort.ts). */
  pattern: RegExp;
  ausser: RegExp | null;
}

let stichworte: (RegelStichwort & { regelId: string })[] | null = null;

/** Stichwort-Zeilen einer Regel aus pruefregeln-stichworte.csv, in Tabellenfolge. */
export function regelStichworte(id: string): RegelStichwort[] {
  stichworte ??= parseCsv(stichworteCsv).flatMap((row) => {
    const liste = splitStichworte(row.get('stichworte'));
    const pattern = compileStichworte(liste);
    if (pattern === null || row.get('regel_id') === '') return [];
    return [
      {
        regelId: row.get('regel_id'),
        wert: row.get('wert'),
        stichworte: liste,
        pattern,
        ausser: compileAusser(splitStichworte(row.get('ausser'))),
      },
    ];
  });
  return stichworte.filter((entry) => entry.regelId === id);
}
