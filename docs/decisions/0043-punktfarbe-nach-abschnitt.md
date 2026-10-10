# 0043 – Punktfarbe im Graphen nach Hauptabschnitt

- **Status:** akzeptiert
- **Datum:** 2026-10-10
- **Betrifft:** Frontend, Graph
- **Ergänzt:** [0013 – Eine Gewerk-Farbskala für alle Ansichten](0013-gewerk-farbskala.md)

## Worum geht's

Die Punkte im Graphen waren nach Gewerk eingefärbt. Das Gewerk kommt aus dem Abgleich
mit dem STLB-Katalog. Ohne gute Klassifizierung ist es meist leer, die Punkte sind dann
grau.

## Entscheidung

- Ein Punkt hat die Farbe seines **Hauptabschnitts**. Das ist der oberste Abschnitt
  über der Position. Lose zählen dabei nicht.
- Es ist dieselbe Farbe wie in der Verteilung im Überblick (siehe 0040). Beide nutzen
  `lib/tree/mainSection.ts`.
- Die Farbe richtet sich nach der Stelle des Abschnitts im ganzen LV. Ein Filter
  verschiebt keine Farbe.
- Positionen ohne Abschnitt bleiben grau.
- Die Legende nennt die Abschnitte nur in der Matrix. Bei „nach LV“ stehen die
  Abschnitte schon als Gruppen im Graphen.
- Die Töne und ihre Tokens aus 0013 bleiben. Das Gewerk-Etikett in der Positionskarte
  behält die Gewerk-Farbe.

## Warum

- Der Abschnitt steht in jeder GAEB-Datei, das Gewerk nicht.
- So hat derselbe Abschnitt im Überblick und im Graphen denselben Ton.

## Verworfene Alternativen

- **Farbe nach Einheit:** In der Matrix ist die Einheit meist schon eine Achse.
- **Farbe nach Unterabschnitt:** Das ergibt zu viele Töne. Ab zehn Tönen wiederholen
  sich die Farben.

## Folgen

- Bei mehr als zehn Hauptabschnitten teilen sich zwei Abschnitte einen Ton.
- Die Kachel „Gewerke“ im Überblick hängt weiter am Gewerk.
