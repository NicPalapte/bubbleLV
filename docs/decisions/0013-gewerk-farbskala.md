# 0013 – Eine Gewerk-Farbskala für alle Ansichten

- **Status:** akzeptiert
- **Datum:** 2026-09-16
- **Betrifft:** Frontend, Design

## Worum geht's

Der Überblick zeigt Gewerke als farbige Flächen. Sobald eine zweite Ansicht
dasselbe tut, muss dieselbe Farbe dasselbe Gewerk meinen — sonst ordnet man
beim Ansichtswechsel jedes Mal neu zu.

## Entscheidung

- Zehn feste Töne, als Design-Tokens `--cat-1` … `--cat-10` in
  `frontend/src/index.css`. Dazu `--cat-none` für „ohne Gewerk".
- Die Zuordnung Gewerk → Ton macht **eine** Stelle:
  `frontend/src/lib/colors.ts` (`buildColorScale`).
- Die Skala entsteht einmal je geladener Datei im `ViewerProvider` und steht
  allen Ansichten als `gewerkColors` zur Verfügung.
- Grundlage ist die sortierte Gewerk-Liste aus den vorberechneten
  Facetten-Zählern. Dieselbe Datei ergibt damit immer dieselben Farben.
- Mehr Gewerke als Töne: die Skala läuft um, zwei Gewerke teilen sich einen Ton.
- Positionen ohne Gewerk bekommen `--cat-none` — farblos, kein elfter Ton.

## Warum

- **Farbe ist hier eine Zuordnung, keine Bewertung.** Die zehn Töne sind
  gleich hell und gleich kräftig; keiner sticht hervor. Ein Verlauf
  (hell → dunkel) würde eine Rangfolge behaupten, die es nicht gibt.
- **Alle Töne tragen die Textfarbe `--ink` lesbar.** Damit braucht keine
  Ansicht eine zweite Textfarbe und keine Kontrastprüfung je Kachel.
- **Zehn reichen.** Ein reales LV hat selten mehr als zehn Gewerke mit
  nennenswertem Anteil; darüber fasst der Überblick ohnehin zusammen
  („Weitere n Gewerke").

## Verworfene Wege

- **Farbe aus dem Namen errechnen (Hash → Farbton).** Stabil über Dateien
  hinweg, aber die Töne liegen zufällig nebeneinander: zwei Gewerke geraten
  regelmäßig fast gleich, und die Palette lässt sich nicht kontrollieren.
- **Farbe aus der STLB-Bau-Leistungsbereichsnummer.** Klingt fachlich sauber,
  hilft aber nicht: die Nummern eines LV liegen dicht beieinander, die
  Farben damit auch.
- **Mehr als zehn Töne durch Zwischenschritte.** Zwei Töne, die sich nur um
  eine Nuance unterscheiden, sind nebeneinander nicht mehr zu trennen — das
  Umlaufen ist ehrlicher.
