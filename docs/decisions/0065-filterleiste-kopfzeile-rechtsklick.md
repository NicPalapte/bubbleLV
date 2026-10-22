# 0065 – Filterleiste, Kopfzeile der Positionskarte und Rechtsklick-Menü

- **Status:** akzeptiert
- **Datum:** 2026-10-22
- **Betrifft:** Kopfleiste und Filter (`frontend/src/components/filter/FilterBar.tsx`),
  Graph-Steuerung (`GraphControls.tsx`), Positionskarte (`NoteBlock.tsx`, `CardParts.tsx`),
  Langtext (`PositionDetails.tsx`, `PaintBar.tsx`), Rechtsklick-Menü (`PositionMenu.tsx`)
- **Ändert:** 0034 (Filter nicht mehr im Seitenfenster), 0062 (Bedienung der Marker),
  0063 (Anstreichen öffnet per Rechtsklick)
- **Issues:** #153, #154, #155

## Worum geht's

- Anmerkungen aus der Nutzung (Issues #153–#155):
  - Marker in der Positionskarte stehen versetzt und brauchen viel Platz.
  - Das Filterfenster verdeckt den Graphen und mischt Filter mit Darstellung.
  - Die Farbleiste springt bei jeder Textauswahl auf, auch beim bloßen Kopieren.
  - Ein Rechtsklick auf Positionen macht nichts.
- Mockup am 2026-10-22, vom Owner kommentiert und freigegeben.

## Entscheidung

- **Positionskarte:** Fortschritt als Knopf mit Auswahlliste (Offen, In Bearbeitung,
  Erledigt), daneben „!" für Wichtig — beide in der Zeile des Titels.
  „Fertig" heißt jetzt „Erledigt"; gespeichert bleibt derselbe Wert.
- **Fußzeile der Auswahlkarte:** „Vergleichen" als hervorgehobener Hauptknopf;
  „Im Vergleich", wenn die Position schon drin ist.
- **Filter:** „+ Filter" klappt eine Leiste unter der Kopfleiste auf. Ein Chip je Gruppe
  (Menge, Facetten, „Material", „Status") öffnet eine Liste mit Kästchen und Anzahl.
  „Material" ordnet die Merkmale unter ihr Material (Beton → Art, Druckfestigkeit,
  Exposition …), aufklappbar je Material. „Status" sind die eigenen Marker. Aktive Filter
  stehen weiter als Chips in der Suche. Das Seitenfenster hat nur noch Überblick und
  Prüfung.
- **Darstellung** (Größe, Gliederung) sitzt eingeklappt in der Graph-Steuerung unten
  rechts; der Knopf nennt den Stand.
- **Langtext:** Markieren allein öffnet nichts. Rechtsklick (oder Kontextmenü-Taste,
  Umschalt+F10) auf die Auswahl öffnet das Menü: Kopieren, sechs Farben, „Anstreichung
  entfernen". Ohne Auswahl bleibt das normale Browser-Menü.
- **Rechtsklick auf eine Position** im Graphen, in der Tabelle und im Vergleich öffnet
  ein Menü: Fortschritt, Wichtig, Vergleich, Link kopieren und der Sprung in die jeweils
  andere Ansicht („In der Tabelle zeigen" bzw. „Im Graph zeigen"). Ein Abschnitt bekommt
  nur die Sprünge (das Link-Format kennt keine Abschnitte).
- Der Rechtsklick ändert weder Filter noch Auswahl.

## Warum

- Weniger Fenster über dem Graphen, Filter bleiben beim Arbeiten sichtbar.
- Häufige Handgriffe an einer Position ohne Umweg über die Karte.
- Kopieren aus dem Langtext stört nicht mehr.

## Verworfene Alternativen

- **Segmentleiste für den Fortschritt** – zu breit, wirkte im Mockup versetzt.
- **Filter weiter im Seitenfenster** – verdeckt den Graphen.
- **Farbleiste sofort bei Auswahl** – stört beim Kopieren.

## Folgen

- Das Nutzungsereignis heißt jetzt `filterleiste` statt `seitenfenster-filter`.
- Langes Drücken auf dem Tablet öffnet das Menü noch nicht.
- Kein manueller Schritt für den Owner.
