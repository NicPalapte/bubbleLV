# 0052 – Kein Bauteiltyp

- **Status:** akzeptiert
- **Datum:** 2026-10-15
- **Betrifft:** Klassifizierung (`frontend/src/lib/classify/`), Filter, Tabelle, Export,
  Matrix, Import-Protokoll, Ähnlichkeit

## Worum geht's

- Der Bauteiltyp kam aus einer Wortliste mit zwölf Typen (Wand, Decke, Stütze …), nur im
  Kurztext gesucht.
- Viele Bauteile trafen keinen Typ. Filter und Gruppierung zeigten ein lückenhaftes Bild.

## Entscheidung

- Die Erkennung ist entfernt. Es gibt kein Merkmal `bauteiltyp` mehr.
- Filter, Tabellenspalte, Export-Spalte, Matrix-Achse und der Import-Hinweis
  „Bauteil ohne Bauteiltyp“ fallen weg.
- Ähnliche Positionen werden nur noch nach Einheit vorgruppiert.

## Folgen

- Weniger, aber verlässliche Merkmale in Filter und Tabelle.
- Kommt der Bauteiltyp zurück, dann als Tabelle wie beim Beton
  (`docs/domain/reference/material/`), vom Owner geprüft.

## Verworfen

- **Wortliste erweitern:** bleibt Rätselraten ohne geprüfte Daten.
