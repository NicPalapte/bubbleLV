# 0046 – Zuletzt geöffnete Datei im Browser behalten

- **Status:** akzeptiert
- **Datum:** 2026-10-12
- **Betrifft:** Startseite, Speicher im Browser
- **Ergänzt:** [0006](0006-fokus-lv-verstehen.md) (keine Persistenz über die Session hinaus)

## Worum geht's

Wer mit Bubble arbeitet, öffnet oft tagelang dasselbe LV. Bisher musste die Datei nach
jedem Reload neu gesucht werden. Der Owner wünscht ein Feld „Letzte Datei öffnen“ unter
der Ablage auf der Startseite (Mockup freigegeben am 2026-10-12).

## Entscheidung

- Bubble speichert **genau eine** Datei: die zuletzt erfolgreich geöffnete eigene Datei.
- Gespeichert werden die Original-Bytes, der Dateiname, die Anzahl der Positionen und
  der Zeitpunkt. Das geparste LV wird **nicht** gespeichert, es entsteht beim Öffnen neu.
- Speicherort ist die **IndexedDB** (eine Datenbank im Browser) dieses Browsers. Nichts
  geht an einen Server.
- Demo-LVs und Dateien, die beim Laden scheitern, werden nicht gespeichert.
- Kein automatisches Öffnen beim Start: die Startseite zeigt das Feld, ein Klick öffnet.
- Löschen über **✕** im Feld, mit Rückfrage. Leeren der Website-Daten im Browser löscht
  ebenfalls.
- Fehlt IndexedDB (privates Fenster, gesperrte Website-Daten), fehlt das Feld. Kein Fehler.
- Code: nur `frontend/src/lib/persist/lastLv.ts` greift auf die IndexedDB zu.

## Warum

- Spart den Weg zur Datei bei jedem Start. Die Datei bleibt trotzdem im Browser.
- Bytes statt fertigem LV: eine neue App-Version liest die Datei mit ihrer eigenen Logik.
  Ein gespeicherter Baum könnte zu einer älteren Version gehören.
- IndexedDB statt `localStorage`: `localStorage` fasst nur wenige MB Text, Bubble liest
  Dateien bis 50 MB.

## Verworfene Alternativen

- **Automatisch beim Start öffnen:** Der Owner wollte ein Feld auf der Startseite. So
  bleibt sichtbar, was gespeichert ist, und man kann es löschen, bevor es lädt.
- **Mehrere Projekte:** braucht eine Verwaltung (Liste, Namen, Aufräumen). Eins reicht
  für den Alltag.
- **Datei-Handle des Browsers merken (File System Access API):** gibt es nur in Chromium
  und fragt bei jedem Öffnen nach Erlaubnis.

## Folgen

- Neue Entwicklungs-Abhängigkeit `fake-indexeddb`: nur für Tests, nicht im Bundle.
- Kommentare und Markierungen je Position kommen als nächster Schritt dazu, im selben
  Speicher und an dieselbe Datei gebunden.
- Wer einen gemeinsam genutzten Rechner verwendet, sollte die Datei nach der Arbeit über
  **✕** löschen. Sonst sieht der Nächste sie auf der Startseite.
