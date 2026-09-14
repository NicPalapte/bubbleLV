// Einheiten zusammenführen, die nur anders geschrieben sind. GAEB liefert das
// Feld <QU> als freien Text; ein LV, das aus mehreren Teil-LVs entstanden ist,
// schreibt dieselbe Einheit deshalb regelmäßig verschieden ("psch" und "PSCH").
// Ohne Zusammenführung stünden zwei Filterwerte für eine Einheit — der Filter
// würde die Hälfte der Pauschalpositionen übersehen.
//
// **Nur der Filter führt zusammen.** Tabelle und Eigenschaften-Panel zeigen
// weiter den Wortlaut aus der Datei: Bubble macht ein LV lesbar, es schreibt es
// nicht um.
//
// Zusammengeführt wird ausschließlich, was **dieselbe Einheit anders schreibt**:
// Groß-/Kleinschreibung, Leerraum und hochgestellte Ziffern. Alles Weitere wäre
// eine fachliche Aussage: „Stk" und „Stück" sind dasselbe, „lfm" und „m" aber
// nicht — das eine ist eine Abrechnungsart. Diese inhaltlichen Gruppen kommen
// mit WP-K als gepflegte Referenzliste dazu, nicht als geratene Regel im Code.

/** Hochgestellte Ziffern, wie sie in "m²"/"m³" vorkommen. */
const SUPERSCRIPT: Readonly<Record<string, string>> = { '¹': '1', '²': '2', '³': '3' };

/**
 * Vergleichsschlüssel einer Einheit. Gleicher Schlüssel = gleiche Einheit,
 * nur anders geschrieben. `null` für fehlende oder leere Angaben.
 */
export function canonicalUnit(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const key = raw
    .replace(/[¹²³]/g, (char) => SUPERSCRIPT[char])
    .replace(/\s+/g, '')
    .toLowerCase();
  return key === '' ? null : key;
}

/**
 * Anzeigename eines Schlüssels im Filter. Nur dort, wo es eine eindeutige
 * Schreibweise gibt — sonst steht der Schlüssel selbst, und er steht klein,
 * weil die Groß-/Kleinschreibung ja gerade zusammengeführt wurde.
 */
const LABELS: Readonly<Record<string, string>> = { m2: 'm²', m3: 'm³' };

export function unitLabel(key: string): string {
  return LABELS[key] ?? key;
}
