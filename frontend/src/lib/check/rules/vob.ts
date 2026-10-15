// VOB-Regeln V1…V10 (docs/domain/vob-pruefungen.md). Jede Regel findet ein
// Textmuster oder ein Feld — sie bewertet nicht. Name, Hinweis, Schwere und
// Norm-Verweis stehen in docs/domain/reference/pruefregeln.csv, Suchwörter in
// pruefregeln-stichworte.csv, Schwellwerte in pruefregeln-parameter.csv. Hier
// steht nur, wie eine Regel sucht.
//
// Angemeldet, aber ohne Prüffunktion: V8, V9, V10. Sie stehen in
// pruefregeln.csv auf `aus`, bis der Owner sie bestätigt hat.

import { attrSpans, attrStrings } from '../../attributes';
import { findeStichworte } from '../../classify/material/stichwort';
import { canonicalUnit, unitGroups } from '../../units';
import {
  herstellerNamen,
  nebenleistungen,
  regelParameter,
  regelStichworte,
  regelText,
  risikoFormulierungen,
} from '../referenz';
import type { CheckContext, CheckRule, Fund } from '../types';
import type { Span } from '../../classify';

/** Die Fundstelle eines Merkmals aus WP-J, falls es eine gibt. */
function spanOf(attributes: Record<string, unknown>, key: string): Span | undefined {
  return attrSpans(attributes).find((span) => span.key === key);
}

// ── V1 · Bedarfs- und Alternativposition ────────────────────────────────────
// Beide Positionsarten stehen unter demselben Verweis (VOB/A § 7 Abs. 1 Nr. 4,
// vom Owner bestätigt) und sind deshalb eine Regel. Der Titel je Fund trennt
// die Begriffe weiter. Die Positionsart ist ein GAEB-Feld, kein Suchwort.

const V1_ARTEN: Readonly<Partial<Record<string, string>>> = {
  BEDARF: 'Bedarfsposition',
  ALTERNATIV: 'Alternativposition',
};

export const v1Bedarfsposition: CheckRule = {
  id: 'V1',
  check(context: CheckContext): Fund[] {
    const funde: Fund[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const art = V1_ARTEN[context.index.positions[i].positionType];
      if (art === undefined) continue;
      funde.push({ positionId: context.index.nodes[i].id, title: art });
    }
    return funde;
  },
};

// ── V2 · Angehängte Stundenlohnarbeiten ─────────────────────────────────────
// Zwei Wege: die Einheit gehört zur Zeit-Gruppe aus einheiten-gruppen.csv
// (Parameter `einheiten_gruppe`), oder der Text nennt ein Stundenlohn-Wort.

function zeitgruppe(): string | undefined {
  return regelParameter('V2', 'einheiten_gruppe');
}

export const v2Stundenlohn: CheckRule = {
  id: 'V2',
  requires: {
    file: 'docs/domain/reference/einheiten-gruppen.csv (Gruppe aus Parameter „einheiten_gruppe")',
    available: () => unitGroups().some((gruppe) => gruppe.name === zeitgruppe()),
  },
  check(context: CheckContext): Fund[] {
    const gruppe = regelText('V2', 'einheiten_gruppe');
    const worte = regelStichworte('V2');
    const funde: Fund[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const position = context.index.positions[i];
      const nachZeit = canonicalUnit(position.unit) === gruppe;
      const text = `${position.shortText}\n${position.longText}`;
      const imText = worte.some(
        (wort) => findeStichworte(text, wort.pattern, wort.ausser).length > 0,
      );
      if (!nachZeit && !imText) continue;
      funde.push({
        positionId: context.index.nodes[i].id,
        title: nachZeit ? `Abrechnung nach Zeit (${position.unit ?? '—'})` : 'Stundenlohnarbeit',
      });
    }
    return funde;
  },
};

// ── V4 · Risiko-Übertragung auf den Auftragnehmer ───────────────────────────

export const v4Risikoformulierung: CheckRule = {
  id: 'V4',
  requires: {
    file: 'docs/domain/reference/risiko-formulierungen.csv',
    available: () => risikoFormulierungen().some((entry) => entry.regelId === 'V4'),
  },
  check(context: CheckContext): Fund[] {
    const formulierungen = risikoFormulierungen().filter((entry) => entry.regelId === 'V4');
    const funde: Fund[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const position = context.index.positions[i];
      const haystack = position.longText.toLowerCase();
      for (const formulierung of formulierungen) {
        const at = haystack.indexOf(formulierung.text);
        if (at < 0) continue;
        funde.push({
          severity: formulierung.schweregrad,
          positionId: context.index.nodes[i].id,
          title: 'Risiko-Formulierung',
          span: {
            key: 'risiko',
            start: at,
            end: at + formulierung.text.length,
            label: position.longText.slice(at, at + formulierung.text.length),
          },
        });
      }
    }
    return funde;
  },
};

// ── V5 · Position ohne Menge oder ohne Einheit ──────────────────────────────

export const v5MengeFehlt: CheckRule = {
  id: 'V5',
  check(context: CheckContext): Fund[] {
    const funde: Fund[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const position = context.index.positions[i];
      const ohneEinheit = canonicalUnit(position.unit) === null;
      const ohneMenge = position.quantity === null;
      const mengeNull = position.quantity === 0;
      if (!ohneEinheit && !ohneMenge && !mengeNull) continue;

      const fehlt: string[] = [];
      if (ohneMenge) fehlt.push('keine Menge');
      else if (mengeNull) fehlt.push('Menge 0');
      if (ohneEinheit) fehlt.push('keine Einheit');

      funde.push({ positionId: context.index.nodes[i].id, title: fehlt.join(', ') });
    }
    return funde;
  },
};

// ── V6 · Verweis auf ein anderes Dokument ───────────────────────────────────
// Welche Verweise als Dokument außerhalb des LV gelten, steht in
// pruefregeln-stichworte.csv (Zeilen V6). Ein Positionsverweis innerhalb
// desselben LV gehört nicht dazu — die Position liegt ja in derselben Datei.

export const v6VerweisStattAngabe: CheckRule = {
  id: 'V6',
  requires: {
    file: 'docs/domain/reference/pruefregeln-stichworte.csv (Zeilen V6)',
    available: () => regelStichworte('V6').length > 0,
  },
  check(context: CheckContext): Fund[] {
    const arten = regelStichworte('V6');
    const funde: Fund[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const { longText } = context.index.positions[i];
      const gefunden: string[] = [];
      let span: Span | undefined;
      for (const art of arten) {
        const [erster] = findeStichworte(longText, art.pattern, art.ausser);
        if (erster === undefined) continue;
        gefunden.push(art.wert);
        if (span === undefined || erster.start < span.start) {
          span = { key: 'verweise', start: erster.start, end: erster.end, label: erster.text };
        }
      }
      if (gefunden.length === 0) continue;
      funde.push({
        positionId: context.index.nodes[i].id,
        title: `Verweis auf ${gefunden.join(', ')}`,
        span,
      });
    }
    return funde;
  },
};

// ── V7 · Offene Textergänzung ───────────────────────────────────────────────
// Liest, was der Platzhalter-Extraktor gefunden hat (classify/extractors/
// platzhalter.ts); seine Suchwörter stehen ebenfalls unter V7 in
// pruefregeln-stichworte.csv.

export const v7Platzhalter: CheckRule = {
  id: 'V7',
  check(context: CheckContext): Fund[] {
    const funde: Fund[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const attributes = context.index.positions[i].attributes;
      const arten = attrStrings(attributes, 'platzhalter');
      if (arten.length === 0) continue;
      const anzahl = attributes.platzhalterAnzahl;
      funde.push({
        positionId: context.index.nodes[i].id,
        title:
          typeof anzahl === 'number' && anzahl > 1
            ? `${anzahl} offene Stellen (${arten.join(', ')})`
            : arten.join(', '),
        span: spanOf(attributes, 'platzhalter'),
      });
    }
    return funde;
  },
};

// ── V3 · Produktname ohne „oder gleichwertig" ───────────────────────────────
// Namen und Produktnamen stehen in hersteller-produktnamen.csv, der erlaubende
// Zusatz unter V3 in pruefregeln-stichworte.csv. Steht der Zusatz irgendwo in
// der Position, gilt jeder Name darin als erlaubt — der Zusatz steht oft am
// Ende des Langtexts, nicht direkt hinter dem Namen.

export const v3Produktname: CheckRule = {
  id: 'V3',
  requires: {
    file: 'docs/domain/reference/hersteller-produktnamen.csv',
    available: () => herstellerNamen().length > 0 && regelStichworte('V3').length > 0,
  },
  check(context: CheckContext): Fund[] {
    const liste = herstellerNamen();
    const zusatz = regelStichworte('V3');
    const funde: Fund[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const { shortText, longText } = context.index.positions[i];
      const text = `${shortText}\n${longText}`;
      if (zusatz.some((art) => findeStichworte(text, art.pattern, art.ausser).length > 0)) {
        continue;
      }
      const namen: string[] = [];
      let span: Span | undefined;
      for (const eintrag of liste) {
        const imKurztext = findeStichworte(shortText, eintrag.pattern, null).length > 0;
        const [erster] = findeStichworte(longText, eintrag.pattern, null);
        if (!imKurztext && erster === undefined) continue;
        namen.push(eintrag.name);
        if (erster !== undefined && (span === undefined || erster.start < span.start)) {
          span = { key: 'hersteller', start: erster.start, end: erster.end, label: erster.text };
        }
      }
      if (namen.length === 0) continue;
      funde.push({ positionId: context.index.nodes[i].id, title: namen.join(', '), span });
    }
    return funde;
  },
};

// ── Angemeldet, noch ohne Prüffunktion ──────────────────────────────────────

export const v8Nebenleistung: CheckRule = {
  id: 'V8',
  requires: {
    file: 'docs/domain/reference/vob-nebenleistungen.csv',
    available: () => nebenleistungen().length > 0,
  },
};

export const v9BesondereLeistung: CheckRule = {
  id: 'V9',
  requires: {
    file: 'docs/domain/reference/vob-nebenleistungen.csv',
    available: () => nebenleistungen().length > 0,
  },
};

// Braucht die Zuordnung „diese Position gehört zu den Erdarbeiten". Die
// Leistungsbereich-Erkennung ist entfernt (docs/decisions/0044), bis dahin ohne
// `check` und damit inaktiv.
export const v10Homogenbereiche: CheckRule = { id: 'V10' };
