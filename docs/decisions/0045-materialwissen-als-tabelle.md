# 0045 – Materialwissen als Tabelle je Material

- **Status:** akzeptiert
- **Datum:** 2026-10-11
- **Betrifft:** Klassifizierung, Filter, Positionskarte, Export, Prüfregeln
- **Folgt auf:** [0044 – Leistungsbereich entfernt](0044-leistungsbereich-entfernt.md)

## Worum geht's

Bubble soll erkennen, aus welchem Material eine Position ist, und was zu diesem
Material dazugehört. Beispiel Beton: „C20/25" oder „XC4" im Text heißt Beton. Dann
interessiert, welche Art von Beton, welche Bauweise und ob die Bewehrung in der
Position steht oder woanders. Das Wissen dafür kommt vom Owner, nicht aus dem Code.

## Entscheidung

- Je Material **eine CSV-Datei** unter `docs/domain/reference/material/`, z. B.
  `beton.csv`. Der Dateiname ist der Name des Materials.
- Spalten: `merkmal` · `wert` · `stichworte` · `ausser` · `bemerkung`.
  - Zeilen mit Merkmal „Erkennung": woran das Material zu erkennen ist.
  - Alle anderen Zeilen: welcher Wert gilt, wenn ein Stichwort trifft.
  - `ausser`: Wörter, die trotz Treffer nicht zählen (z. B. „Betonstahl").
  - `bemerkung`: nur für Menschen.
- Schreibweise der Stichworte für Excel: `*` = beliebige Buchstaben, `#` = Zahl,
  `|` trennt Stichworte. Ein Stichwort trifft nur ganze Wörter.
- Merkmale werden nur gesucht, wenn das Material erkannt ist.
- Jedes Merkmal wird von selbst ein Filter, eine Zeile in der Positionskarte und eine
  Spalte im Export.
- Neue Prüfregel **M1**: Betonposition mit Festigkeitsklasse, aber ohne Angabe zur
  Bewehrung. Der Hinweis nennt die Betonstahl-Positionen im selben Hauptabschnitt.
- Festigkeits- und Expositionsklasse liest die App weiter wie bisher (DIN EN 206).
  Die Tabelle nutzt sie zur Erkennung.
- Der CSV-Leser nimmt jetzt auch `;` als Trennzeichen und eine Byte-Order-Mark
  (ein unsichtbares Zeichen am Dateianfang) — so speichert ein deutsches Excel.

## Warum

- Owner-Vorgabe (2026-10-11): Wissen als Daten, übertragbar auf andere Materialien.
- CSV lässt sich in Excel pflegen, ohne Code zu ändern.
- Ein neues Material ist eine neue Datei; der Code kennt kein Material beim Namen
  (Ausnahme: Regel M1 sucht `beton.csv` und `betonstahl.csv`).

## Verworfene Alternativen

- **YAML-Datei:** schwerer in Excel zu pflegen.
- **Echte reguläre Ausdrücke in der Tabelle:** für Excel-Nutzer zu fehleranfällig;
  `*` und `#` reichen für Klassen wie „C#/#".
- **Eine Tabelle für alle Materialien:** wird schnell unübersichtlich.

## Folgen

- Inhalte von Beton und Betonstahl sind ein Entwurf von Claude. Der Owner prüft sie.
- Pflege-Anleitung: `docs/setup/materialwissen.md`.
- Weitere Materialien (Mauerwerk, Stahl, Holz) kommen als weitere Dateien.
