# 0007 – Positionen als Wolke statt als Ring

- **Status:** akzeptiert
- **Datum:** 2026-09-11
- **Betrifft:** Bubble-Graph (`frontend/src/lib/graph/`, `frontend/src/components/graph/`)

## Worum geht's

Der Graph legte die Positionen eines Abschnitts auf einen Kreisring um ihn herum. Ein
Ring wächst linear mit der Anzahl: 92 Positionen ergaben einen Ringradius von rund
1.460 Einheiten. Bei der Beispieldatei aus Issue #41 (654 Positionen) hatte der ganze
Graph einen Durchmesser von etwa 40.000 — lesbar war davon nichts. Die Notlösungen
dagegen (Punkte, Sammel-Bubbles) waren genau das, was der Owner in Issue #41 und
Issue #46 gemeldet hat.

## Entscheidung

- **Positionen liegen als Wolke um ihren Abschnitt**, nicht auf einem Ring:
  Sonnenblumen-Anordnung, Position *i* bei Radius √(innen² + i·c²) und Winkel
  *i* × goldener Winkel. Der Wolkenradius wächst mit **√n** statt linear, weil eine
  Fläche gefüllt wird statt eines Umfangs.
- **Keine Sammel-Bubble für Positionen mehr** (Issue #46). Abschnitt und Positionen
  sind wieder eine Sache, nicht zwei Knoten.
- **Keine Kante je Position.** Die Zugehörigkeit zeigt die Fläche der Wolke.
- **Punkt-Darstellung (`DOT_AT`) entfällt.** Eine Position sieht überall gleich aus.
- `CLUSTER_AT` steigt von 24 auf **40** und gilt nur noch für Geschwister-**Abschnitte**.
- **Detailstufe:** Ist eine Wolke mit mehr als 8 Positionen auf dem Schirm kleiner als
  44 px, wird sie als *eine* Fläche mit Zähler gezeichnet.
- **Weiter Fächer:** Knoten mit mindestens 4 Kindern verteilen sie über 240° statt 180°.
- **Ketten werden nicht mehr gestreckt:** Bei genau einem Kind zählt nur der Abstand zur
  eigenen Bubble. Vorher wurde auch dort die Umfangs-Bedingung gerechnet, was
  Projekt → Los → Hauptabschnitt über die Breite des ganzen Teilbaums auseinanderzog.
- **Im Modus „Ausblenden" fallen Nicht-Treffer aus dem Layout**, die Wolke schrumpft auf
  die Treffer. Im Modus „Dämpfen" bleibt das Layout stehen, damit der Graph beim Tippen
  nicht unter der Maus wegspringt.
- Die Knöpfe an den Bubbles entfallen (Issue #49).

Messbares Ergebnis für die Beispieldatei-Struktur (29 Abschnitte à 23 Positionen):
Durchmesser **unter 6.000** statt rund 40.000. 10.000 Positionen in einem Abschnitt
werden in unter 100 ms platziert. Beides ist als Test festgeschrieben
(`frontend/tests/graph/layoutRadial.test.ts`).

## Warum

- Der Ring war die eigentliche Ursache, nicht die Symptome. Punkte und Sammel-Bubbles
  haben ihn nur kaschiert.
- Eine Wolke zeigt auf einen Blick, wie schwer ein Abschnitt wiegt — die Fläche ist die
  Information.
- Ohne Kante je Position verschwindet das Linien-Gestrüpp, das den Graphen unlesbar
  machte.

## Verworfene Alternativen

- **Ring beibehalten, nur enger stellen** – bei 92 Positionen bleibt es ein Ring von
  über 1.000 Einheiten. Linear ist linear.
- **Positionen dauerhaft in Sammel-Bubbles lassen** – dann zeigt der Graph das LV nicht,
  sondern nur seine Inhaltsangabe (genau der Befund aus Issue #46).
- **Kraft-gerichtetes Layout (force directed)** – rechnet je Frame, ist bei 10k Knoten
  nicht zu halten und liefert bei jedem Laden ein anderes Bild.
- **Voller Kreis (360°) für alle Verzweigungen** – dann müsste jeder Knoten den ganzen
  Teilbaum seines größten Kindes umrunden. Für Ketten wäre das deutlich schlechter als
  heute; deshalb 240° und erst ab vier Kindern.

## Folgen

- `PlacedNode.dotted` entfällt, `PlacedNode.cloudOf` kommt dazu; `layoutRadial` liefert
  zusätzlich `clouds`.
- Wer den Graphen erweitert, muss zwischen **Ring-Kindern** (Abschnitte) und
  **Wolken-Kindern** (Positionen) unterscheiden.
- Für den Owner ändert sich nichts an der Bedienung außer: die beiden Knöpfe an den
  Bubbles sind weg. Aufklappen per Klick auf die Bubble, Tabelle über die Kopfleiste.
