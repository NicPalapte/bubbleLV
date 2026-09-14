# 0010 – Flacher Positions-Index und vorberechnete Aggregate

- **Status:** akzeptiert
- **Datum:** 2026-09-14
- **Betrifft:** Frontend (Pipeline, Viewer-State, Filter)

## Worum geht's

Ein LV mit 10.000 Positionen soll in jeder Ansicht flüssig laufen. Bisher lief bei
jedem Filter- oder Suchschritt der ganze Baum durch: je Position wurden die
Merkmale neu aus den Attributen geholt und der Langtext neu kleingeschrieben —
und das gleich mehrfach, weil Baum, Tabelle und Facetten-Knöpfe jeweils selbst
gerechnet haben.

## Entscheidung

- Neben dem Baum steht ein **flacher Positions-Index**
  (`frontend/src/lib/index/positionIndex.ts`). Er entsteht **einmal je geladenem
  LV** und hält je Position: Verweis auf den Baumknoten, Menge, Einheitspreis und
  Gesamtpreis als Zahlenspalten, dazu die fertigen Facettenwerte und den fertigen
  Suchtext.
- Der Index wird auf dem **Haupt-Thread** gebaut, nicht im Worker.
- Die **Aggregate** (Facetten-Zähler, Wertebereiche, Gesamtsumme) entstehen dagegen
  **im Worker** und kommen fertig mit dem geladenen LV
  (`frontend/src/lib/index/summary.ts`). Kein Knopf zählt mehr selbst.
- Die Filterentscheidung bleibt an **einer** Stelle: `matchFacts` in
  `frontend/src/lib/matchPos.ts`. Neu ist nur, dass die Ableitung davor passiert
  und nicht mehr bei jeder Prüfung.
- Messpunkte (`frontend/src/lib/perf.ts`) melden Ladezeit, Index-Aufbau,
  Filterzeit und Ansichtswechsel in die Browser-Konsole — nur im
  Entwicklungsmodus, nie im UI.

## Warum

- **Gemessen bei 10.000 Positionen:** ein Filterlauf über den Index braucht rund
  2 ms statt rund 30 ms je Durchlauf — und er läuft einmal statt mehrfach je
  Ansicht. Der Index selbst kostet rund 35 ms, einmalig.
- **Der Index muss auf dem Haupt-Thread entstehen**, weil er auf die Baumknoten
  zeigt. Alles, was den Worker verlässt, wird kopiert; die Verweise wären danach
  auf Kopien gerichtet und die Auswahl im Graphen würde ins Leere greifen.
- **Aggregate dürfen dagegen in den Worker**, weil sie nur Zahlen und Namen sind.
  Sie kosten den größten Teil der Rechenzeit und würden sonst beim Laden die
  Oberfläche blockieren.
- **Zahlenspalten statt Objektfelder**, damit Summen und Wertebereiche ohne
  Umweg über 10.000 Objekte laufen. Fehlende Zahlen stehen als „kein Wert" und
  nicht als 0 — sonst wäre der kleinste Mengenwert immer 0.

## Verworfene Alternativen

- **Index im Worker bauen und mitschicken** – die Knotenverweise überleben den
  Transport nicht; der Index wäre nach dem Empfang wertlos.
- **Index statt Baum** – der Baum ist die Struktur, die Tree und Graph zeigen.
  Ein reiner Index könnte die Hierarchie nicht darstellen.
- **Ergebnisse zwischenspeichern statt vorberechnen** – hätte jeden neuen
  Suchbegriff weiter voll bezahlt; genau der Fall, der heute hakt.

## Folgen

- Jede neue Ansicht rechnet gegen den Index, nicht gegen den Baum. Die Ableitung
  je Position gehört in `positionFacts`, nicht in die Ansicht.
- Eine neue Facette wird weiterhin nur in `frontend/src/lib/facets.ts` eingetragen —
  Index und Aggregate ziehen automatisch mit.
- `npm test` enthält jetzt einen Performance-Test mit 10.000 synthetischen
  Positionen. Wird die Filterzeit wieder größer als 100 ms, schlägt er fehl.
- Für den Owner: nichts einzurichten.
