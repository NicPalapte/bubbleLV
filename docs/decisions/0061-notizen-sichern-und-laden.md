# 0061 – Notizen als Datei sichern und laden

- **Status:** akzeptiert
- **Datum:** 2026-10-21
- **Betrifft:** `frontend/src/lib/notesFile.ts`, Startseite (`FileDropzone`), Logo-Menü;
  ergänzt 0047 und 0057

## Worum geht's

- Notizen hängen an der einen gespeicherten Datei. Öffnet man eine andere Datei oder
  löscht die gespeicherte, waren sie ohne Warnung weg.
- Eine neue Fassung desselben LV konnte die Notizen der alten nicht übernehmen.

## Entscheidung

- **Startseite, neue Datei:** Hat die gespeicherte Datei Notizen, fragt Bubble:
  „Ersetzen“, „↺ gespeicherte Datei öffnen“ oder „Abbrechen“. Ohne Notizen keine Frage.
- **Startseite, ✕:** Mit Notizen gibt es zusätzlich „Notizen sichern + löschen“.
- **Logo-Menü:** „Notizen sichern“ (nur wenn es Notizen gibt) und „Notizen laden…“.
- **Notiz-Datei:** JSON (`*-notizen-<Datum>.json`) mit Marker und Verlauf je Position,
  dazu OZ, Kurztext, Menge und zwei Fingerabdrücke: Positions-Hash und Text-Hash
  (nur Kurz- und Langtext, ohne OZ).
- **Laden ordnet in drei Stufen zu:** gleicher Positions-Hash → gleich; sonst gleicher
  Text-Hash → umnummeriert; sonst gleiche OZ → geändert. Gibt es den Text oder die OZ
  mehrfach im LV oder in der Notiz-Datei, wird nichts zugeordnet („nicht gefunden“).
  Jede Position bekommt höchstens einen Eintrag.
- Ein Fenster zeigt die vier Gruppen. Umnummerierte und geänderte lassen sich abwählen.
  Übernommen wird erst auf Klick.
- Passt keine Position inhaltlich (weder gleich noch umnummeriert), stammt die Datei
  vermutlich aus einem anderen LV: Hinweis, und „geändert“ ist nicht vorgewählt.
- **Zusammenführen:** Kommentare werden ergänzt, gleiche nicht doppelt. Beim Marker
  gilt der zuletzt gesetzte.

## Warum

- Notizen sind Arbeit. Sie dürfen nicht still verloren gehen (Review Zukunftsfähigkeit).
- Die Datei bleibt beim Nutzer: kein Server, kein Request, nur ein lokaler Download.
- Der Text-Fingerabdruck findet Notizen auch nach dem Umnummerieren (Wunsch Owner,
  2026-10-21).

## Verworfene Alternativen

- **„Notizen sichern + öffnen“ beim Ersetzen:** Owner wollte es einfacher. Sichern gibt
  es beim Löschen und im Menü.
- **Notizen automatisch in die neue Fassung übernehmen:** bräuchte zwei Dateien
  gleichzeitig (außerhalb des Scopes). Der Umweg über die Notiz-Datei reicht.
- **Zuordnung über ähnlichen Text:** könnte Notizen an die falsche Position hängen.

## Folgen

- Nichts für den Owner zu tun.
- Einträge ohne passende Position werden beim Laden nicht übernommen. Sie bleiben in der
  Notiz-Datei.
