# Nutzungszählung einrichten (GoatCounter)

Einmaliger Schritt für den Repo-Owner. Hintergrund: Entscheidung 0056.

**Ohne diese Schritte:** Die App läuft normal, aber es wird nichts gezählt.

## Schritt 1 – Konto anlegen

1. https://www.goatcounter.com/signup öffnen.
2. Als **Code** genau `bubble` eintragen (Konto: https://bubble.goatcounter.com). Der Code
   steht so in `frontend/src/lib/usage/count.ts` (`GOATCOUNTER_CODE`).
   - Das Skript-Schnipsel, das GoatCounter anzeigt, wird **nicht** gebraucht: die App
     schickt die Zählung selbst an `https://bubble.goatcounter.com/count`.
   - Ist `bubble` schon vergeben: einen anderen Code wählen und mir sagen, dann
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
- **Kurzumfrage** (Entscheidung 0071): `umfrage-gezeigt`, `umfrage-beantwortet`,
  `umfrage-abgelehnt`, `umfrage-note-1` … `umfrage-note-5`, `umfrage-zahlen-nein` /
  `-bis-10` / `-bis-30` / `-mehr`, `umfrage-freitext-mail`. Freitext kommt nur per E-Mail.
- **Visitors** zählt Besucher ohne Cookies.
