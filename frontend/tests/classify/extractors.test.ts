// Gewerkeunabhängige Extraktoren (WP-J). Je Extraktor mindestens ein Treffer
// **mit** geprüfter Fundstelle und ein Negativfall — ein Text ohne Merkmal darf
// keinen leeren Key erzeugen, sonst stünde im Panel ein Merkmal, das es nicht
// gibt.

import { describe, expect, it } from 'vitest';
import { runExtractors } from '../../src/lib/classify/extractors';
import { findFristen } from '../../src/lib/classify/extractors/fristen';
import { extractMasse } from '../../src/lib/classify/extractors/masse';
import {
  findMaterial,
  materialExtractor,
  materialVocabulary,
} from '../../src/lib/classify/extractors/material';
import { findNormen } from '../../src/lib/classify/extractors/normen';
import { findPlatzhalter } from '../../src/lib/classify/extractors/platzhalter';
import { mergeSpans } from '../../src/lib/classify/extractors/spans';
import { findVerweise } from '../../src/lib/classify/extractors/verweise';
import { parseStlbCsv } from '../../src/lib/classify/stlbCatalog';
import { normalizeItem } from '../../src/lib/classify/text';
import type { ExtractorContext } from '../../src/lib/classify/extractors';
import type { Span } from '../../src/lib/classify';

const CATALOG = parseStlbCsv(
  [
    'lb_nummer,lb_bezeichnung,positionsart_default,keywords,quelle_version',
    '013,"Beton- und Stahlbetonarbeiten",,betonarbeiten|stahlbeton|bewehrungsstahl,2023',
    '012,Mauerarbeiten,,mauerarbeiten|kalksandstein,2023',
  ].join('\n'),
);

function context(longText: string, shortText = ''): ExtractorContext {
  return {
    shortText,
    longText,
    unit: null,
    text: normalizeItem({ shortText, longText, unit: null }),
    catalog: CATALOG,
  };
}

/** Der Textausschnitt, auf den ein Span zeigt — so prüft man eine Fundstelle. */
function slice(text: string, span: Span): string {
  return text.slice(span.start, span.end);
}

describe('normen', () => {
  it('findet DIN, DIN EN und DIN EN ISO samt Fundstelle', () => {
    const text = 'Beton C30/37 nach DIN EN 206 und DIN 1045-2, Nachweis nach DIN EN ISO 9001.';
    const hits = findNormen(text);
    expect(hits.map((hit) => hit.value)).toEqual(['DIN EN 206', 'DIN 1045-2', 'DIN EN ISO 9001']);
    for (const hit of hits) {
      expect(text.slice(hit.start, hit.end)).toBe(hit.label);
    }
  });

  it('nimmt den Ausgabestand in die Fundstelle, nicht in den Wert', () => {
    const text = 'Ausführung nach DIN EN 206:2021-06.';
    const [hit] = findNormen(text);
    expect(hit.value).toBe('DIN EN 206');
    expect(text.slice(hit.start, hit.end)).toBe('DIN EN 206:2021-06');
  });

  it('erkennt Regelwerke ohne eigene Nummer', () => {
    expect(findNormen('Abrechnung nach VOB/C, ATV DIN 18331.').map((hit) => hit.value)).toEqual([
      'VOB/C',
      'ATV DIN 18331',
    ]);
    expect(findNormen('Ausführung nach ZTV-ING Teil 3.').map((hit) => hit.value)).toContain(
      'ZTV-ING',
    );
  });

  it('hält bloße Zahlen für keine Norm', () => {
    expect(findNormen('Liefern von 206 Stück, Menge 1045 kg.')).toEqual([]);
    expect(runExtractors(context('Liefern von 206 Stück.')).attributes.normen).toBeUndefined();
  });
});

describe('masse', () => {
  it('findet benannte Maße samt Fundstelle', () => {
    const text = 'Wand herstellen, Dicke 30 cm, Höhe 3,5 m, Länge 12 m.';
    const { attributes, spans } = extractMasse(text);
    expect(attributes).toEqual({ dicke: '30 cm', hoehe: '3,5 m', laenge: '12 m' });
    expect(spans.map((span) => slice(text, span))).toEqual([
      'Dicke 30 cm',
      'Höhe 3,5 m',
      'Länge 12 m',
    ]);
  });

  it('versteht Komposita und nachgestellte Schreibweisen', () => {
    expect(extractMasse('Wandstärke 24 cm.').attributes.dicke).toBe('24 cm');
    expect(extractMasse('Platte, 20 cm dick.').attributes.dicke).toBe('20 cm');
    expect(extractMasse('Stütze, 4 m hoch.').attributes.hoehe).toBe('4 m');
    expect(extractMasse('Formelzeichen d = 25 cm.').attributes.dicke).toBe('25 cm');
  });

  it('hält ein einzelnes „d" mitten im Wort für kein Maß', () => {
    // Ohne Gleichheitszeichen ist "d" kein Formelzeichen: "wird 30 cm" darf
    // keine Dicke erzeugen.
    expect(extractMasse('Der Graben wird 30 cm tief ausgehoben.').attributes.dicke).toBeUndefined();
  });

  it('nimmt den Kurztext nachrangig, aber ohne Fundstelle', () => {
    const { attributes, spans } = extractMasse('Ohne Maßangabe.', 'Wand 24 cm dick');
    expect(attributes.dicke).toBe('24 cm');
    expect(spans).toEqual([]);
  });

  it('liefert ohne Maß keinen Key', () => {
    expect(extractMasse('Reinigen der Oberfläche.').attributes).toEqual({});
  });
});

describe('material', () => {
  it('erkennt Materialstichworte des Katalogs, Tätigkeiten dagegen nicht', () => {
    const vocabulary = materialVocabulary(CATALOG);
    expect(vocabulary).toContain('stahlbeton');
    expect(vocabulary).not.toContain('betonarbeiten');
    expect(vocabulary).not.toContain('mauerarbeiten');

    const text = 'Stahlbetonwand mit Bewehrungsstahl B500B.';
    const hits = findMaterial(text, vocabulary);
    expect(hits.map((hit) => hit.value)).toEqual(['Stahlbeton', 'Bewehrungsstahl']);
    expect(slice(text, { key: 'material', ...hits[0], label: '' })).toBe('Stahlbeton');
  });

  it('bleibt still, solange der Katalog keine Stichworte führt', () => {
    const leer = { ...context('Stahlbetonwand herstellen.'), catalog: [] };
    expect(materialExtractor.extract(leer)).toEqual({ attributes: {}, spans: [] });
  });

  it('liefert ohne Treffer keinen Key', () => {
    expect(materialExtractor.extract(context('Reinigen der Baustelle.')).attributes).toEqual({});
  });
});

describe('platzhalter', () => {
  it('findet gepunktete Textergänzungen mit ihrer Beschriftung', () => {
    const text = 'Herstellen einer Öffnung. Breite von ........... cm.';
    const [hit] = findPlatzhalter(text);
    expect(hit.value).toBe('Textergänzung');
    expect(text.slice(hit.start, hit.end)).toBe('...........');
    expect(hit.label).toBe('Breite von …');
  });

  it('erkennt ausformulierte Bieterangaben', () => {
    expect(findPlatzhalter('Fabrikat: vom Bieter einzutragen.').map((hit) => hit.value)).toContain(
      'Bieterangabe',
    );
  });

  it('zählt, wie viele Stellen offen sind', () => {
    const result = runExtractors(context('Breite ........ cm, Höhe ........ cm.'));
    expect(result.attributes.platzhalter).toEqual(['Textergänzung']);
    expect(result.attributes.platzhalterAnzahl).toBe(2);
  });

  it('liefert ohne offene Stelle keinen Key', () => {
    expect(findPlatzhalter('Vollständig beschriebene Leistung.')).toEqual([]);
    expect(runExtractors(context('Vollständige Leistung.')).attributes.platzhalter).toBeUndefined();
  });
});

describe('verweise', () => {
  it('erkennt die Art des Verweises und behält den Wortlaut', () => {
    const text = 'Ausführung wie Pos. 01.02.0010, Farbton laut Anlage 3, siehe Vorbemerkungen.';
    const hits = findVerweise(text);
    expect(hits.map((hit) => hit.value)).toEqual(['Positionsverweis', 'Anlage', 'Vorbemerkung']);
    expect(hits[0].label).toBe('wie Pos. 01.02.0010');
  });

  it('liefert ohne Verweis keinen Key', () => {
    expect(findVerweise('Beton der Güte C30/37 einbauen.')).toEqual([]);
    expect(runExtractors(context('Beton einbauen.')).attributes.verweise).toBeUndefined();
  });
});

describe('fristen', () => {
  it('erkennt Termine und zeitliche Umstände', () => {
    const text =
      'Fertigstellung bis 14.05.2026, Beginn in KW 12. ' +
      'Ausführung als Winterbaumaßnahme unter fließendem Verkehr.';
    const hits = findFristen(text);
    const werte = new Set(hits.map((hit) => hit.value));
    expect(werte).toContain('Termin');
    expect(werte).toContain('Bauzeit');
    expect(werte).toContain('Winterbau');
    expect(werte).toContain('Arbeiten unter Verkehr');
    for (const hit of hits) expect(text.slice(hit.start, hit.end)).toBe(hit.label);
  });

  it('liefert ohne Zeitbezug keinen Key', () => {
    expect(findFristen('Beton C30/37 einbauen und verdichten.')).toEqual([]);
    expect(runExtractors(context('Beton einbauen.')).attributes.fristen).toBeUndefined();
  });
});

describe('runExtractors', () => {
  it('erfüllt das Beispiel aus dem Plan: Normen, Maße und Beton mit Fundstelle', () => {
    const text = 'C30/37 nach DIN EN 206, d = 30 cm';
    const { attributes, spans } = runExtractors(context(text));

    expect(attributes.normen).toEqual(['DIN EN 206']);
    expect(attributes.dicke).toBe('30 cm');
    expect(spans.find((span) => span.key === 'normen')).toMatchObject({ label: 'DIN EN 206' });
    expect(
      slice(
        text,
        spans.find((span) => span.key === 'normen')!,
      ),
    ).toBe('DIN EN 206');
    expect(
      slice(
        text,
        spans.find((span) => span.key === 'dicke')!,
      ),
    ).toBe('d = 30 cm');
  });

  it('liefert für einen Text ohne Merkmale gar keine Keys', () => {
    const { attributes, spans } = runExtractors(context('Baustelle besenrein übergeben.'));
    expect(attributes).toEqual({});
    expect(spans).toEqual([]);
  });
});

describe('mergeSpans', () => {
  it('räumt Überlappungen aus — der frühere, längere Treffer gewinnt', () => {
    const spans: Span[] = [
      { key: 'b', start: 5, end: 10, label: 'kurz' },
      { key: 'a', start: 0, end: 8, label: 'lang' },
      { key: 'c', start: 12, end: 14, label: 'frei' },
    ];
    expect(mergeSpans(spans).map((span) => span.key)).toEqual(['a', 'c']);
  });
});
