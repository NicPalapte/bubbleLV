# 0098 – „Kurze Tour“: gesehen merken

- **Status:** akzeptiert
- **Datum:** 2026-11-07
- **Betrifft:** Tour (`frontend/src/components/tour/Tour.tsx`), Speicher
  (`frontend/src/lib/persist/lastLv.ts`, Schlüssel `tour`)
- **Baut auf:** 0046 (IndexedDB nur über `lastLv.ts`), 0071 (Merker der Kurzumfrage)
- **Issue:** #191

## Worum geht's

- Das Angebot „Neu hier? Kurze Tour“ kam nach jedem Neuladen wieder. Ob man die Tour schon
  gesehen oder weggeklickt hatte, galt nur bis zum Neuladen.

## Entscheidung

- Ein Merker im Browser (IndexedDB, Schlüssel `tour`, Wert nur `true`). Er wird gesetzt,
  sobald die Tour startet oder das Angebot mit ✕ weggeklickt wird.
- Unabhängig von der Datei. Kein Inhalt aus dem LV.
- Solange der Merker gelesen wird, erscheint kein Angebot. So blitzt es nicht kurz auf.
- Ohne IndexedDB bietet sich die Tour wie bisher einmal je Sitzung an, ohne Fehler.
- Über das Logo-Menü lässt sich die Tour weiter jederzeit starten.

## Verworfen

- `localStorage`: für die App ausgeschlossen (CLAUDE.md), IndexedDB ist der eine Speicher.

## Folgen

- Wer die Tour einmal gesehen hat, bekommt das Angebot in diesem Browser nicht mehr.
- Nichts für den Owner zu tun.
