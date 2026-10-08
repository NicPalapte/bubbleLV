# 0040 – Auswertungen aus dem, was im LV steht

- **Status:** akzeptiert
- **Datum:** 2026-10-08
- **Betrifft:** Frontend (Überblick, Graph-Gliederung, Filterfenster)
- **Ergänzt:** 0035 (Graph-Gliederung)

## Worum geht's

Die Klassifizierung ist noch nicht gut genug, um Auswertungen darauf zu stützen. Das gilt
vor allem für das Gewerk, weil der STLB-Katalog fast nur Nummer und Name kennt. Die
ersten Nutzer bekommen meist LVs ohne Preise (x83). Bubble soll zuerst mit dem
auskommen, was in jeder Datei steht. Zusatzwissen kommt Schritt für Schritt dazu,
angefangen mit Beton.

## Entscheidung

- **Verteilung im Überblick:** Blöcke sind die Hauptabschnitte (oberste Abschnittsebene,
  Lose übersprungen), darin die Mengeneinheiten. Die Fläche ist die Anzahl der
  Positionen, bei Dateien mit Preisen die Summe. Bisher war es Gewerk × Abschnitt.
- **Ohne Preise statt Pareto:** „Größte Mengen“ zeigt je Einheit die Positionen mit der
  größten Menge. Einheiten werden nie gemischt. Pauschalen fehlen, ihre Menge ist 1.
  Mit Preisen bleibt Pareto. Ohne Preise entfällt auch „Mengen je Einheit“, die
  Einheiten stehen schon in „Größte Mengen“.
- **Graph:** Die Gliederung „frei“ heißt jetzt „Matrix“. Neue Achse „Abschnitt“ (der
  Abschnitt direkt über der Position, in LV-Reihenfolge).
- **Mengenfilter:** Der Regler steht direkt im Filterfenster, ohne Knopf davor.

## Warum

- Abschnitt, Einheit und Menge stehen in jeder GAEB-Datei. Die Aussagen stimmen damit
  auch ohne Katalog.
- Eine Rangfolge über verschiedene Einheiten (m² neben m³) wäre eine Scheinaussage.

## Verworfene Alternativen

- **Größte Mengen über alle Einheiten:** nicht vergleichbar.
- **Verteilung nach unterstem Abschnitt:** bei großen LVs hunderte Kacheln, die meisten
  unlesbar klein.
- **Abschnitt als eigener Filter:** nicht verlangt. Anwählen eines Abschnitts im Graphen
  oder in der Verteilung reicht vorerst.

## Folgen

- Für Nico ist kein Handgriff nötig.
- Die Punktfarben im Graphen und die Kennzahl „Gewerke“ hängen weiter am Gewerk.
  Welche Stellen noch Klassifizierung brauchen, steht in der Liste im Projektordner
  (`hauptscreen/klassifikation-nutzung.md`).
