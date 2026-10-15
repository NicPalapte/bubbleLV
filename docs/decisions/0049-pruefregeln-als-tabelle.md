# 0049 – Prüfregeln als Tabelle, Ranglisten keine Prüfregel

- **Status:** akzeptiert
- **Datum:** 2026-10-15
- **Betrifft:** Prüfregeln (`frontend/src/lib/check/`), `docs/domain/reference/`
- **Ergänzt:** [0045](0045-materialwissen-als-tabelle.md), [0048](0048-referenzdaten-ohne-kopie.md)

## Worum geht's

- Der Owner will alle Regeln an einem Ort sehen und selbst bearbeiten.
- Bisher standen Name, Hinweistext, Kategorie, Schwere, Schwellwerte und Suchwörter im Code.
- G1 (Kostentreiber) und G2 (Mengentreiber) meldeten die Top 10 als Hinweis. Der Owner
  sieht darin eine Wertung der Software.

## Entscheidung

- `pruefregeln.csv` führt je Regel auch Name, Kategorie, Schwere und Hinweistext.
- Neu: `pruefregeln-parameter.csv` für Schwellwerte, `pruefregeln-stichworte.csv` für
  Suchwörter (Schreibweise wie bei den Materialtabellen).
- Im Code bleibt nur die Logik je Regel (`CheckRule` = ID + Prüffunktion).
- Fehlt ein Eintrag, ist die Regel inaktiv und nennt den Grund — kein stiller Standardwert.
- G1 und G2 sind entfernt. Die Auswertung im Überblick zeigt die Listen weiter
  (Pareto, Größte Mengen je Einheit), ohne sie als Hinweis zu führen.

## Folgen

- Der Platzhalter-Extraktor (Klassifizierung) liest seine Wörter aus den Zeilen V7.
- V6 sucht selbst nach den Zeilen V6 und hängt nicht mehr an den Verweis-Arten der
  Klassifizierung. Welche Dokumente als „außerhalb des LV" gelten, entscheidet die Tabelle.
- Die Zaunbreite für Ausreißer gilt auch für die Gruppen ähnlicher Positionen.

## Verworfen

- **Ganze Regeln als Tabelle beschreiben** (Bedingungen, Verknüpfungen): wäre eine eigene
  Regelsprache — schwerer zu lesen als der Code.
- **G1/G2 auf `aus` setzen** statt entfernen: sie sollen nicht wiederkommen.
