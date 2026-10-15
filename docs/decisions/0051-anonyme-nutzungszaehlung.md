# 0051 – Anonyme Nutzungszählung mit GoatCounter

- **Status:** akzeptiert
- **Datum:** 2026-10-15
- **Betrifft:** Frontend (`frontend/src/lib/usage/count.ts`), Datenschutz; ersetzt 0017

## Worum geht's

- Bubble soll kostenlos öffentlich starten, um zu testen, ob es Bedarf gibt.
- Ohne Zahlen lässt sich das nicht beurteilen. 0017 hatte jede Messung ausgeschlossen
  (siehe `docs/review-zukunftsfaehigkeit.md`, Top 10, Punkt 2).
- Nico hat am 15.10.2026 entschieden: anonym zählen ist erlaubt.

## Entscheidung

- **Dienst: GoatCounter**, Konto `bubblelv` (https://bubblelv.goatcounter.com).
  Ohne Cookies, quelloffen, für kleine nicht-kommerzielle Seiten kostenlos.
- **Gezählt wird:**
  - ein Seitenaufruf je Start, immer als Pfad `/`, dazu Bildschirmgröße und die Domain,
    von der jemand kam;
  - feste Ereignisse aus `USAGE_EVENTS`: Datei, letzte Datei oder Demo geöffnet, Laden
    fehlgeschlagen, Seitenfenster, Tabelle, Vergleich, Suche, Markierung, Kommentar,
    Tour, Export, Druck.
- **Nicht gezählt wird:** Dateiname, LV-Inhalt, Suchtext, Filterwerte, Positions-IDs,
  URL-Fragment. Die Ereignisnamen sind fest im Code, es gibt keinen freien Text.
- Funktionen zählen einmal je Seitenaufruf, geöffnete Dateien jedes Mal.
- **Kein Zählen** im Dev-Server, in Tests, in PR-Vorschauen und bei „Do Not Track“.
- Eigene Requests statt GoatCounters Skript `count.js`: kein fremder Code auf der Seite.
- Gezählt wird beim Auslösen (`dispatch` in `ViewerProvider`), nicht im Reducer.

## Folgen

- Zahlen zu Besuchern, geöffneten Dateien und genutzten Funktionen.
- Ein Request an GoatCounter je Ereignis. Die Fachdaten-Regel in `.claude/CLAUDE.md`
  bleibt bestehen; dazu kommt eine Regel nur für das Zählmodul.
- Die Datenschutzerklärung muss GoatCounter nennen (Impressum/Datenschutz fehlen noch).
- Fällt GoatCounter aus, merkt die App nichts davon.

## Verworfen

- **Plausible:** in der EU gehostet, aber mit Monatsgebühr.
- **Umami Cloud:** Bedingungen der Gratis-Stufe ungeprüft.
- **Eigener Zähl-Server:** widerspricht „kein eigenes Backend“.
- **Filter- oder Suchwerte zählen:** würde Inhalte des LV verraten (Grund aus 0017).
