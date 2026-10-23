# 0070 – Splitscreen nahtlos, mit Überblick und Prüfung, Bereiche stapelbar

- **Status:** akzeptiert
- **Datum:** 2026-10-23
- **Betrifft:** Splitscreen (`frontend/src/components/shell/SplitView.tsx`,
  `frontend/src/lib/workspace/split.ts`), Ansichtszustand (`view.workspace` in
  `frontend/src/state/viewState.ts`), Kennzahlen-Kapsel, Kopfleiste
- **Ersetzt:** in 0064 die drei festen Plätze, das Kartenaussehen und „Überblick und
  Prüfung bleiben Fenster“

## Worum geht's

- Nico fand die Bereiche im Split zu kartig: runde Ecken, viel Abstand. Er wollte es
  nahtloser.
- Überblick und Prüfung sollen im Split eigene Bereiche sein, keine Fenster darüber.
- Außerdem sollen sich alle Bereiche untereinander tauschen und stapeln lassen. Beispiel:
  die Prüfung als Reiter auf der Positionskarte.
- Mockup mit den Varianten A, B und C am 2026-10-22. Nico hat C gewählt, also A plus
  Tauschen und Stapeln.

## Entscheidung

- **Nahtlos:** keine Karten mehr, kein Rand, keine Lücke. Zwischen den Bereichen liegt nur
  eine 1-px-Linie. Die flache Kopfzeile ist 32 px hoch, auf grauer Fläche.
- **Fünf Plätze in drei Spalten:**
  - links Überblick (oben) und Prüfung (unten),
  - in der Mitte Graph (oben) und Tabelle (unten),
  - rechts die Position.
  - Leere Plätze und Spalten geben ihre Fläche frei.
- **Überblick und Prüfung** sind am Anfang zu. Man öffnet sie über „+ Überblick“ /
  „+ Prüfung“ in der Kopfleiste oder über die Kennzahlen am Graphen. Im Split gibt es
  kein schwebendes Seitenfenster mehr. Die Funde einer Regel stehen im Bereich „Prüfung“
  unter der Liste.
- **Ziehen am Kopf eines Bereichs (⠿):**
  - auf die **Kopfzeile** eines anderen Platzes: Der Bereich kommt als Reiter dazu
    (stapeln),
  - auf die **Fläche** eines anderen Bereichs: Beide tauschen den Platz,
  - auf die **Fläche des eigenen Stapels**: Der Reiter löst sich und geht auf einen
    freien Platz, bevorzugt auf seinen alten.
- Ein Klick auf einen Reiter holt ihn nach vorn. ✕ schließt den vorderen Reiter.
- **Wer öffnet, holt nach vorn:** „+ Bereich“, „In der Tabelle zeigen“ und „Im Graph
  zeigen“. Eine neue Auswahl öffnet die Position nur, wenn sie zu war. Liegt sie
  hinter einem Reiter, bleibt sie dort. So bleibt die Prüfungsliste stehen, während man
  durch die Funde klickt.
- **Breiten:** Jede Trennlinie verschiebt nur ihre beiden Nachbarn. Keine Spalte wird
  schmaler als 12 % der Fläche. Doppelklick setzt alle Breiten zurück.

## Warum

- Nahtlos wirkt ruhiger und lässt mehr Platz für den Inhalt.
- Stapeln gibt freie Wahl, ohne dass dafür neue Knöpfe nötig sind.
- Die Reiter hinter dem vorderen bleiben im Hintergrund geladen. Der Graph behält seinen
  Ausschnitt, auch beim Tauschen.

## Verworfene Alternativen

- **B: Überblick und Prüfung nur als Reiter neben der Position.** Das spart Breite, man
  sieht aber nie Prüfung und Position zugleich.
- **Eigene Ablagezonen am Rand (wie in einer Programmier-Umgebung).** Mächtiger, aber mehr
  Erklärbedarf. Kopfzeile = stapeln und Fläche = tauschen reicht für fünf Bereiche.
- **Auswahl holt die Position immer nach vorn.** Dann würde die gestapelte Prüfung bei
  jedem Klick auf einen Fund verschwinden.

## Folgen

- Nichts einmalig zu tun.
- Die Anordnung hält wie bisher nur bis zum Reload.
- Die Fenster-Anordnung und schmale Bildschirme (unter 1024 px) bleiben unverändert.
