# Nutzungszählung einrichten (GoatCounter)

Einmaliger Schritt für den Repo-Owner. Hintergrund: Entscheidung 0051.

**Ohne diese Schritte:** Die App läuft normal, aber es wird nichts gezählt.

## Schritt 1 – Konto anlegen

1. https://www.goatcounter.com/signup öffnen.
2. Als **Code** genau `bubblelv` eintragen. Der Code steht so in
   `frontend/src/lib/usage/count.ts` (`GOATCOUNTER_CODE`).
   - Ist `bubblelv` schon vergeben: einen anderen Code wählen und mir sagen, dann
     ändere ich die Konstante.
3. E-Mail und Passwort eintragen, bestätigen.

## Schritt 2 – Einstellungen

Unter **Settings** prüfen, welche Angaben GoatCounter sammelt (z. B. Ort, Sprache).
Weniger ist datensparsamer. Dort lässt sich auch die eigene IP ausschließen, damit du
dich nicht selbst mitzählst.

## Schritt 3 – Einschalten

Erst, wenn die Datenschutzerklärung GoatCounter nennt (jeder Zähl-Aufruf überträgt
technisch IP-Adresse und Browsertyp an GoatCounter).

- Datei `frontend/.env.production` mit der Zeile `VITE_USAGE_COUNT=1` anlegen und mergen.
  Am einfachsten: mir „Zählung einschalten“ sagen, dann kommt das als kleiner PR.
- Ohne diese Datei bleibt die Zählung aus, auch auf der Live-Seite.

## Schritt 4 – Prüfen

1. Nach dem Merge die Live-Seite öffnen und eine Demo laden.
2. Im GoatCounter-Dashboard erscheinen nach kurzer Zeit `/` und `demo-geoeffnet`.

## Zahlen lesen

- **Pages:** `/` sind Seitenaufrufe; die übrigen Einträge sind die Ereignisse.
- **Visitors** zählt Besucher ohne Cookies.
