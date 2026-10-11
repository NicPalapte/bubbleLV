// Minimaler CSV-Leser für die gepflegten Referenzdateien unter
// docs/domain/reference/. Bewusst klein: Trennzeichen `,` oder `;`, doppelte
// Anführungszeichen für Felder mit Komma, `""` als escaptes Zitat. Keine
// Abhängigkeit — eine CSV-Bibliothek wäre für vier Spalten zu viel.
//
// Alle Referenzdateien werden zur Build-Zeit als Rohtext eingebunden; zur
// Laufzeit gibt es keinen Fetch (docs/architecture/pipeline.md).

/** Eine CSV-Zeile in Felder zerlegen, Leerraum je Feld entfernt. */
export function splitCsvLine(line: string, delimiter = ','): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char !== '"') current += char;
      else if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      fields.push(current);
      current = '';
    } else current += char;
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

/** Zugriff auf die Felder einer Zeile über den Spaltennamen. */
export interface CsvRow {
  get(column: string): string;
}

/**
 * Datenzeilen einer CSV. Die Kopfzeile bestimmt die Spaltennamen
 * (kleingeschrieben); leere Zeilen fallen weg. Eine Datei mit nur der
 * Kopfzeile liefert eine leere Liste — genau der Zustand „Referenzdaten
 * fehlen ⇒ Regel inaktiv, kein Fehler".
 */
export function parseCsv(csv: string): CsvRow[] {
  // „CSV UTF-8" aus Excel beginnt mit einer Byte-Order-Mark; sie gehört nicht
  // zum ersten Spaltennamen.
  const lines = csv
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  // Ein deutsches Excel speichert CSV mit `;`. Die Kopfzeile verrät, welches
  // Zeichen die Datei nutzt — sie enthält nie ein Komma in einem Spaltennamen.
  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const header = splitCsvLine(lines[0], delimiter).map((field) => field.toLowerCase());
  return lines.slice(1).map((line) => {
    const fields = splitCsvLine(line, delimiter);
    return {
      get(column: string): string {
        const index = header.indexOf(column.toLowerCase());
        return index < 0 ? '' : (fields[index] ?? '');
      },
    };
  });
}

/** Pipe-getrennte Liste eines Feldes, kleingeschrieben und ohne Leereinträge. */
export function splitList(value: string): string[] {
  return value
    .split('|')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '');
}
