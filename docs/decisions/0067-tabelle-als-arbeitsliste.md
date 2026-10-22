# 0067 – Tabelle als Arbeitsliste

- **Status:** akzeptiert
- **Datum:** 2026-10-22
- **Betrifft:** Positionstabelle (`frontend/src/components/table/PositionsTable.tsx`),
  Tabellenbaustein (`frontend/src/components/ui/DataTable.tsx`), Ansichts-Zustand
  (`view.table.collapsed`), Marker (`lib/annotations.ts`, `fillMarker`)
- **Ändert:** 0062 (Marker auch direkt in der Tabelle setzen)

## Worum geht's

- Nico arbeitet ein LV Zeile für Zeile durch. Dafür musste er bisher jede Position
  öffnen, um Fortschritt, „Wichtig" oder einen Kommentar zu setzen.
- Die Spalte „Status" zeigte immer „Offen" aus der Datei (Entscheidung 0051) und half
  beim Durcharbeiten nicht.
- Abschnitte standen als eine Zeile mit dem ganzen Pfad („A › B"). Man sah schlecht,
  wo ein Abschnitt anfängt, und konnte nichts zuklappen.
- Mockup am 2026-10-22, vom Owner freigegeben.

## Entscheidung

- Spalte „Status" entfällt in der Tabelle. Der Status aus der Datei steht weiter in der
  Positionskarte.
- Neue Spalten **Fortschritt** und **„!"** (Wichtig), getrennt:
  - Klick auf Fortschritt öffnet die Auswahl Offen · In Bearbeitung · Erledigt.
  - Klick auf „!" schaltet Wichtig an/aus.
  - Griff unten rechts in der Zelle: nach oben oder unten ziehen übernimmt den Wert in
    alle überstrichenen Zeilen (wie in Excel). Jede Zeile bekommt ihren eigenen Eintrag
    im Verlauf.
- Spalte **Kommentar**: zeigt den neuesten Kommentar, „+n" für weitere. Klick öffnet
  Eingabe oben, Verlauf darunter, der neueste zuerst. Enter speichert.
- **Abschnitte** als eigene Kopfzeile je Ebene, oberste Ebene kräftig, darunter hell.
  Rechts: Anzahl Positionen und davon erledigt.
  - Beim Scrollen bleibt oben nur der Abschnitt der obersten Zeile stehen, nicht der
    ganze Pfad.
  - Klick auf die Kopfzeile klappt den Abschnitt zu. „Alle zuklappen" / „Alle
    aufklappen" in der Kopfleiste der Tabelle.
  - Ebenen, die alle Zeilen teilen (z. B. das LV selbst), bekommen keine eigene Zeile.
  - Zugeklappte Abschnitte gelten nur für diese Sitzung und dieses LV. Eine neue Auswahl
    in einem zugeklappten Abschnitt klappt ihn auf.

## Verworfene Alternativen

- **Fortschritt und „!" in einer Spalte „Marker"** – beim Ziehen wäre unklar, welcher
  der beiden Werte übernommen wird.
- **Zuklappen über den Filter** – Zuklappen ist Ansicht, nicht Filter; Graph und Zähler
  sollen davon unberührt bleiben.

## Folgen

- Fortschritt, Wichtig und Kommentare lassen sich ohne Positionskarte setzen.
- Der Graph und die Filter merken vom Zuklappen nichts.
- Kein Schritt für den Repo-Owner nötig.
