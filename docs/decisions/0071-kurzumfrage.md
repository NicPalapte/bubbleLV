# 0071 – Kurzumfrage nach einigen Minuten Nutzung

- **Status:** akzeptiert
- **Datum:** 2026-10-23
- **Betrifft:** Umfrage-Karte (`frontend/src/components/survey/SurveyCard.tsx`,
  `frontend/src/state/survey.tsx`, `frontend/src/lib/survey.ts`), Nutzungszählung
  (`frontend/src/lib/usage/count.ts`), Speicher (`frontend/src/lib/persist/lastLv.ts`),
  Logo-Menü
- **Baut auf:** 0056 (Nutzungszählung), 0046 (IndexedDB nur über `lastLv.ts`)
- **Issue:** #157

## Worum geht's

- Für den Bedarfstest will der Owner wissen, wie hilfreich Conocto ist und ob jemand
  dafür zahlen würde (Review Zukunftsfähigkeit, Punkt 2).
- Ohne Konto und ohne Server: Antworten müssen ohne eigenen Dienst ankommen.

## Entscheidung

- Eine kleine Karte unten rechts erscheint **einmal**, nach 4 Minuten aktiver Nutzung mit
  geöffneter Datei (nur sichtbarer Tab zählt). Nie während der Tour. Sie blockiert nichts.
- Jederzeit über das Logo-Menü: „Feedback geben".
- Drei Fragen:
  - Wie hilfreich war Conocto? 1–5
  - Würdest du dafür zahlen? Nein · bis 10 €/Monat · bis 30 €/Monat · mehr
  - Was fehlt dir? (Freitext, optional)
- Auswahl-Antworten gehen als feste GoatCounter-Ereignisse raus (`umfrage-note-4`,
  `umfrage-zahlen-bis-10` …), dazu `umfrage-gezeigt`, `umfrage-beantwortet`,
  `umfrage-abgelehnt`. Nie Text.
- Freitext geht nur per E-Mail: „Senden" öffnet das eigene Mailprogramm mit dem Text
  (`mailto:`, an die Melde-Adresse). Abschicken muss man dort selbst.
- „Nicht mehr fragen" und eine Antwort merkt sich der Browser in IndexedDB (Schlüssel
  `umfrage`, Owner-Freigabe am 2026-10-23). Keine Fachdaten. „Letzte Datei löschen"
  lässt den Merker stehen. Ohne IndexedDB fragt sie je Sitzung höchstens einmal.
- ✕ schließt nur für diese Sitzung.

## Verworfen

- **Umfrage beim Verlassen der Seite:** Browser zeigen beim Schließen nur ihren eigenen
  Standarddialog, eine eigene Frage ist nicht möglich.
- **Fremdes Formular (Tally, Google Forms):** einfacher auszuwerten, aber ein weiterer
  Drittanbieter im Datenschutztext.
- **Freitext an GoatCounter:** könnte Inhalte aus dem LV enthalten.

## Folgen

- Die Datenschutzerklärung (#76) muss die Umfrage-Ereignisse nennen.
- Auswertung: im GoatCounter-Dashboard unter den Ereignissen `umfrage-…`. Jede Antwort
  zählt einmal je Seitenaufruf.
