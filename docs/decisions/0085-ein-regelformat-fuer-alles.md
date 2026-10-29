# 0085 – Ein Regelformat für alles

- **Status:** akzeptiert (Schritt 1 von 5 umgesetzt)
- **Datum:** 2026-10-29
- **Betrifft:** Kern (`packages/core/src/rules/rule.ts`, `evaluate.ts`), Regeln in der App
  (`frontend/src/lib/rules/`), Regeleditor (`frontend/src/components/admin/`)
- **Ergänzt:** 0081 (Regeleditor und `bubble-rule-v1`)
- **Ersetzt später:** Teile von 0048/0049 (Prüfregeln als Tabelle), 0053 (gelernte
  Begriffe), 0080 (Werte der PDF-Vorschläge) — je mit dem PR, der die Regeln umzieht
- **Plan:** „Plan: Ein Regelformat für Conocto:Doc“ (Claude Doc, 2026-10-28)

## Worum geht's

- Heute gibt es vier getrennte Regelwelten: Prüfregeln (Code + CSV), Hervorhebungen,
  OZ- und Mengen-Vorschläge im PDF (Code) und eigene Regeln (`bubble-rule-v1`).
- Nico will ein einheitliches Regelformat. Alles soll im Reiter „Regeln“ stehen,
  abschaltbar und als Vorlage kopierbar sein.

## Entscheidung

- **Ein Format:** alle Regeln werden Einträge in `bubble-rule-v1`. Das Format aus 0081
  bleibt, es kommen nur Teile dazu.
- **Neue Bausteine:**
  - `liste`: ein Wort aus einer Wortliste (z. B. Hersteller).
  - `einheit`: die Einheit der Position liegt in einer Einheiten-Gruppe (z. B. Stunde).
  - `feld`: eine Angabe der Position fehlt oder hat einen Wert (Menge leer, Art Bedarf).
  - `eingebaut`: feste Logik im Code mit Parametern, für Schwieriges wie offene
    Textstellen oder die OZ im PDF. Steht allein in der Bedingung.
- **Angaben gelten für die ganze Position.** Bei „alle“ müssen sie stimmen, damit der Text
  zählt. Bei „eines“ reicht eine. Stimmt eine unter „nicht“, trifft die Regel nicht.
- **Neuer Suchort `pdf`:** Text eines geöffneten Begleit-PDFs. Nur zusammen mit der
  Wirkung „mit PDF verknüpfen“.
- **Neue Wirkungen:**
  - `pruefhinweis`: Kategorie, Schwere, Text, Norm-Verweis mit Stand. Grundstock-Regeln
    nennen immer ihre Norm. Eigene Regeln dürfen ohne Norm, sie stehen dann getrennt als
    „eigene Regel“ in „Prüfung“.
  - `verknuepfen` mit `ziel: "pdf"`: schlägt eine Stelle im PDF zum Verknüpfen vor.
- **Inhalte liefert die App:** Wortlisten und Einheiten-Gruppen bleiben CSV (pflegbar in
  Excel), dazu später auch in der Oberfläche. Eingebaute Logik steht in der App. Fehlt
  etwas, trifft der Baustein nichts, ohne Fehler.
- **Grundstock** lässt sich nur abschalten und als eigene Regel kopieren, nicht ändern.
- **PDF-Schalter** (OZ-/Mengen-Vorschläge) werden künftig im Projekt gemerkt und bei einem
  neuen LV zurückgesetzt.
- **Ältere Versionen** lesen Regeln mit neuen Teilen nicht ein und laufen ohne sie weiter.
  Der Editor zeigt solche Regeln bis Schritt 5 nur an.
- **Reihenfolge:** 1. Format im Kern · 2. Prüfregeln umziehen · 3. PDF-Vorschläge umziehen ·
  4. Hervorhebungen umziehen · 5. Editor erweitern (vorher Mockup). Ergebnisse in „Prüfung“
  und im PDF bleiben dabei gleich, je PR sichert das ein Vergleichstest alt gegen neu.

## Verworfene Alternativen

- **Wortlisten in `regeln.json`:** eine Liste ist Wissen, keine Logik. In CSV lässt sie
  sich in Excel pflegen.
- **Alles als Bausteine, ohne eingebaute Logik:** offene Textstellen, OZ-Erkennung oder die
  Einheiten-Prüfung über das ganze LV wären als Bausteine schwer lesbar und langsam.
- **Grundstock direkt ändern:** dann gälte er nicht mehr für alle Firmen gleich.

## Folgen

- Bis Schritt 5 sieht man in der App nichts Neues.
- Für den Owner gibt es nichts einmalig zu tun.
