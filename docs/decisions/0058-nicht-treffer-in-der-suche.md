# 0058 – Schalter „Nicht-Treffer" sitzt in der Suche

- **Status:** akzeptiert
- **Datum:** 2026-10-19
- **Betrifft:** `frontend/src/components/layout/TopBar.tsx`,
  `frontend/src/components/table/PositionsTable.tsx`; ergänzt 0035

## Worum geht's

- „Nicht-Treffer dimmen/ausblenden" galt schon für Suche und alle Filter, stand aber im
  Seitenfenster „Filter" unter der Gliederung. Man fand ihn nur mit offenem Seitenfenster.
- Er wirkte nur im Graphen. Die Tabelle blendete Nicht-Treffer immer aus.

## Entscheidung

- Der Schalter steht in der Suchleiste, vor „+ Filter": zwei Symbole (◐ dimmen,
  ◌ ausblenden), Text im Tooltip.
- Er erscheint nur, solange Suche oder Filter aktiv sind.
- Im Seitenfenster fällt er weg.
- Die Tabelle folgt ihm: „dimmen" zeigt alle Zeilen, Nicht-Treffer blass; „ausblenden"
  zeigt nur Treffer. Zähler und Summe rechnen weiter nur mit Treffern.
- Vorgabe bleibt „dimmen".

## Warum

- Der Schalter steuert das Ergebnis von Suche und Filtern. Er gehört neben die Chips, die
  dieses Ergebnis bestimmen.
- Am Graphen (unten rechts) sähe er aus, als gälte er nur für den Graphen.
- Ein Filterzustand, alle Ansichten: Graph und Tabelle zeigen dieselbe Menge gleich.

## Verworfen

- **Unten rechts am Graphen** neben „Größe": wirkt graphbezogen.
- **Trefferzahl zusätzlich in der Suche:** steht schon in der Kennzahl-Kapsel am Graphen.
