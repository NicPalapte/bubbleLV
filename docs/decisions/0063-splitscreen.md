# 0063 – Splitscreen neben den Fenstern

- **Status:** akzeptiert
- **Datum:** 2026-10-21
- **Betrifft:** Hauptscreen (`frontend/src/components/shell/`), Ansichtszustand
  (`view.workspace` in `frontend/src/state/viewState.ts`), Kopfleiste
- **Ergänzt:** 0034 (Graph als Hauptscreen) und 0039 (Tabelle im eigenen Fenster)

## Worum geht's

- Bisher lagen Tabelle und Positionskarte als Fenster über dem Graphen.
- Der Owner wünscht eine Aufteilung wie in iTWO: Bereiche nebeneinander, das ist
  gewohnter.
- Mockup am 2026-10-21, vom Owner freigegeben (mit Graph auslagerbar und Tauschen per
  Ziehen).

## Entscheidung

- Zwei Anordnungen, umschaltbar oben rechts in der Kopfleiste: **Split** und **Fenster**.
  Standard ist Split.
- **Split:** drei Plätze, links oben, links unten, rechts. Am Anfang Graph, Tabelle,
  Positionskarte.
  - Bereich am Kopf auf einen anderen ziehen = beide tauschen die Plätze.
  - Trennlinien ziehen ändert die Größe, Doppelklick setzt zurück, Pfeiltasten gehen auch.
  - ✕ schließt einen Bereich, „+ Tabelle" usw. in der Kopfleiste holt ihn zurück.
- **Fenster:** wie bisher. Der Graph füllt die Fläche, Tabelle und Karte schweben darüber.
- **Graph und Tabelle** lassen sich in beiden Anordnungen in ein eigenes Browserfenster
  auslagern (↗). Der freie Platz wird von den übrigen Bereichen genutzt.
- Überblick, Filter und Prüfung bleiben vorerst Fenster (Seitenfenster), auch im Split.
- Unter 1024 px Breite gilt immer Fenster, der Umschalter ist dann ausgeblendet.
- Die Einstellungen halten nur bis zum Reload, wie alle Ansichtseinstellungen.

## Warum

- Wer aus iTWO kommt, erwartet Tabelle und Details nebeneinander, ohne Fenster zu
  schieben.
- Die Fenster-Anordnung bleibt für alle, die den Graphen groß sehen wollen.

## Verworfene Alternativen

- **Nur Splitscreen:** nimmt dem Graphen den Platz, den Entscheidung 0034 ihm gibt.
- **Platz über Auswahlliste wählen:** im ersten Mockup, Ziehen ist direkter.
- **Größe live beim Ziehen:** bei ~10k Positionen müsste der Graph jeden Frame neu
  messen. Darum zieht nur eine Linie mit, die Bereiche folgen beim Loslassen.

## Folgen

- Nichts einmalig zu tun.
- Tour und Tastenkürzel funktionieren in beiden Anordnungen.
