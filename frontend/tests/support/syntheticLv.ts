// Generator für große, synthetische LVs. Bewusst im Testcode und nicht als
// Datei im Repo: 10.000 Positionen mit Langtext sind mehrere MB, und die
// Performance-Tests brauchen die Größe, nicht echte Inhalte (WP-I, Schritt 6).
//
// Die Streuung ist absichtlich: unterschiedliche Gewerke, Bauteiltypen,
// Betonsorten, Einheiten und Mengen, damit Facetten- und Mengenfilter etwas zu
// tun bekommen und nicht alles oder nichts treffen.

import type { LVDraft, LotDraft, PositionDraft, SectionDraft } from '../../src/types/lvDraft';

const GEWERKE = ['Betonarbeiten', 'Mauerarbeiten', 'Erdarbeiten', 'Putzarbeiten'];
const BAUTEILTYPEN = ['Wand', 'Decke', 'Stütze', 'Fundament', 'Bodenplatte'];
const BETON = ['C20/25', 'C25/30', 'C30/37', 'C35/45'];
const EXPO = [['XC1'], ['XC2', 'XF1'], ['XD1', 'XF3'], ['XC4', 'XD2', 'XS1']];
const EINHEITEN = ['m3', 'm2', 'm', 'Stck', 'kg'];
const POSITIONSARTEN = ['bauteil', 'nebenleistung', 'baustelleneinrichtung', 'planung'];

/** Positionen je Abschnitt — realistische Größe für ein gegliedertes LV. */
const PER_SECTION = 25;
/** Abschnitte je Los. */
const SECTIONS_PER_LOT = 8;

/**
 * Langtext in der Größenordnung echter Ausschreibungstexte. Der Suchfilter
 * arbeitet auf ihm, deshalb darf er nicht einzeilig sein.
 */
function longText(index: number): string {
  return [
    `Herstellen des Bauteils Nr. ${index} einschließlich aller Nebenleistungen.`,
    'Liefern, Einbauen, Verdichten und Nachbehandeln nach den anerkannten Regeln',
    'der Technik. Schalung, Bewehrungsbeilagen und Aussparungen nach Planung.',
    `Abrechnung nach Aufmaß. Position ${index} der Ausschreibung.`,
  ].join('\n');
}

function syntheticPosition(oz: string, index: number): PositionDraft {
  return {
    oz,
    shortText: `${BAUTEILTYPEN[index % BAUTEILTYPEN.length]} herstellen, Pos. ${index}`,
    longText: longText(index),
    unit: EINHEITEN[index % EINHEITEN.length],
    quantity: ((index * 37) % 900) + 1,
    unitPrice: ((index * 13) % 400) + 10,
    positionType: index % 50 === 0 ? 'ALTERNATIV' : 'NORMAL',
    attributes: {
      positionsart: POSITIONSARTEN[index % POSITIONSARTEN.length],
      gewerk: GEWERKE[index % GEWERKE.length],
      bauteiltyp: BAUTEILTYPEN[index % BAUTEILTYPEN.length],
      beton: BETON[index % BETON.length],
      expo: EXPO[index % EXPO.length],
      keywords: index % 7 === 0 ? ['Bedenkenanmeldung'] : [],
    },
  };
}

/** Klassifizierter LVDraft mit genau `count` Positionen. */
export function syntheticDraft(count: number): LVDraft {
  const lots: LotDraft[] = [];
  let created = 0;
  let lotIndex = 0;

  while (created < count) {
    const lotNumber = String(++lotIndex).padStart(3, '0');
    const sections: SectionDraft[] = [];
    for (let s = 0; s < SECTIONS_PER_LOT && created < count; s++) {
      const sectionNumber = `${lotNumber}.${String(s + 1).padStart(3, '0')}`;
      const positions: PositionDraft[] = [];
      for (let p = 0; p < PER_SECTION && created < count; p++) {
        const oz = `${sectionNumber}.${String((p + 1) * 10).padStart(4, '0')}`;
        positions.push(syntheticPosition(oz, created));
        created++;
      }
      sections.push({
        number: sectionNumber,
        label: `Abschnitt ${sectionNumber}`,
        positions,
        sections: [],
      });
    }
    lots.push({ number: lotNumber, label: `Los ${lotNumber}`, sections });
  }

  return { projectName: `Synthetisches LV (${count} Positionen)`, client: 'Testfall', lots };
}

// ── Der harte Fall für die Ähnlichkeit (WP-M) ────────────────────────────────
//
// `syntheticDraft` oben erzeugt ein LV mit **viel Wiederholung**: dieselben
// Texte immer wieder. Für die Cluster-Bildung ist das der leichte Fall — die
// Signatur-Stufe fasst wortgleiche Positionen zusammen, bevor überhaupt
// verglichen wird (lib/relate/similarity.ts).
//
// Teuer wird erst das Gegenteil: hunderte **verschieden** formulierte Texte in
// derselben Vorgruppe (gleiches Gewerk, gleiche Einheit, gleicher Bauteiltyp),
// die sich nur in wenigen Wörtern unterscheiden — hunderte Wandtypen unter
// „Mauerarbeiten/m³/Wand". Dann greift die Signatur-Stufe nicht, und der
// invertierte Index über Schindeln muss die Arbeit tragen.
//
// Deshalb **Kunstwörter statt Zahlen**: `relateTokens` maskiert jede Zahl zu
// „#", eine laufende Nummer im Text würde alle Positionen wieder auf dieselbe
// Signatur ziehen — und der Test liefe am teuren Pfad vorbei.

/** Silben für aussprechbare Kunstwörter. */
const SILBEN = [
  'ka',
  'me',
  'lo',
  'ri',
  'tu',
  'na',
  'se',
  'bi',
  'do',
  'fe',
  'gu',
  'ha',
  'jo',
  'ku',
  'lu',
  'mi',
  'no',
  'pa',
  're',
  'so',
];

/** Kunstwort zu einer Zahl — ziffernfrei, damit die Maskierung es stehen lässt. */
export function kunstwort(n: number): string {
  return (
    SILBEN[n % 20] +
    SILBEN[Math.floor(n / 20) % 20] +
    SILBEN[Math.floor(n / 400) % 20] +
    SILBEN[Math.floor(n / 8000) % 20]
  );
}

const HART_LANG = [
  'Herstellen einer tragenden Innenwand aus Beton einschließlich Schalung,',
  'Bewehrung und Nachbehandlung. Abrechnung nach Aufmaß.',
].join(' ');

/**
 * LV mit `familien` × `proFamilie` Positionen, alle in **einer** Vorgruppe.
 * Innerhalb einer Familie sind die Texte nah verwandt (ein Wort unterscheidet
 * sie), zwischen zwei Familien deutlich verschieden. Jede Position hat ihren
 * eigenen Text — die Signatur-Stufe fasst nichts zusammen.
 */
export function hardCaseDraft(familien: number, proFamilie: number): LVDraft {
  const positions: PositionDraft[] = [];
  for (let familie = 0; familie < familien; familie++) {
    for (let variante = 0; variante < proFamilie; variante++) {
      const index = positions.length;
      const typ = kunstwort(familie);
      const art = kunstwort(50_000 + variante);
      positions.push({
        oz: `01.001.${String(index).padStart(5, '0')}`,
        shortText: `Innenwand herstellen ${typ} ${art}`,
        longText: `${HART_LANG} Ausführung ${typ} ${art}.`,
        unit: 'm3',
        quantity: (index % 900) + 1,
        unitPrice: (index % 400) + 10,
        positionType: 'NORMAL',
        attributes: { gewerk: 'Betonarbeiten', bauteiltyp: 'Wand', positionsart: 'bauteil' },
      });
    }
  }
  return {
    projectName: `Harter Fall (${positions.length} Positionen)`,
    client: 'Testfall',
    lots: [
      {
        number: '01',
        label: 'Los 01',
        sections: [{ number: '01.001', label: 'Abschnitt 01.001', sections: [], positions }],
      },
    ],
  };
}
