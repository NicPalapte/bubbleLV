# 0031 – Drei Ansichten statt acht

- **Status:** akzeptiert
- **Datum:** 2026-10-04
- **Betrifft:** Frontend, Ansichten, Überblick, Filter „Gewerk"

## Worum geht's

Die App hatte sieben Ansichten in der Kopfleiste. Der Owner will den Umfang klein halten
und das Wesentliche gut machen.

## Entscheidung

- **Es bleiben drei Ansichten:** Überblick · Graph · Tabelle. „Eigenschaften" bleibt das
  Panel neben der Tabelle bzw. die Karte im Graphen.
- **Entfernt** (samt Code): Matrix, Ähnlichkeit, Vergleich, Prüfung als eigene Ansicht,
  das Vergleichsfenster im Graphen und die Ähnlichkeits-Hervorhebung im Graphen.
- **Prüfung** ist jetzt eine Karte im Überblick. Regeln, Norm-Verweise, Abschalter und
  Sprung zur Position sind unverändert.
- **Import-Log** ist neu im Überblick: fehlende Einheit/Menge/Preis, nicht klassifizierte
  Positionen, doppelte OZ, Positionen ohne Text. Er gilt für die ganze Datei, nicht für
  den Filter. Der Parser meldet keine Warnungen — das Log ist aus der geladenen Datei
  abgeleitet.
- **Bleibt:** die Berechnung der Ähnlichkeits-Gruppen im Worker. Regel G4
  (Einheitspreis-Ausreißer) braucht sie.
- **„Ohne Gewerk" ist ein echter Filterwert.** Vorher war es nur ein Anzeigename in der
  Treemap — der Filter fand nichts, die Detailansicht blieb leer.
- **Alte Links** mit `v=matrix`, `v=check`, `v=similar` oder `v=compare` öffnen den
  Überblick; die Hinweisleiste sagt, dass die Ansicht nicht übernommen wurde.

## Verworfen

- **Ansichten nur ausblenden:** toter Code, den niemand pflegt und der Tests und Build
  belastet. Wer eine Ansicht zurückhaben will, holt sie aus der Git-Historie.

## Folgen

- Ersetzt [`0021`](0021-matrix-zaehlregeln.md) (Matrix). Teile von
  [`0016`](0016-aehnlichkeit-und-cluster.md) und [`0020`](0020-langtext-vergleich-ohne-bibliothek.md)
  beschreiben nur noch, was im Code als Hintergrund-Rechnung bzw. gar nicht mehr steht.
- Ähnlichkeit und Vergleich kommen später als Fenster über dem Graphen zurück,
  falls der Owner sie wieder will.
