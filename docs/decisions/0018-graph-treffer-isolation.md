# 0018 – Treffer im Graphen: drei Ansichten statt einer

- **Status:** akzeptiert
- **Datum:** 2026-09-22
- **Betrifft:** Frontend, Bubble-Graph, Issues #51 und #60

## Worum geht's

Bisher hat der Graph bei Suche und Filter nur hervorgehoben: Treffer leuchten,
der Rest wird gedämpft oder ausgeblendet. Die Gliederung des LV bleibt stehen —
bei wenigen Treffern in einem großen LV sieht man vor lauter Struktur die
Treffer nicht.

Gewünscht war (Issue #60): Treffer sollen **eigene Gruppen** bilden und alles
andere soll weg.

## Entscheidung

Der Graph kennt drei Trefferansichten, umschaltbar in der Kopfleiste:

| Ansicht | Was man sieht |
|---|---|
| **Struktur** | wie bisher: LV-Baum, Treffer hervorgehoben |
| **Isolieren** | nur die Treffer, neu gebündelt — die Gliederung tritt weg |
| **Geteilt** | beides nebeneinander, eine Auswahl, ein Filter |

- Gebündelt wird nach **Abschnitt, Gewerk oder Bauteiltyp**; die größte Gruppe
  steht vorn, gemessen am eingestellten Größenmodus.
- Der Umschalter ändert **nie** Filter, Suche oder Auswahl.
- Ohne aktiven Filter gibt es nichts zu isolieren: dann zeigt der Graph immer
  die Struktur, und der Umschalter erscheint gar nicht.

## Warum so

Die Isolation ist **kein zweiter Graph**, sondern ein synthetischer Baum
(`frontend/src/lib/graph/focusTree.ts`): Wurzel → eine Gruppe je Wert → die
Treffer darin. Er läuft durch dasselbe Layout und denselben Renderer wie die
Struktur.

- Kein zweiter Layout-Algorithmus, kein zweiter Renderer, keine zweite
  Tastaturbedienung — alles, was am Graphen schon funktioniert, funktioniert
  hier sofort mit.
- Die Positionsknoten im Isolations-Baum sind **dieselben Objekte** wie im
  echten Baum, keine Kopien. Deshalb gilt die Auswahl in beiden Hälften der
  geteilten Ansicht, und die Gewerk-Farben stimmen ohne Zutun.
- Gebaut wird der Baum einmal je Filterwechsel im Provider, nicht im Render.
  Bei 10.000 Treffern kostet das wenige Millisekunden (Test in
  `tests/graph/focusTree.test.ts`).

## Verworfene Wege

- **Isolation statt Struktur, ohne Umschalter:** Der Owner will beides und den
  Wechsel dazwischen — die Struktur beantwortet „wo im LV steckt das?", die
  Isolation „was habe ich eigentlich getroffen?".
- **Treffer-Gruppen zusätzlich am Rand der Struktur:** Zwei Ordnungen in einem
  Bild; die Kanten hätten sich gekreuzt und der Graph wäre unruhig geworden.
  Die geteilte Ansicht zeigt dasselbe, nur sauber getrennt.
- **Cluster der Ansicht „Ähnlichkeit" wiederverwenden** (WP-M): Die bündeln nach
  Textähnlichkeit, nicht nach dem Filter. Ein Treffer-Bündel muss zeigen, warum
  etwas getroffen wurde, nicht was sich ähnelt.
- **Eine Gruppe je auslösender Facette** (ursprünglich so im Plan): Bei einer
  Volltextsuche gibt es keine auslösende Facette — dann wäre die Bündelung mal
  da und mal weg. Drei feste Merkmale sind vorhersehbar.

## Folgen

- Eine Gruppen-Bubble ist **kein LV-Knoten**. Sie lässt sich nicht auswählen und
  nicht auf- oder zuklappen (ihre Positionen stehen immer offen); ein Klick
  passt den Ausschnitt auf sie ein. Der Sprung in die Tabelle kommt mit WP-Q
  Schritt 5.
- Die Isolation merkt sich keinen Ausschnitt: ihr Baum wechselt mit jedem
  Filterzug. Sie passt sich jedes Mal neu ein — und in der geteilten Ansicht
  tut das auch die Strukturhälfte, weil der gemerkte Ausschnitt aus einer
  doppelt so breiten Canvas stammt.
- Mehrwertige Merkmale (etwa Expositionsklassen) taugen nicht als
  Bündelungsmerkmal: dieselbe Position läge in mehreren Gruppen. Die drei
  angebotenen Merkmale sind einwertig.
