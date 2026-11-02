// Anzeige der eingebauten Bausteine im Regeleditor (Entscheidung 0089): Name und welche
// Parameter man in einer eigenen Kopie ändern darf. Die Logik selbst steht in
// lib/check/builtins.ts (Prüfung) und lib/docs/docSuggest.ts (PDF-Vorschläge).

/** Ein änderbarer Parameter: ganze Zahl zwischen `min` und `max`. */
export interface BuiltinParamInfo {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  /**
   * Wirkt schon beim Einlesen der Datei (Klassifizierung im Worker). Der Editor zeigt den
   * Wert, ändern lässt er ihn nicht: das neue Einlesen fehlt noch.
   */
  readonly atLoad?: true;
}

export interface BuiltinInfo {
  readonly name: string;
  readonly params: Readonly<Record<string, BuiltinParamInfo>>;
}

const INFO: Readonly<Record<string, BuiltinInfo>> = {
  'offene-stelle': {
    name: 'Offene Textergänzung',
    params: {
      'punktreihe-mindestlaenge': {
        label: 'Punkt- oder Strichreihe ab so vielen Zeichen',
        min: 2,
        max: 50,
        atLoad: true,
      },
    },
  },
  'einheit-schreibweise': { name: 'Einheit uneinheitlich', params: {} },
  bewehrung: {
    name: 'Beton ohne Angabe zur Bewehrung',
    params: {
      'positionen-im-titel': {
        label: 'Höchstens so viele Betonstahl-Positionen im Hinweis nennen',
        min: 1,
        max: 20,
      },
    },
  },
  nebenleistung: { name: 'Ausgeschriebene Nebenleistung', params: {} },
  'besondere-leistung': { name: 'Besondere Leistung ohne Position', params: {} },
  homogenbereiche: { name: 'Erdarbeiten ohne Homogenbereiche', params: {} },
  'oz-im-pdf': {
    name: 'OZ im Dokument',
    params: {
      'menge-hinter-oz': {
        label: 'Menge höchstens so viele Zeichen hinter der OZ',
        min: 0,
        max: 500,
      },
    },
  },
  'menge-im-pdf': {
    name: 'Menge im Dokument',
    params: {
      'kleinste-ganze-zahl': { label: 'Ganze Zahlen erst ab', min: 0, max: 10000 },
    },
  },
};

/** Name und Parameter eines eingebauten Bausteins; Unbekanntes unter seinem Namen ohne Werte. */
export function builtinInfoOf(name: string): BuiltinInfo {
  return Object.hasOwn(INFO, name) ? INFO[name] : { name, params: {} };
}
