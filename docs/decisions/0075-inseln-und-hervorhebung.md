# 0075 – Graph: Inseln je Hauptabschnitt, Abschnitt hervorheben

- **Status:** akzeptiert; Umschalter blass/ausblenden ersetzt durch 0078
- **Datum:** 2026-10-25
- **Betrifft:** Layout „nach LV“ (`frontend/src/lib/graph/layoutMap.ts`), Bubble-Graph
  (`frontend/src/components/graph/BubbleGraph.tsx`), Ansichtszustand (`graph.spotlight`,
  `graph.spotlightHide` in `frontend/src/state/viewState.ts`)
- **Ergänzt:** 0035 (Gliederung „nach LV“)

## Worum geht's

- Nico: Die Blasen auf dem Startbildschirm wirken zufällig sortiert.
- Grund: Der Graph packte alle Unterabschnitte nur nach Größe, die größten in die Mitte.
  Abschnitte und Farben lagen bunt gemischt.
- Mockup mit drei Varianten (Inseln, Zeilen, Spirale): Nico wählte am 2026-10-25 die
  Inseln. Dazu wollte er Haupt- und Unterabschnitte anklicken und im Graphen
  hervorheben.

## Entscheidung

- **Insel je Hauptabschnitt:** Die Unterabschnitte eines Hauptabschnitts liegen dicht
  beisammen, die größten innen. Um sie eine gestrichelte Hülle mit Titel.
- **Lesereihenfolge:** Die Inseln stehen in OZ-Reihenfolge von links nach rechts, dann
  die nächste Reihe. Gibt es Lose, gilt das erst je Los, dann für die Lose.
- **Anklicken:** Klick auf eine Insel (Titel oder freie Fläche darin) wählt den
  Hauptabschnitt, Klick auf einen Kreis den Unterabschnitt. Der Abschnitt wird
  hervorgehoben; der Ausschnitt bleibt, wie er ist.
- **Hervorhebung:** Rand in Ziegelrot, alles andere blass oder ausgeblendet
  (Umschalter oben rechts im Graphen). ✕ oder ein Klick ins Leere hebt sie auf.
- **Kein Filter:** Die Hervorhebung ist reine Darstellung im Graphen. Filter, Suche,
  Tabelle und Überblick bleiben unberührt. Wählt man etwas außerhalb des Abschnitts
  (etwa in der Tabelle), endet die Hervorhebung.
- Gilt nur in „nach LV“. In der „Matrix“ bleibt alles wie bisher.

## Warum

- Die Gliederung des LV ist auf einen Blick lesbar; eine Farbe ist eine Insel.
- Inseln sehen aus wie die bisherigen Los-Hüllen, nichts Neues zu lernen.
- Hervorheben als Darstellung statt als Filter: Ein Bereich zu öffnen oder zu wählen
  ändert nie den Filter (Kritische Constraints in `.claude/CLAUDE.md`).

## Verworfene Alternativen

- **Beim Klick automatisch einpassen:** gebaut und am 2026-10-25 von Nico verworfen —
  der Zoom springt zu sehr. Einpassen geht über den Knopf an der Steuerung.

- **Zeilen in OZ-Reihenfolge:** streng lesbar, aber bei vielen Unterabschnitten sehr
  breit, wirkt eher wie eine Tabelle.
- **Spirale in OZ-Reihenfolge:** bleibt rund, aber Reihenfolge nur grob lesbar und keine
  Titel für Hauptabschnitte.
- **Hervorheben als Filter „Abschnitt“:** hätte Tabelle und Überblick mitgezogen und
  einen neuen Filter gebraucht.

## Folgen

- Nichts einmalig zu tun.
- Der Graph braucht etwas mehr Fläche als vorher; beim Laden passt er sich wie bisher ein.
