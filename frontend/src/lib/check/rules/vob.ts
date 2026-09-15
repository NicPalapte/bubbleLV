// VOB-Regeln V1…V10 (docs/domain/vob-pruefungen.md). Jede Regel findet ein
// Textmuster oder ein Feld — sie bewertet nicht. Die Norm-Verweise stehen nicht
// hier, sondern in docs/domain/reference/pruefregeln.csv; dieser Code kennt nur
// die Regel-ID.
//
// Angemeldet, aber ohne Prüffunktion: V3, V8, V9, V10. Sie brauchen
// Referenzdaten bzw. eine Gewerke-Zuordnung, die noch niemand gepflegt hat, und
// erscheinen deshalb in der Prüfliste als inaktiv — statt still zu fehlen.

import { attrSpans, attrStrings } from '../../attributes';
import { canonicalUnit, unitGroups } from '../../units';
import { herstellerNamen, nebenleistungen, risikoFormulierungen } from '../referenz';
import type { CheckContext, CheckRule, Flag } from '../types';
import type { Span } from '../../classify';

/** Die Fundstelle eines Merkmals aus WP-J, falls es eine gibt. */
function spanOf(attributes: Record<string, unknown>, key: string): Span | undefined {
  return attrSpans(attributes).find((span) => span.key === key);
}

// ── V1 · Bedarfs-/Eventualposition ──────────────────────────────────────────

export const v1Bedarfsposition: CheckRule = {
  id: 'V1',
  label: 'Bedarfs- oder Eventualposition',
  category: 'vob',
  severity: 'beachten',
  hint: 'Die Position ist als Bedarfsposition ausgewiesen. Ob sie beauftragt wird, steht bei Angebotsabgabe nicht fest.',
  check(context: CheckContext): Flag[] {
    const flags: Flag[] = [];
    for (let i = 0; i < context.index.size; i++) {
      if (context.index.positions[i].positionType !== 'BEDARF') continue;
      flags.push({
        id: 'V1',
        category: 'vob',
        severity: 'beachten',
        positionId: context.index.nodes[i].id,
        title: 'Bedarfsposition',
      });
    }
    return flags;
  },
};

// ── V2 · Angehängte Stundenlohnarbeiten ─────────────────────────────────────

/**
 * Name der Zeiteinheiten-Gruppe in
 * docs/domain/reference/einheiten-gruppen.csv. Der Code kennt hier einen
 * **Datenwert** — fehlt die Zeile, fände die Regel Zeiteinheiten still nicht
 * mehr, während sie weiter als aktiv dastünde. Deshalb steht die Gruppe unten
 * als `requires`: fehlt sie, ist die Regel sichtbar inaktiv statt lautlos halb
 * blind.
 */
const STUNDE = 'Stunde';

function hatZeitgruppe(): boolean {
  return unitGroups().some((gruppe) => gruppe.name === STUNDE);
}

const STUNDENLOHN_WORTE = ['stundenlohn', 'regiearbeit', 'regiestunde'];

export const v2Stundenlohn: CheckRule = {
  id: 'V2',
  label: 'Angehängte Stundenlohnarbeiten',
  category: 'vob',
  severity: 'hinweis',
  hint: 'Die Position wird nach Zeit abgerechnet. Bei größerem Umfang lohnt der Blick auf Anteil und Abgrenzung zur Hauptleistung.',
  requires: {
    file: `docs/domain/reference/einheiten-gruppen.csv (Gruppe „${STUNDE}")`,
    available: hatZeitgruppe,
  },
  check(context: CheckContext): Flag[] {
    const flags: Flag[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const position = context.index.positions[i];
      const nachZeit = canonicalUnit(position.unit) === STUNDE;
      const text = `${position.shortText}\n${position.longText}`.toLowerCase();
      const imText = STUNDENLOHN_WORTE.some((wort) => text.includes(wort));
      if (!nachZeit && !imText) continue;
      flags.push({
        id: 'V2',
        category: 'vob',
        severity: 'hinweis',
        positionId: context.index.nodes[i].id,
        title: nachZeit ? `Abrechnung nach Zeit (${position.unit ?? '—'})` : 'Stundenlohnarbeit',
      });
    }
    return flags;
  },
};

// ── V4 · Risiko-Übertragung auf den Auftragnehmer ───────────────────────────

export const v4Risikoformulierung: CheckRule = {
  id: 'V4',
  label: 'Risiko auf den Auftragnehmer übertragen',
  category: 'risiko',
  severity: 'beachten',
  hint: 'Der Text schiebt ein Risiko auf den Auftragnehmer. Ob es sich kalkulieren lässt, gehört geprüft.',
  requires: {
    file: 'docs/domain/reference/risiko-formulierungen.csv',
    available: () => risikoFormulierungen().some((entry) => entry.regelId === 'V4'),
  },
  check(context: CheckContext): Flag[] {
    const formulierungen = risikoFormulierungen().filter((entry) => entry.regelId === 'V4');
    if (formulierungen.length === 0) return [];

    const flags: Flag[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const position = context.index.positions[i];
      const haystack = position.longText.toLowerCase();
      for (const formulierung of formulierungen) {
        const at = haystack.indexOf(formulierung.text);
        if (at < 0) continue;
        flags.push({
          id: 'V4',
          category: 'risiko',
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
    return flags;
  },
};

// ── V5 · Position ohne Menge oder ohne Einheit ──────────────────────────────

export const v5MengeFehlt: CheckRule = {
  id: 'V5',
  label: 'Menge oder Einheit fehlt',
  category: 'menge',
  severity: 'beachten',
  hint: 'Ohne Menge oder Einheit lässt sich die Position nicht bepreisen — der Ansatz muss von woanders kommen.',
  check(context: CheckContext): Flag[] {
    const flags: Flag[] = [];
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

      flags.push({
        id: 'V5',
        category: 'menge',
        severity: 'beachten',
        positionId: context.index.nodes[i].id,
        title: fehlt.join(', '),
      });
    }
    return flags;
  },
};

// ── V6 · Preisbeeinflussender Umstand nur als Verweis ───────────────────────

/**
 * Verweise, hinter denen ein preisbeeinflussender Umstand stecken kann. Ein
 * Positionsverweis innerhalb desselben LV zählt nicht — die genannte Position
 * liegt ja in derselben Datei.
 */
const EXTERNE_VERWEISE = ['Gutachten', 'Planunterlage', 'Anlage'];

export const v6VerweisStattAngabe: CheckRule = {
  id: 'V6',
  label: 'Preisbeeinflussender Umstand nur als Verweis',
  category: 'risiko',
  severity: 'hinweis',
  hint: 'Der Text verweist auf eine Unterlage außerhalb der Datei. Liegt sie nicht vor, fehlt die Kalkulationsgrundlage.',
  check(context: CheckContext): Flag[] {
    const flags: Flag[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const attributes = context.index.positions[i].attributes;
      const verweise = attrStrings(attributes, 'verweise').filter((wert) =>
        EXTERNE_VERWEISE.includes(wert),
      );
      if (verweise.length === 0) continue;
      flags.push({
        id: 'V6',
        category: 'risiko',
        severity: 'hinweis',
        positionId: context.index.nodes[i].id,
        title: `Verweis auf ${verweise.join(', ')}`,
        span: spanOf(attributes, 'verweise'),
      });
    }
    return flags;
  },
};

// ── V7 · Offene Textergänzung ───────────────────────────────────────────────

export const v7Platzhalter: CheckRule = {
  id: 'V7',
  label: 'Offene Textergänzung',
  category: 'risiko',
  severity: 'beachten',
  hint: 'Im Langtext steht eine Lücke, die der Bieter ausfüllen soll. Sie ist Teil des Angebots.',
  check(context: CheckContext): Flag[] {
    const flags: Flag[] = [];
    for (let i = 0; i < context.index.size; i++) {
      const attributes = context.index.positions[i].attributes;
      const arten = attrStrings(attributes, 'platzhalter');
      if (arten.length === 0) continue;
      const anzahl = attributes.platzhalterAnzahl;
      flags.push({
        id: 'V7',
        category: 'risiko',
        severity: 'beachten',
        positionId: context.index.nodes[i].id,
        title:
          typeof anzahl === 'number' && anzahl > 1
            ? `${anzahl} offene Stellen (${arten.join(', ')})`
            : arten.join(', '),
        span: spanOf(attributes, 'platzhalter'),
      });
    }
    return flags;
  },
};

// ── Angemeldet, noch ohne Prüffunktion ──────────────────────────────────────

export const v3Produktname: CheckRule = {
  id: 'V3',
  label: 'Produktname ohne „oder gleichwertig"',
  category: 'vob',
  severity: 'beachten',
  hint: 'Ein Hersteller- oder Produktname ohne den Zusatz „oder gleichwertig" schränkt den Wettbewerb ein.',
  requires: {
    file: 'docs/domain/reference/hersteller-produktnamen.csv',
    available: () => herstellerNamen().length > 0,
  },
};

export const v8Nebenleistung: CheckRule = {
  id: 'V8',
  label: 'Ausgeschriebene Nebenleistung',
  category: 'vob',
  severity: 'hinweis',
  hint: 'Eine Leistung, die nach VOB/C bereits Nebenleistung ist, hat eine eigene Position — auf Doppelvergütung prüfen.',
  requires: {
    file: 'docs/domain/reference/vob-nebenleistungen.csv',
    available: () => nebenleistungen().length > 0,
  },
};

export const v9BesondereLeistung: CheckRule = {
  id: 'V9',
  label: 'Besondere Leistung ohne eigene Position',
  category: 'vob',
  severity: 'hinweis',
  hint: 'Der Text erwähnt eine Besondere Leistung, für die keine eigene Position vorgesehen ist.',
  requires: {
    file: 'docs/domain/reference/vob-nebenleistungen.csv',
    available: () => nebenleistungen().length > 0,
  },
};

export const v10Homogenbereiche: CheckRule = {
  id: 'V10',
  label: 'Erdarbeiten ohne Homogenbereiche',
  category: 'norm',
  severity: 'beachten',
  hint: 'Erdarbeiten ohne Angabe von Homogenbereichen — seit der Fassung 2015 lösen sie die Bodenklassen ab.',
  // Braucht keine eigene Datei, sondern die Zuordnung „welcher LB ist
  // Erdarbeiten" — die steckt in der noch ungepflegten keywords-Spalte des
  // STLB-Katalogs.
  requires: {
    file: 'docs/domain/reference/stlb-bau-leistungsbereiche.csv (Spalte keywords)',
    available: () => false,
  },
};
