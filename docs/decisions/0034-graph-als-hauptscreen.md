# 0034 – Der Graph ist der Hauptscreen

- **Status:** akzeptiert
- **Datum:** 2026-10-05
- **Betrifft:** Frontend (Kopfleiste, Ansichten, Fenster)
- **Ersetzt:** 0028 ganz; in 0006 den Punkt „Graph ist eine von acht gleichrangigen
  Ansichten"; in 0031 die drei gleichrangigen Ansichten (das Entfernen von Matrix,
  Ähnlichkeit und Vergleich aus 0031 gilt weiter)

## Worum geht's

Bisher gab es Ansichten in einem Umschalter oben (zuletzt drei, siehe 0031). Wer etwas in der Tabelle
nachsah, verlor den Graphen aus dem Blick. Die Kopfleiste war mit zwei Zeilen voll.
Nico hat im Mockup einen Hauptscreen abgenommen, auf dem der Graph immer zu sehen ist.

## Entscheidung

- Der Graph füllt die Fläche. Alles andere schwebt darüber:
  - Kennzahlen oben links. Ein Klick öffnet das Seitenfenster.
  - Seitenfenster links mit drei Reitern: Überblick, Filter, Prüfung.
  - Positionskarte rechts, wie bisher.
  - Tabelle als Fenster. Man kann sie verschieben und in der Größe ändern.
  - Unten mittig ein Knopf, der die Tabelle holt.
  - Der Überblick behält das Import-Log aus 0031; die Prüfung hat einen eigenen Reiter.
- Die Kopfleiste hat nur noch eine Zeile: Logo-Menü, Datei, Suche, Befehle,
  „LV schließen".
- Die Filter wählt man im Seitenfenster. In der Suche stehen sie als Chips zum
  Entfernen.
- Weiter gilt: ein Filterzustand für alles. Fenster öffnen oder schließen ändert nie
  Filter, Suche oder Auswahl.
- Baumspalte und Eigenschaften-Spalte der alten Tabellenansicht entfallen. Die
  Positionskarte zeigt die Eigenschaften.

## Warum

- Der Graph ist das, was Bubble von einer Tabelle unterscheidet. Er soll nicht
  hinter einem Reiter verschwinden.
- Fenster über dem Graphen zeigen Details und Zusammenhang gleichzeitig.
- Eine Zeile oben lässt dem Graphen mehr Platz.

## Verworfene Alternativen

- **Umschalter behalten, Graph als Startansicht:** Dann verschwindet der Graph weiter,
  sobald man in die Tabelle geht.
- **Vergleich als zweites Fenster:** war im Mockup vorgesehen. 0031 hat den Vergleich
  entfernt; er kommt als Fenster zurück, wenn Nico ihn wieder will.

## Folgen

- Für Nico ist kein Handgriff nötig.
- Geteilte Links mit „Tabelle" oder „Überblick" öffnen den Graphen mit dem passenden
  Fenster.
- Schritt 2 baut den Graphen selbst um (Gliederung nach LV oder frei, Hinweise im
  Graphen). Schritt 3 bringt die Tour.
