# 0078 – Schlanke Startansicht, ein Schalter für blass/ausblenden

- **Status:** akzeptiert
- **Datum:** 2026-10-26
- **Betrifft:** Startanordnung (`INITIAL_WORKSPACE` in `frontend/src/state/viewState.ts`),
  Schalter „Nicht-Treffer“ (`HideModeToggle` in `frontend/src/components/layout/TopBar.tsx`),
  Hervorhebung im Graphen (`frontend/src/components/graph/BubbleGraph.tsx`)
- **Ersetzt:** in 0075 den eigenen Umschalter „Andere: blass/ausblenden“ im Graphen;
  ergänzt 0058 und 0074

## Worum geht's

- Nico: Die Startansicht soll nur Graph und Positionskarte zeigen.
- Bisher stand die Tabelle beim Start schon unter dem Graphen.
- Nico: Ist ein Abschnitt hervorgehoben, soll blass/ausblenden am selben Schalter hängen
  wie bei Filter und Suche („Nicht-Treffer“ in der Suchleiste).
- Bisher gab es dafür einen zweiten, eigenen Umschalter oben rechts im Graphen.

## Entscheidung

- **Start:** nur Graph und Position. Tabelle, Überblick, Prüfung und Dokument sind zu und
  gehen über „Ansicht“, die Kennzahlen oder einen Sprung auf.
- „Anordnung zurücksetzen“ führt zu dieser Startansicht zurück.
- Eine gemerkte Anordnung (0073) gilt weiter. Wer schon eine hat, sieht die neue
  Startansicht erst nach „Anordnung zurücksetzen“.
- **Ein Schalter:** „Nicht-Treffer“ in der Suchleiste regelt auch, ob die übrigen
  Abschnitte blass oder ausgeblendet sind.
- Der Schalter erscheint, sobald gefiltert wird **oder** ein Abschnitt hervorgehoben ist.
- Oben rechts im Graphen bleibt nur der Name des Abschnitts mit ✕.

## Warum

- Weniger auf dem ersten Bildschirm, gerade am Tablet. Der Graph bekommt mehr Fläche.
- Ein Schalter für dieselbe Frage („Was passiert mit dem Rest?“) statt zwei.

## Verworfene Alternativen

- **Gemerkte Anordnung beim Update verwerfen:** Alle sähen sofort die neue Startansicht,
  aber eigene Anordnungen gingen verloren.
- **Zwei Schalter behalten:** Filter dimmen, Abschnitt ausblenden wäre möglich, ist aber
  selten gewollt und schwerer zu verstehen.

## Folgen

- Nichts einmalig zu tun.
