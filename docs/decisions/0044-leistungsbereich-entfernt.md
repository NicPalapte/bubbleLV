# 0044 – Leistungsbereich (Gewerk) aus der App entfernt

- **Status:** akzeptiert
- **Datum:** 2026-10-11
- **Betrifft:** Klassifizierung, Filter, Positionskarte, Export, Import-Log
- **Ersetzt:** [0015](0015-gewerk-aus-der-abschnittsueberschrift.md),
  [0030](0030-material-filter-ausblenden.md),
  [0032](0032-stlb-katalog-ohne-positionsart.md); ergänzt
  [0011](0011-extraktoren-und-fundstellen.md) und [0013](0013-gewerk-farbskala.md)

## Worum geht's

Bubble ordnete jede Position über den STLB-Bau-Katalog einem Leistungsbereich (LB,
das „Gewerk") zu. Der Katalog hatte keine gepflegten Stichworte. Ergebnis: fast alle
Positionen standen unter „Ohne Gewerk". Daran hingen der Filter „Gewerk", der Filter
„Material", die Merkmale „tragend" und „Steinart" sowie der Import-Hinweis „ohne
Gewerk". Ein LB passt außerdem nicht immer zum Material: Beton steht oft, aber nicht
immer in LB 013.

## Entscheidung

- Der Leistungsbereich ist **ganz** aus der App entfernt: Katalog, Abgleich mit Text
  und Überschriften, Anzeige, Filter, Export-Spalte, Import-Hinweis.
- Ebenso entfernt: Filter „Material" (kam nur aus dem Katalog) und die Merkmale
  „tragend" und „Steinart" (hingen an LB 013/012).
- Druckfestigkeit, Exposition und die übrigen genormten Klassen bleiben. Sie kamen
  schon vorher ohne LB aus dem Text.
- Positionsart und Bauteiltyp kommen weiter aus Stichworten im Kurztext.
- Die Positionskarte zeigt statt des Gewerks den Hauptabschnitt in seiner Farbe (0043).
- Die Vorgruppierung der Ähnlichkeit (G4) läuft nach Einheit und Bauteiltyp.
- Alte Teilen-Links mit `f.gewerk=…` laden weiter. Der Filter fällt weg, die App meldet
  es wie bei jedem unbekannten Filter.

## Warum

- Owner-Vorgabe (2026-10-11): LB vorerst raus, die Logik dafür kommt später neu.
- Ein Merkmal, das fast immer leer ist, erklärt nichts und kostet Platz.
- Material soll künftig über Stichworte **und** Muster erkannt werden (z. B. „C20/25"
  oder „XC4" ⇒ Beton), unabhängig vom LB.

## Verworfene Alternativen

- **Nur abschalten, Code behalten:** toter Code, den niemand pflegt, und Tests für
  etwas, das nicht läuft.
- **Katalog-Stichworte jetzt füllen:** bindet Material an den LB, was fachlich nicht
  immer stimmt.

## Folgen

- Nächster Schritt: Materialwissen als CSV-Tabelle je Material, Beton zuerst. Inhalte
  kommen vom Owner; Rohstoff ist `docs/domain/reference/entwuerfe/material-entwurf.csv`.
- Die Anleitungen `docs/setup/stlb-keywords.md` und `docs/setup/materialliste.md`
  sind entfallen.
- Eine neue LB-Logik bekommt eine eigene Entscheidung.
