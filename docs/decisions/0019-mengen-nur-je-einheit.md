# 0019 – Mengen im Graphen nur innerhalb einer Einheit

- **Status:** akzeptiert
- **Datum:** 2026-09-22
- **Betrifft:** Frontend, Bubble-Graph, Issue #51

## Worum geht's

Issue #51: „Man sollte direkt sehen, welche Abschnitte den größten Anteil im
Projekt ausmachen (braucht Preise und Mengen)."

Preise sind einfach — Euro ist Euro. Mengen nicht: ein LV mischt m³, m², m, kg
und Stück. Eine Bubble, deren Größe „300" aus 120 m³ Beton und 180 Stück Anker
zusammenrechnet, behauptet etwas, das es nicht gibt.

## Entscheidung

- Es gibt einen Größenmodus **Menge**.
- Er steht **nur zur Wahl, wenn die gefilterte Menge genau eine Einheit
  enthält**. Sonst ist der Knopf gesperrt und nennt den Grund: „Mengen lassen
  sich nur innerhalb einer Einheit vergleichen. Filtere auf eine Einheit, dann
  greift dieser Modus."
- Gerechnet wird über die **Treffer**, nicht über das ganze LV
  (`frontend/src/lib/graph/quantities.ts`).
- Positionen ohne Menge tragen nichts bei — auch nicht 0. Eine fehlende Menge
  ist keine Menge von null.

## Warum so

- Der Weg zur Aussage ist kurz: Einheit filtern, Modus wählen, fertig. Genau
  dann ist die Frage „welcher Abschnitt hat die meisten m³?" auch sinnvoll.
- Ein gesperrter Knopf mit Begründung ist ehrlicher als eine Zahl, die niemand
  nachrechnen kann.

## Verworfene Wege

- **`totalQuantity` als Aggregat am `LVNode`**, wie `totalPrice`: Das Aggregat
  kennt den Filter nicht. Filtert man auf m³, enthielte die Summe eines
  Abschnitts weiter dessen m²-Positionen — die Bubble zeigte eine falsche Zahl,
  und zwar unauffällig.
- **Mengen je Einheit getrennt am Baum vorhalten:** Ein Aggregat je Einheit an
  jedem Knoten kostet Speicher und Aufbauzeit für einen Modus, den man selten
  braucht. Der eine Durchlauf über die Treffer ist billiger.
- **Modus immer anbieten und gemischte Einheiten einfach addieren:** Das ist die
  Zahl, die niemand nachrechnen kann.

## Folgen

- Ohne Einheiten-Filter sieht man den Modus gesperrt. Das ist gewollt: es sagt,
  dass hier ein Schritt fehlt, statt eine Aussage vorzutäuschen.
- Die Mengensummen entstehen nur, solange der Graph die aktive Ansicht **und**
  der Modus gewählt ist. Keine andere Ansicht zahlt dafür.
