# 0069 – Neuer Name Conocto und Apple-Look

- **Status:** akzeptiert
- **Datum:** 2026-10-22
- **Betrifft:** Name der App, Farben, Schriften, Logo (`frontend/src/index.css`,
  `frontend/src/main.tsx`, `frontend/src/components/ui/ConoctoLogo.tsx`,
  `frontend/public/favicon.svg`, `.claude/skills/conocto-design/`)
- **Ersetzt:** Farben und Schriften aus 0033 (Radien, Schatten, Glas und Dunkelmodus bleiben)

## Worum geht's

- Der Owner benennt die App um: **Conocto**. Con = Construction, Octo = Krake, die mit
  acht Armen die Informationen eines LV greift.
- Dazu ein neuer Look: wie bei Apple, sauber und ruhig. Hell reines Weiß, dunkel Schwarz
  und Grau, Akzent rot. Keine Schriften, die man von KI-Seiten kennt.
- Mockup „Conocto Logo und CI" am 2026-10-22, vom Owner Schritt für Schritt freigegeben.

## Entscheidung

- **Name:** Conocto, in der App und in der laufenden Doku. Die Wortmarke schreibt sich
  klein: „conocto".
- **Logo:** Krake von oben, runder Kopf mit acht geschwungenen Armen, in Ziegelrot.
  Im Favicon weiß auf ziegelroter Kachel.
- **Akzent:** Ziegelrot `#c8362b`, im Dunkelmodus `#e5554a`. Nur für Auswahl, Knöpfe,
  Links und aktive Filter.
- **Flächen:** hell `#ffffff` mit Grautönen `#f5f5f7`, Text `#1d1d1f`. Dunkel `#000000`
  mit `#1c1c1e` und `#2c2c2e`, Text `#f5f5f7`.
- **Hinweise und Warnungen** sind bernsteinfarben, nie rot. Fehler sind ein Rosé-Rot,
  das sich vom Akzent abhebt.
- **Graph:** Kreise grau, Punkte in gedämpften, warmen Grautönen. Kräftig ist nur die
  Auswahl.
- **Schriften:** Hanken Grotesk für Titel und Wortmarke, Schibsted Grotesk für allen
  übrigen Text, auch für OZ und Zahlen. Selbst gehostet über `@fontsource/*`.
- **Schriftgröße** eine Stufe größer als vorher (Fließtext 13 statt 12 px).

## Was bleibt beim alten Namen

Diese Kennungen heißen weiter „bubble". Sie umzubenennen würde gespeicherte Daten oder
geteilte Links kaputt machen:

- Speicher im Browser (`DB_NAME = 'bubble'` in `lib/persist/lastLv.ts`) — sonst wäre die
  zuletzt geöffnete Datei samt Notizen nach dem Update weg.
- Notiz-Datei (`art: "bubble-notizen"`) — sonst ließen sich gesicherte Notizen nicht
  mehr laden.
- Schema-Kennungen `bubble-pos-v1` und `bubble-graph-v1` — sonst ändern sich alle
  Positions-Hashes und Links.
- Repository `bubbleLV`, Web-Adresse `nicpalapte.github.io/bubbleLV`, GoatCounter-Konto
  `bubble` — die ändert der Owner selbst, wenn die Domain feststeht.
- Paketname `@bubble/core` und Komponentennamen wie `BubbleGraph`: „Bubble" ist dort
  die Blase im Graphen, nicht der Produktname.

## Verworfene Alternativen

- **Signalrot / Warmrot als Akzent:** im direkten Vergleich wirkte Ziegelrot am ruhigsten
  und ist auf Weiß auch als Textfarbe gut lesbar.
- **Achteck-Zeichen, Wortmarke mit Ring, realistische Krake:** vom Owner verworfen.
- **Festbreitenschrift für OZ (Red Hat Mono):** die 0 mit Schrägstrich störte. Mit
  gleich breiten Ziffern (`tabular-nums`) setzt Schibsted auch Punkt und Komma breit,
  OZ zerfallen dann optisch. Deshalb normale Ziffern.
- **Variablen umbenennen (`--blue` → `--accent`):** über 100 Stellen ohne Nutzen für den
  Owner. Der Akzent heißt weiter `--blue`, der Kommentar in `index.css` sagt das.

## Folgen

- Ältere Entscheidungen, Reviews und Pläne nennen weiter „Bubble". Sie bleiben, wie sie
  geschrieben wurden.
- Domain und Web-Adresse folgen getrennt, sobald die Namensprüfung durch ist.
