// Erfundene Positionen und PDF-Seiten für den Vergleich der Vorschläge im Begleitdokument
// vor und nach dem Umzug ins Regelformat (Entscheidung 0087). Alle Texte sind erfunden.

import type { SuggestPosition } from '../../src/lib/docs/docSuggest';

export const POSITIONEN: SuggestPosition[] = [
  { id: 'p1', oz: '01.02.0030', quantity: 120, unit: 'm3', shortText: 'Boden lösen und laden' },
  { id: 'p2', oz: '01.02.0040', quantity: 1234.5, unit: 'm2', shortText: 'Estrich CT-C30' },
  { id: 'p3', oz: '01.03.0030', quantity: 3, unit: 'St', shortText: 'Schachtabdeckung' },
  { id: 'p4', oz: '01.03.0050', quantity: 88, unit: 'm', shortText: 'Rinne aus Ortbeton' },
  { id: 'p5', oz: '02.01.0010', quantity: 88, unit: 'm', shortText: 'Kabelschutzrohr DN 110' },
  { id: 'p6', oz: '02.01.0020', quantity: 1, unit: 'psch', shortText: 'Baustelle einrichten' },
  { id: 'p7', oz: '02.01.0070', quantity: 42.75, unit: 't', shortText: 'Betonstahl liefern' },
  { id: 'p8', oz: '3.1.10', quantity: 350, unit: 'm3', shortText: 'Schottertragschicht 0/45' },
  { id: 'p9', oz: '3.1.20', quantity: 2300, unit: 'm2', shortText: 'Asphaltbinderschicht' },
  { id: 'p10', oz: '3.1.30', quantity: 2300, unit: 'm2', shortText: 'Asphaltdeckschicht AC 8' },
  { id: 'p11', oz: '3.1.40', quantity: 8, unit: 'St', shortText: 'Straßenablauf setzen' },
];

const FUELL = 'Die Leistung ist nach den Plänen auszuführen und abzustimmen. '.repeat(2);

export const SEITEN: string[] = [
  'Siehe 01.02.0030 und 1.2.40 sowie 01-03-0050. Wie in 01.02.\n0030 beschrieben.',
  '02 01 0070 42,75 t Stahl. OZ 01.02.0099, 01.02 und 01.02.0030.1 gibt es nicht.',
  'Am 01.02.2030 um 1,2,40 Uhr; Nr. 101.02.0030; 01.02.0030,5 m. Pos. 30 und Position 0030.',
  'Pos. 70 ist zu beachten, 70 Stück ohne Kontext nicht. Siehe Position Nr. 3.30 und OZ 2.30.',
  'Es sind 1.234,50 m² Gussasphalt und 120 cbm Kies. 88 m Rigole, 3 St Schächte, 1 psch.',
  'Erdarbeiten. Danach werden ca. 42,75 t Betonstahl verlegt. Ende.',
  'Im Hof sind 88 m Kabelschutzrohre zu verlegen. Es folgen 88 m Ortbetonrinne.',
  'Es folgen 88 m Rinne neben dem Kabelschutzrohr. Es folgen 88 m Leitung.',
  'Die Fahrbahn wird neu aufgebaut:\nSchottertragschicht rd. 350 m³, ' +
    'Asphaltbinderschicht AC 16 BN und Asphaltdeckschicht AC 8 DN auf\nje rd. 2.300 m².',
  'Pos. 01.02.0030: 110 m³ Boden lösen. Pos. 3.1.40 mit 8 St Abläufen, dazu 8 St weitere.',
  `Pos. 01.02.0040 ${FUELL}1.234,50 m² Estrich. 3.1.10 rd. 350 m³ Schotter.`,
  'Asphaltbinderschicht 2.300 m² und Asphaltdeckschicht. 120 m³ Boden lösen, 42,75 t.',
];
