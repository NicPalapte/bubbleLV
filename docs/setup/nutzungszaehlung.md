# Nutzungszählung einrichten (GoatCounter)

Einmaliger Schritt für den Repo-Owner. Hintergrund: Entscheidung 0051.

**Ohne diesen Schritt:** Die App läuft normal, aber es kommen keine Zahlen an.

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

## Schritt 3 – Prüfen

1. Nach dem Merge die Live-Seite öffnen und eine Demo laden.
2. Im GoatCounter-Dashboard erscheinen nach kurzer Zeit `/` und `demo-geoeffnet`.

## Zahlen lesen

- **Pages:** `/` sind Seitenaufrufe; die übrigen Einträge sind die Ereignisse.
- **Visitors** zählt Besucher ohne Cookies.
