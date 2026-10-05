# 0031 – Neuer Look und Dunkelmodus

- **Status:** akzeptiert
- **Datum:** 2026-10-05
- **Betrifft:** Frontend, Design-System

## Worum geht's

Der Hauptscreen wird neu gestaltet: Der Graph ist die Bühne, alles andere schwebt
darüber. Die alten Design-Regeln (eckig, keine Schatten, kein Glas) passen dazu nicht.
Nico hat den neuen Look im Mockup abgenommen.

## Entscheidung

- Schwebende Flächen sind gerundet und haben einen weichen Schatten: Fenster, Karten,
  Menüs, Startseiten-Karten.
- Drei Rundungen: groß für Fenster und Karten, mittel für Menüs, klein für Knöpfe.
  Tabellenzeilen bleiben eckig.
- Halbtransparente Flächen („Glas") nur über dem Graphen.
- Jede Farbe ist eine Variable mit einem hellen und einem dunklen Wert.
- Dunkel gilt, wenn das System dunkel eingestellt ist. Im Logo-Menü lässt sich
  „Hell" oder „Dunkel" wählen.
- Die Wahl gilt nur bis zum Neuladen. Sie wird nicht gespeichert.
- So wenig Erklärtext wie möglich. Der Rest muss sich durch Klicken erschließen.
- Die Regeln stehen in `.claude/skills/bubble-design/README.md`.

## Warum

- Über einem vollflächigen Graphen müssen Fenster sich klar abheben. Ein Rahmen
  allein reicht dafür nicht.
- Ein Dunkelmodus braucht Farben als Variablen. Fest eingetragene Farbwerte wären an
  vielen Stellen falsch.
- Nicht speichern, weil die App nichts im Browser ablegt (`.claude/CLAUDE.md`).

## Verworfene Alternativen

- **Alte Regeln behalten, nur Startseite neu:** Dann würde der Hauptscreen aus zwei
  Stilen bestehen.
- **Hell/Dunkel im Browser speichern:** Das wäre bequemer, bricht aber die Regel „nichts
  speichern". Das System-Design ist ein guter Standard.

## Folgen

- Für Nico ist kein Handgriff nötig.
- Ältere Bildschirme (Matrix, Ähnlichkeit) sind noch eckig. Sie werden mit den
  nächsten Schritten angeglichen.
