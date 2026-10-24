# 0074 – Nur noch Splitscreen, ein Knopf „Ansicht“

- **Status:** akzeptiert
- **Datum:** 2026-10-24
- **Betrifft:** Hauptscreen (`frontend/src/components/shell/`), Kopfleiste
  (`WorkspaceBar`), Ansichtszustand (`view.workspace` in `frontend/src/state/viewState.ts`),
  Splitscreen (`SplitView.tsx`, `frontend/src/lib/workspace/split.ts`), Positionskarte
  (`SelectionCard.tsx`), gestrichelte Linie im Graphen (`BubbleGraph.tsx`)
- **Ersetzt:** in 0064 den Umschalter Split/Fenster und „unter 1024 px immer Fenster“; in
  0073 den eigenen Knopf ↺ und das Merken von Split/Fenster; in 0034 die schwebende
  Positionskarte und das Seitenfenster

## Worum geht's

- Auf einem kleinen Bildschirm wirkte die App mit vielen Fenstern übereinander sehr voll.
- Nico: „Bei kleinem Bildschirm ist es ja automatisch der Splitmodus, nur mit gestapelten
  Karten?“ — und hat am 2026-10-24 „Nur noch Split“ gewählt.
- Dazu: die einzelnen Knöpfe oben („+ Tabelle“, „+ Prüfung“ …) zu einem Knopf „Ansicht“
  zusammenfassen.

## Entscheidung

- **Kein Fenster-Modus mehr.** Graph, Tabelle, Position, Überblick, Prüfung und Dokument
  stehen immer als Bereiche im Splitscreen — auf jeder Bildschirmbreite.
- **Knopf „Ansicht ▾“** rechts in der Kopfleiste: ein Haken je Bereich zum Ein- und
  Ausblenden; ein ausgelagerter Bereich zeigt „↙ zurückholen“. Darunter „↺ Anordnung
  zurücksetzen“.
- **Schmale Fläche (unter 1024 px):** der Graph und ein Platz mit allen anderen offenen
  Bereichen als Reiter, nebeneinander; unter 700 px übereinander. Diese Anordnung wird
  nur abgeleitet, nicht gespeichert — breit gezogen ist die eigene Anordnung wieder da.
  Kein Ziehen und keine Trennlinien in dieser Anordnung.
- **Gestrichelte Linie** von der gewählten Position läuft bis an den Rand des Graphen auf
  der Seite, wo der Bereich „Position“ steht.
- Bleiben: Vergleich als Fenster über allem (0037), Filterleiste unter der Kopfleiste,
  Graph/Tabelle/Dokument im eigenen Browserfenster (0039).

## Warum

- Eine Anordnung statt zwei: weniger Knöpfe, weniger Zustand, weniger Tests.
- Bereiche weichen einander aus, statt sich zu überlappen — passt zu Nicos UI-Prinzip.
- Ein Knopf „Ansicht“ ersetzt eine Reihe von Chips und hält die Kopfleiste ruhig.

## Verworfene Alternativen

- **Fenster-Modus nur für kleine Bildschirme behalten.** Gerade dort wirkte er voll.
- **Schmale Fläche nur mit einem Bereich und Umschalter.** Der Graph soll sichtbar
  bleiben; Reiter daneben reichen.

## Folgen

- Nichts einmalig zu tun.
- Eine gemerkte Anordnung aus älteren Versionen bleibt gültig; die Wahl Split/Fenster darin
  wird ignoriert.
- Wer bisher im Fenster-Modus gearbeitet hat, sieht nach dem Update den Splitscreen.
