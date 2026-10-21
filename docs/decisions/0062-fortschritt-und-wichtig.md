# 0062 – Fortschritt und „Wichtig" statt drei Marker

- **Status:** akzeptiert
- **Datum:** 2026-10-21
- **Betrifft:** eigene Notizen (`frontend/src/lib/annotations.ts`), Positionskarte,
  Graph, Filter oben, Tabelle, CSV-Export, Speicher (`frontend/src/lib/persist/lastLv.ts`)
- **Ersetzt:** die drei Marker aus 0053 (Kommentar-Verlauf, Mengenstufe und gelernte
  Begriffe aus 0053 bleiben)

## Worum geht's

- Bisher: genau ein Marker je Position, Markiert, Wichtig oder Erledigt.
- Der Owner fragte, ob „Markiert / In Bearbeitung / Fertig" besser passt.
- Dabei fiele „Wichtig" weg. „Fertig, aber wichtig" ist beim Kalkulieren häufig.
- Mockup mit drei Varianten am 2026-10-21, der Owner wählte Variante B.

## Entscheidung

- Zwei Marker, unabhängig voneinander:
  - **Fortschritt:** Offen · In Bearbeitung · Fertig. Offen ist der Ausgangszustand.
  - **Wichtig:** an/aus.
- Positionskarte: drei Knöpfe nebeneinander für den Fortschritt, daneben „! Wichtig".
  Der Knopf mit Pfeil-Dropdown fällt weg.
- Graph: Fortschritt als dünner Ring am Punkt (blau = in Bearbeitung, grün = fertig,
  dazu ✓). „Wichtig" als rotes Schild, Kommentar weiter als blaues ✎.
- Filter oben: Offen · In Bearbeitung · Fertig · Wichtig · Mit Kommentar. „Offen" heißt
  „noch nicht angefasst" und ersetzt „Nicht erledigt".
- Tabelle: Spalte „Marker" zeigt beides. CSV: Spalten „Fortschritt" und „Wichtig" statt
  „Marker".
- Alte Notizen werden beim Öffnen übernommen: Markiert und Wichtig → Wichtig,
  Erledigt → Fertig. Der Verlauf wird mit umgeschrieben.

## Warum

- Fortschritt und Bedeutung sind zwei Fragen. Ein Marker für beides zwingt zur Wahl.
- Drei sichtbare Knöpfe statt Dropdown: ein Klick, man sieht den Stand sofort.

## Verworfene Alternativen

- **Markiert / In Bearbeitung / Fertig (Variante A):** „Wichtig" fehlt, und „Markiert"
  sagt nichts über den Stand.
- **GAEB-Export der Notizen:** GAEB hat kein Feld für Marker. Kommentare gingen nur in X84
  als Bieterkommentar, der mit dem Angebot an den AG geht. Bleibt außerhalb des Scopes;
  der Weg ist der CSV-Export.

## Folgen

- Speicherform `v: 4`. Ältere Formen werden gelesen, aber nicht mehr geschrieben.
- Notiz-Datei (0061) jetzt Version 2 mit `fortschritt` und `wichtig`. Version 1 wird beim
  Laden umgedeutet wie der Speicher. Beim Zusammenführen gilt für Fortschritt und
  „Wichtig" je der zuletzt gesetzte Stand.
- „Fertig" bleibt eine eigene Notiz, kein GAEB-Status (0051).
