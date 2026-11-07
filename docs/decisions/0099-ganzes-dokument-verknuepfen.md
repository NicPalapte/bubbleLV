# 0099 – Ganzes Dokument mit Positionen verknüpfen

- **Status:** akzeptiert
- **Datum:** 2026-11-07
- **Betrifft:** Dokument-Fenster (`frontend/src/components/docs/DocumentView.tsx`),
  Positionskarte (`DocLinks.tsx`), Graph (`components/graph/DocCards.tsx`), Notizen
  (`frontend/src/lib/docs/docNotes.ts`)
- **Baut auf:** 0072 (Begleit-PDF, Stellen von Hand verknüpfen), 0097 (PDF-Verknüpfungen im Graphen)
- **Issue:** #191

## Worum geht's

- Manche Unterlagen gelten als Ganzes für eine Position, z. B. die AIA für die
  BIM-Position. Bisher ließ sich nur eine markierte Textstelle verknüpfen.
- Bewusste Ausnahme vom Feature-Freeze (Owner, 07.11.2026).

## Entscheidung

- Knopf „Dokument verknüpfen“ in der Kopfzeile des Dokuments öffnet denselben Dialog wie
  bei einer Stelle. Danach steht dort „Dokument verknüpft · N“.
- Gespeichert wird das als Stelle mit **Seite 0, ohne Text** (`wholeDocSpot`, `isWholeDoc`).
  So gelten Speicher, Notiz-Datei, Fingerabdruck des PDFs, Graph-Linien und Positionskarte
  ohne neues Format.
- Seite 0 lässt sich nicht anstreichen und zählt beim Blättern durch die Stellen nicht mit.
- Positionskarte und Graph zeigen „ganzes Dokument“ statt Seite und Textstelle. Ein Klick
  öffnet das PDF am Anfang.
- Lösen wie bei Stellen: ✕ in der Positionskarte.

## Verworfen

- Eigenes Feld an `DocInfo`: braucht eigene Wege für Speichern, Notiz-Datei, Umschlüsseln
  und Graph. Der Nutzen ist derselbe.

## Folgen

- Ältere Conocto-Stände lesen eine Stelle mit Seite 0 nicht und lassen sie beim Laden weg.
- Nichts für den Owner zu tun.
