// Textaufbereitung für den Ähnlichkeitsvergleich (WP-M, Schritt 1).
//
// Zwei Positionen sind fachlich dieselbe Leistung, auch wenn sie "24 cm" und
// "30 cm" schreiben — das ist eine Variante, kein anderer Vorgang. Zahlen und
// Einheiten werden deshalb **maskiert**: sie fallen aus dem Textvergleich
// heraus und tauchen als unterscheidendes Merkmal wieder auf (die Maße stehen
// bereits klassifiziert in `attributes`, siehe classify/extractors/masse.ts).
//
// Getrennt von `classify/text.ts`: dort geht es um Stichwort-Treffer in
// Komposita ("Stahlbetonarbeiten" enthält "betonarbeiten"), hier um den
// Vergleich zweier Texte miteinander. Beides teilt nur das Kleinschreiben.

/** Platzhalter für jede Zahl — "24" und "30" sollen gleich aussehen. */
const ZAHL = '#';
/** Platzhalter für eine Maßeinheit im Fließtext ("cm", "kg"). */
const EINHEIT = '#e';

/**
 * Einheiten, die im Fließtext direkt an einer Zahl hängen. Bewusst kurz
 * gehalten: die Abrechnungseinheit der Position steht im Feld `unit` und
 * gruppiert ohnehin vor (similarity.ts), hier geht es nur um Maßangaben.
 */
const EINHEITEN: ReadonlySet<string> = new Set([
  'mm',
  'cm',
  'dm',
  'm',
  'm2',
  'm3',
  'km',
  'kg',
  'g',
  't',
  'to',
  'l',
  'ltr',
  'stk',
  'stck',
  'st',
  'h',
  'std',
  'min',
  'kn',
  'mpa',
  'n',
]);

/**
 * Wörter ohne Aussagekraft für die Ähnlichkeit. Nur Funktionswörter — kein
 * Fachwort steht hier: "liefern", "einbauen" oder "herstellen" unterscheiden
 * Positionen sehr wohl voneinander.
 */
const STOPPWOERTER: ReadonlySet<string> = new Set([
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'ein',
  'eine',
  'einer',
  'eines',
  'einem',
  'einen',
  'und',
  'oder',
  'sowie',
  'als',
  'wie',
  'mit',
  'ohne',
  'für',
  'fuer',
  'von',
  'vom',
  'zur',
  'zum',
  'zu',
  'aus',
  'auf',
  'bei',
  'beim',
  'im',
  'in',
  'an',
  'am',
  'nach',
  'über',
  'ueber',
  'unter',
  'je',
  'pro',
  'ist',
  'sind',
  'wird',
  'werden',
  'bis',
  'auch',
  'nur',
  'dabei',
  'daran',
  'dazu',
  'sowohl',
  'ggf',
  'bzw',
  'inkl',
  'incl',
  'einschl',
  'usw',
]);

/**
 * Text → Wortfolge, kleingeschrieben, Zahlen und Einheiten maskiert,
 * Funktionswörter entfernt. Die Reihenfolge bleibt erhalten — die Schindeln
 * unten brauchen sie.
 */
export function relateTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const raw of text.toLowerCase().split(/[^0-9a-zäöüß²³]+/)) {
    if (raw === '') continue;
    if (/^\d/.test(raw)) {
      // "30cm" kommt als ein Token an — Zahl und Einheit zusammen maskieren.
      tokens.push(ZAHL);
      const rest = raw.replace(/^[\d.,]+/, '');
      if (rest !== '') tokens.push(EINHEITEN.has(normalizeUnitToken(rest)) ? EINHEIT : rest);
      continue;
    }
    const token = normalizeUnitToken(raw);
    if (EINHEITEN.has(token)) {
      tokens.push(EINHEIT);
      continue;
    }
    if (STOPPWOERTER.has(raw) || raw.length < 2) continue;
    tokens.push(raw);
  }
  return tokens;
}

/** "m²" und "m2" sind dieselbe Einheit — der Vergleich kennt nur eine Form. */
function normalizeUnitToken(token: string): string {
  return token.replace(/²/g, '2').replace(/³/g, '3');
}

/**
 * Wort-Schindeln: aufeinanderfolgende Wortpaare. Sie messen nicht nur, welche
 * Wörter vorkommen, sondern auch in welcher Nachbarschaft — "Wand abbrechen"
 * und "Decke abbrechen" teilen sich sonst die halbe Wortmenge.
 *
 * Unter zwei Wörtern gibt es kein Paar; dann steht das einzelne Wort für sich,
 * sonst hätte ein zweiwortiger Kurztext gar keine Vergleichsgrundlage.
 */
export function shingles(tokens: readonly string[]): Set<string> {
  if (tokens.length < 2) return new Set(tokens);
  const out = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) out.add(`${tokens[i]} ${tokens[i + 1]}`);
  return out;
}

/** Jaccard-Maß zweier Mengen: gemeinsame Schindeln durch alle Schindeln. */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  // Über die kleinere Menge laufen — bei langen Texten spart das die Hälfte.
  const [klein, gross] = a.size <= b.size ? [a, b] : [b, a];
  let gemeinsam = 0;
  for (const entry of klein) if (gross.has(entry)) gemeinsam++;
  return gemeinsam / (a.size + b.size - gemeinsam);
}
