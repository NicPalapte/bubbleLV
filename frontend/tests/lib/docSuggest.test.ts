// Vorschläge im Begleitdokument (Entscheidung 0080): OZ und Mengen aus dem LV im
// Seitentext wiederfinden. Alle Texte und Positionen sind erfunden.

import { describe, expect, it } from 'vitest';
import {
  SENTENCE_REACH,
  suggestIndexOf,
  suggestionsInPage,
  type SuggestPosition,
} from '../../src/lib/docs/docSuggest';
import { createSuggestHandler } from '../../src/lib/docs/suggestMessages';
import { createSuggester, type SuggestWorker } from '../../src/lib/docs/suggester';
import type { SuggestRequest, SuggestResponse } from '../../src/lib/docs/suggestMessages';

const POSITIONEN: SuggestPosition[] = [
  { id: 'p1', oz: '01.02.0030', quantity: 120, unit: 'm3', shortText: 'Boden lösen und laden' },
  { id: 'p2', oz: '01.02.0040', quantity: 1234.5, unit: 'm2', shortText: 'Estrich CT-C30' },
  { id: 'p3', oz: '01.03.0030', quantity: 3, unit: 'St', shortText: 'Schachtabdeckung' },
  { id: 'p4', oz: '01.03.0050', quantity: 88, unit: 'm', shortText: 'Rinne aus Ortbeton' },
  { id: 'p5', oz: '02.01.0010', quantity: 88, unit: 'm', shortText: 'Kabelschutzrohr DN 110' },
  { id: 'p6', oz: '02.01.0020', quantity: 1, unit: 'psch', shortText: 'Baustelle einrichten' },
  { id: 'p7', oz: '02.01.0070', quantity: 42.75, unit: 't', shortText: 'Betonstahl liefern' },
];
const INDEX = suggestIndexOf(POSITIONEN);

const finde = (text: string) =>
  suggestionsInPage(text, INDEX, 1).map(({ text: t, id, source }) => ({ t, id, source }));

describe('OZ im Seitentext', () => {
  it('findet die volle OZ, auch mit anderem Trenner und ohne führende Nullen', () => {
    expect(finde('Siehe 01.02.0030 und 1.2.40 sowie 01-03-0050.')).toEqual([
      { t: '01.02.0030', id: 'p1', source: 'oz' },
      { t: '1.2.40', id: 'p2', source: 'oz' },
      { t: '01-03-0050', id: 'p4', source: 'oz' },
    ]);
  });

  it('übersteht Leerraum und Zeilenumbruch, die PDF.js in die OZ setzt', () => {
    expect(finde('wie in 01.02.\n0030 beschrieben')).toEqual([
      { t: '01.02.\n0030', id: 'p1', source: 'oz' },
    ]);
  });

  it('findet eine OZ, die nur mit Leerzeichen getrennt ist, auch mit Menge dahinter', () => {
    const [treffer] = suggestionsInPage('02 01 0070 42,75 t Stahl', INDEX, 1);
    expect(treffer).toMatchObject({ text: '02 01 0070', id: 'p7', source: 'oz' });
    expect(treffer.amount).toEqual({ pdf: '42,75 t', lv: '42,75 t', same: true });
  });

  it('übernimmt nur OZ, die es im LV gibt, und nur in passender Länge', () => {
    expect(finde('OZ 01.02.0099, 01.02 und 01.02.0030.1 gibt es nicht.')).toEqual([]);
  });

  it('nimmt keine Datumsangaben, Dezimalzahlen oder Teile längerer Zahlen', () => {
    expect(finde('Am 01.02.2030 um 1,2,40 Uhr; Nr. 101.02.0030; 01.02.0030,5 m')).toEqual([]);
  });

  it('Kurzform nur mit Kontextwort und nur eindeutig', () => {
    // „30“ endet in 01.02.0030 und 01.03.0030 — mehrdeutig, also kein Vorschlag.
    expect(finde('Pos. 30 und Position 0030')).toEqual([]);
    expect(finde('Pos. 70 ist zu beachten, 70 Stück ohne Kontext nicht.')).toEqual([
      { t: '70', id: 'p7', source: 'oz' },
    ]);
    expect(finde('siehe Position Nr. 3.30 und OZ 2.30')).toEqual([
      { t: '3.30', id: 'p3', source: 'oz' },
      { t: '2.30', id: 'p1', source: 'oz' },
    ]);
    expect(finde('Ohne Kontext 2.30 nicht.')).toEqual([]);
  });

  it('Lage und Text beziehen sich auf den Seitentext', () => {
    const text = 'Abschnitt A: 01.02.0040 Estrich';
    const [treffer] = suggestionsInPage(text, INDEX, 4);
    expect(treffer.page).toBe(4);
    expect(text.slice(treffer.start, treffer.start + treffer.text.length)).toBe('01.02.0040');
  });
});

describe('Mengen im Seitentext', () => {
  it('schlägt eine Menge vor, wenn Wert und Einheit genau eine Position treffen', () => {
    expect(finde('Es sind 1.234,50 m² Gussasphalt und 120 cbm Kies.')).toEqual([
      { t: '1.234,50 m²', id: 'p2', source: 'menge' },
      { t: '120 cbm', id: 'p1', source: 'menge' },
    ]);
  });

  it('keine Menge bei mehrdeutigem Wert, kleiner ganzer Zahl, Pauschale oder fremder Einheit', () => {
    expect(finde('88 m Rigole, 3 St Schächte, 1 psch Baustelle, 120 kg Stahl')).toEqual([]);
  });

  it('eindeutige Menge mit Wort aus dem Kurztext markiert den ganzen Satz', () => {
    const liste = suggestionsInPage(
      'Erdarbeiten. Danach werden ca. 42,75 t Betonstahl verlegt. Ende.',
      INDEX,
      1,
    );
    expect(liste).toEqual([
      {
        page: 1,
        start: 13,
        text: 'Danach werden ca. 42,75 t Betonstahl verlegt.',
        id: 'p7',
        source: 'menge',
        words: ['Betonstahl'],
      },
    ]);
  });

  it('bei mehreren Positionen mit gleicher Menge entscheiden die Wörter im Satz', () => {
    expect(
      suggestionsInPage('Im Hof sind 88 m Kabelschutzrohre zu verlegen.', INDEX, 1),
    ).toMatchObject([{ id: 'p5', text: 'Im Hof sind 88 m Kabelschutzrohre zu verlegen.' }]);
    // Zusammengesetztes Wort: „Ortbeton“ steckt in „Ortbetonrinne“.
    expect(finde('Es folgen 88 m Ortbetonrinne.')).toMatchObject([{ id: 'p4' }]);
  });

  it('ohne Aufzählung oder „je“ gilt das nächste Wort', () => {
    expect(finde('Es folgen 88 m Rinne neben dem Kabelschutzrohr.')).toEqual([
      { t: 'Es folgen 88 m Rinne neben dem Kabelschutzrohr.', id: 'p4', source: 'menge' },
    ]);
  });

  it('kein Vorschlag, wenn kein Wort eine der Positionen mit gleicher Menge trifft', () => {
    expect(finde('Es folgen 88 m Leitung.')).toEqual([]);
  });

  it('mehrere Mengen im Satz: jede Menge mit ihrem Satzteil, auch mehrere Positionen', () => {
    const index = suggestIndexOf([
      { id: 'sts', oz: '3.1.10', quantity: 350, unit: 'm3', shortText: 'Schottertragschicht 0/45' },
      { id: 'abs', oz: '3.1.20', quantity: 2300, unit: 'm2', shortText: 'Asphaltbinderschicht' },
      { id: 'ads', oz: '3.1.30', quantity: 2300, unit: 'm2', shortText: 'Asphaltdeckschicht AC 8' },
    ]);
    const text =
      'Die Fahrbahn wird neu aufgebaut:\nSchottertragschicht rd. 350 m³, ' +
      'Asphaltbinderschicht AC 16 BN und Asphaltdeckschicht AC 8 DN auf\nje rd. 2.300 m².';
    expect(
      suggestionsInPage(text, index, 1).map(({ text: t, id, words }) => ({ t, id, words })),
    ).toEqual([
      { t: 'Schottertragschicht rd. 350 m³', id: 'sts', words: ['Schottertragschicht'] },
      { t: 'Asphaltbinderschicht AC 16 BN', id: 'abs', words: ['Asphaltbinderschicht'] },
      {
        t: 'Asphaltdeckschicht AC 8 DN auf\nje rd. 2.300 m².',
        id: 'ads',
        words: ['Asphaltdeckschicht'],
      },
    ]);
  });

  it('„rd.“ und „ca.“ beenden den Satz nicht, der Punkt nach der Einheit schon', () => {
    expect(finde('Es werden rd. 42,75 t Betonstahl verlegt. Danach folgt Beton.')).toEqual([
      { t: 'Es werden rd. 42,75 t Betonstahl verlegt.', id: 'p7', source: 'menge' },
    ]);
    expect(finde('Betonstahl rd. 42,75 t. Danach folgt Beton.')).toEqual([
      { t: 'Betonstahl rd. 42,75 t.', id: 'p7', source: 'menge' },
    ]);
  });

  it('nicht der ganze Satz, wenn er eine OZ oder eine zweite Menge enthält', () => {
    const [mitOz] = suggestionsInPage('42,75 t Betonstahl wie in 01.02.0030.', INDEX, 1).filter(
      (item) => item.source === 'menge',
    );
    expect(mitOz).toMatchObject({ text: '42,75 t', id: 'p7', words: ['Betonstahl'] });
    expect(finde('Es sind 1.234,50 m² Estrich und 120 cbm Boden.').map((item) => item.t)).toEqual([
      '1.234,50 m² Estrich',
      '120 cbm Boden',
    ]);
  });

  it('der Satz reicht nicht weiter als SENTENCE_REACH Zeichen', () => {
    const fuell = 'wort '.repeat(80);
    const [treffer] = suggestionsInPage(`${fuell}42,75 t Betonstahl ${fuell}`, INDEX, 1);
    expect(treffer.text.length).toBeLessThanOrEqual(2 * SENTENCE_REACH + 8);
    expect(treffer.text.startsWith('wort')).toBe(true);
    expect(treffer.text.endsWith('wort')).toBe(true);
  });

  it('eine Menge kurz hinter einer OZ gehört zur OZ und zeigt die Abweichung', () => {
    const liste = suggestionsInPage('Pos. 01.02.0030: 110 m³ Boden lösen', INDEX, 1);
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ source: 'oz', id: 'p1' });
    expect(liste[0].amount).toEqual({ pdf: '110 m³', lv: '120 m3', same: false });
  });
});

describe('Worker je Seite', () => {
  /** Ersatz-Worker: rechnet mit demselben Handler, merkt sich jede Nachricht. */
  function scheinWorker(log: SuggestRequest[]): SuggestWorker {
    const handle = createSuggestHandler();
    const worker: SuggestWorker = {
      onmessage: null,
      onerror: null,
      postMessage: (request) => {
        log.push(request);
        const response = handle(request);
        if (response === null) return;
        queueMicrotask(() =>
          worker.onmessage?.({ data: response } as MessageEvent<SuggestResponse>),
        );
      },
      terminate: () => undefined,
    };
    return worker;
  }

  it('schickt erst das Verzeichnis, dann jede Seite einzeln', async () => {
    const log: SuggestRequest[] = [];
    const suggester = createSuggester(INDEX, () => scheinWorker(log));
    const [a, b] = await Promise.all([
      suggester.page('Seite eins ohne OZ', 1),
      suggester.page('Seite zwei: 01.02.0030', 2),
    ]);
    expect(log.map((entry) => entry.type)).toEqual(['index', 'page', 'page']);
    expect(a).toEqual([]);
    expect(b).toMatchObject([{ page: 2, id: 'p1' }]);
    suggester.dispose();
  });

  it('beim Beenden bleibt keine Anfrage hängen', async () => {
    const stumm: SuggestWorker = {
      onmessage: null,
      onerror: null,
      postMessage: () => undefined,
      terminate: () => undefined,
    };
    const suggester = createSuggester(INDEX, () => stumm);
    const warten = suggester.page('01.02.0030', 1);
    suggester.dispose();
    expect(await warten).toEqual([]);
  });

  it('rechnet ohne Worker oder nach einem Ausfall selbst weiter', async () => {
    const ohne = createSuggester(INDEX, () => null);
    expect(await ohne.page('01.02.0030', 1)).toHaveLength(1);

    let worker: SuggestWorker | null = null;
    const kaputt = createSuggester(INDEX, () => {
      worker = {
        onmessage: null,
        onerror: null,
        postMessage: () => undefined,
        terminate: () => undefined,
      };
      return worker;
    });
    const warten = kaputt.page('01.02.0040', 1);
    (worker as SuggestWorker | null)?.onerror?.(new ErrorEvent('error'));
    expect(await warten).toMatchObject([{ id: 'p2' }]);
  });
});
