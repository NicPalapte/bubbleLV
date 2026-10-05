# 0035 – Graph: Gliederung „nach LV" oder „frei", Hinweise im Graphen

- **Status:** akzeptiert
- **Datum:** 2026-10-05
- **Betrifft:** Bubble-Graph (`frontend/src/lib/graph/`, `frontend/src/components/graph/`)
- **Ersetzt:** 0008 (Positionen als Wolke um einen Baum-Knoten) und 0018 (Treffer isolieren)

## Worum geht's

Der alte Graph war ein Baum: Projekt in der Mitte, Lose und Abschnitte als Bubbles
drumherum, zum Aufklappen. Bei großen LVs musste man sich durchklicken, und Treffer
wurden in einem zweiten, „isolierten" Graphen gezeigt. Nico hat im Mockup einen
anderen Graphen abgenommen: alles auf einen Blick, Hinweise direkt am Punkt.

## Entscheidung

- **Eine Bildsprache:** Gruppen sind Kreise. Die Fläche folgt der Anzahl der
  Positionen. Die Positionen liegen als Punkte darin, eingefärbt nach Gewerk.
- **Gliederung „nach LV"** (Standard):
  - Jeder Abschnitt der **untersten Ebene** wird ein Kreis (Entscheidung von Nico
    am 05.10.2026).
  - Die Ebene darüber steht klein über dem Kreis.
  - Jedes Los ist eine gestrichelte Hülle um seine Kreise.
- **Gliederung „frei":**
  - Zeilen sind die Werte eines Merkmals (Standard: Einheit), Spalten optional die
    eines zweiten. So entsteht eine Matrix.
  - Gewählte Filterwerte bestimmen die Achsen. Ein neuer Filter wird von selbst zur
    Spalte, solange keine gesetzt ist.
  - Nur Merkmale mit genau einem Wert je Position (Einheit, Gewerk, Positionsart,
    Bauteiltyp, Positionstyp, Druckfestigkeit). Sonst stünde ein Punkt in mehreren
    Zellen.
- **Nicht-Treffer:** dimmen oder ausblenden. In „frei" sammeln sich gedimmte
  Nicht-Treffer im Kreis „übrige".
- **Größe der Punkte:** gleich, nach Menge oder nach Preis. Mengen vergleicht der
  Graph nur innerhalb derselben Einheit (wie 0019). „Preis" ist bei einer Datei ohne
  Preise gesperrt.
- **Hinweise im Graphen:**
  - Ein Ring an der Position, dazu ein Schild mit der Regel.
  - Schilder überlappen sich nie und weichen Fenstern und Beschriftungen aus. Ohne
    Platz entfällt das Schild, der Ring bleibt.
  - Der Schalter „⚠ Hinweise" unten rechts blendet Ringe und Schilder aus.
- **Linie zur Karte:** Von der gewählten Position führt eine gestrichelte Linie zur
  Positionskarte.
- **Lage der Kreise:** eine eigene Kreispackung (Frontkette nach Wang et al.,
  wie `packSiblings` in d3-hierarchy). Keine neue Bibliothek, weil nur diese eine
  Funktion gebraucht wird.

## Warum

- Ein LV mit 10.000 Positionen soll ohne Aufklappen lesbar sein. Die Packung legt
  10.000 Positionen in rund 15 ms.
- „frei" beantwortet Fragen, die die Gliederung des LV nicht beantwortet, z. B.
  „wie verteilen sich die Mengen nach Einheit und Gewerk?".
- Die erste Zielgruppe bekommt LVs ohne Preise. Deshalb messen Gruppen die Anzahl,
  nicht den Preis.

## Verworfene Alternativen

- **Oberste Ebene als Kreis:** weniger, aber größere Kreise. Unterabschnitte
  verschwinden darin.
- **Aufklappbare Kreise:** näher am alten Graphen, aber mehr Klicks und weicht vom
  Mockup ab.
- **d3-hierarchy als Abhängigkeit:** bringt viel mit, was Bubble nicht braucht.

## Folgen

- Für Nico ist kein Handgriff nötig.
- „Alles auf-/zuklappen" und die Isolation der Treffer fallen weg.
- Die Tastatur wandert mit den Pfeiltasten durch die Positionen (links/rechts) und
  die Gruppen (oben/unten). Enter öffnet die Karte.
