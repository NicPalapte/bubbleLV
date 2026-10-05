# 0036 – Vergleich als Fenster über dem Graphen

- **Status:** akzeptiert
- **Datum:** 2026-10-05
- **Betrifft:** Frontend (Graph, Positionskarte, Tabelle, Fenster)
- **Ersetzt:** in 0031 das Entfernen des Vergleichs (Matrix und Ähnlichkeit bleiben
  entfernt)

## Worum geht's

0031 hat den Vergleich als eigene Ansicht entfernt. 0034 hat offengelassen, ob er als
Fenster zurückkommt. Nico hat ihn im Mockup als Fenster abgenommen und gewählt.

## Entscheidung

- Der Vergleich ist ein Fenster über dem Graphen, wie die Tabelle: verschiebbar, in der
  Größe änderbar.
- Höchstens **vier** Positionen. Danach nimmt Bubble keine weitere auf.
- Dazunehmen:
  - Knopf „⇄ Vergleichen" in der Positionskarte.
  - Shift + Klick auf einen Punkt im Graphen oder eine Zeile in der Tabelle.
  - Vorschläge unter „Ähnlich" im Fenster (gleiche Gruppe wie die erste Position).
- Die **erste** Spalte ist die Bezugsposition. Zellen, die von ihr abweichen, sind gelb.
  Im Langtext sind die Wörter gelb, die nicht in allen Texten stehen (wie 0020).
- Fenster schließen lässt die Positionen im Vergleich. Unten holt „⇄ Vergleich N" das
  Fenster zurück. „leeren" nimmt alle heraus.
- Die Auswahl im Vergleich gehört zu `selection`, das Fenster zu `view`. Filter und
  Suche bleiben unberührt.

## Warum

- Zwei Positionen nebeneinander ist die häufigste Frage beim Lesen eines LVs: Was ist
  hier anders?
- Als Fenster bleibt der Graph sichtbar. Die alte eigene Ansicht hat ihn verdeckt.
- Vier Spalten passen noch nebeneinander. Mehr wird unlesbar.

## Verworfene Alternativen

- **Unbegrenzte Auswahl, Fenster zeigt die ersten fünf** (alte Ansicht): Man sah nicht,
  welche Positionen draußen bleiben.
- **Abweichung zum Mehrheitswert statt zur ersten Spalte:** Bei zwei oder vier Spalten
  gibt es oft keine Mehrheit.

## Folgen

- Für Nico ist kein Handgriff nötig.
- Ein Reload leert den Vergleich, wie alles andere.
