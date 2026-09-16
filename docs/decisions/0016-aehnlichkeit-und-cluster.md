# 0016 – Ähnliche Positionen: wie Bubble sie findet

- **Status:** akzeptiert
- **Datum:** 2026-09-16
- **Betrifft:** Frontend, Pipeline (WP-M)

## Worum geht's

Bubble soll zeigen, welche Positionen eines LV dieselbe Leistung beschreiben —
Wiederholungen über Lose hinweg, Varianten derselben Leistung, und Positionen, deren
Preis aus dem Rahmen fällt. Der naheliegende Weg wäre, jede Position mit jeder zu
vergleichen. Bei 10.000 Positionen sind das rund 50 Millionen Vergleiche. Das ist im
Browser nicht bezahlbar.

## Entscheidung

Drei Stufen, nacheinander:

1. **Vorgruppieren.** Verglichen wird nur innerhalb eines Gewerks mit gleicher Einheit
   und gleichem Bauteiltyp. Eine Betonwand in m³ und eine Stunde Facharbeiter haben
   nichts miteinander zu tun.
2. **Wortgleiches zusammenfassen.** Positionen mit gleichem Text **und** gleichen
   Merkmalen kommen in einem Schritt zusammen. Danach wird nur noch ein Stellvertreter
   je Schreibweise verglichen. In echten LVs steht die Wiederholung wortgleich da —
   diese Stufe erledigt den Großteil der Arbeit.
3. **Nur naheliegende Kandidaten vergleichen.** Ein Verzeichnis über Wortpaare
   („Schindeln") führt zu den Positionen, die mindestens zwei Wortpaare teilen. Wortpaare,
   die fast überall vorkommen („nach Aufmaß"), bleiben dabei außen vor.

Gemessen wird die Ähnlichkeit als Anteil gemeinsamer Wortpaare (Jaccard-Maß), dazu der
Anteil übereinstimmender Merkmale. Der Kurztext zählt mehr als der Langtext: er benennt
die Leistung, der Langtext ist zu großen Teilen Standardtext.

**Zahlen und Einheiten werden im Text maskiert.** „Wand d = 24 cm" und „Wand d = 30 cm"
sind dieselbe Leistung in zwei Varianten. Der Unterschied verschwindet nicht — er taucht
als unterscheidendes Merkmal wieder auf („Dicke").

**Ausreißer über Median und Quartilsabstand**, nicht über den Mittelwert. Ein einziger
Tippfehler im Einheitspreis zieht den Mittelwert so weit mit, dass er selbst nicht mehr
auffällt. Weniger als vier Werte oder ein Quartilsabstand von 0 ⇒ kein Ausreißer; das
wäre Rauschen, kein Hinweis.

**Der Regler „ab n Mitgliedern" sitzt in der Ansicht, nicht im globalen Filter.**
`matchPos` entscheidet je Position aus der Position selbst; die Zugehörigkeit zu einer
Gruppe entsteht erst danach im Worker. Ein globaler Cluster-Filter würde diese Schicht
aufbrechen.

## Verworfene Wege

- **Alle Paare vergleichen.** Richtig, aber bei 10.000 Positionen nicht bezahlbar.
- **Nur exakt gleiche Texte zusammenfassen.** Schnell, findet aber keine Varianten —
  und die sind der interessantere Teil.
- **Einbettungen / LLM-Ähnlichkeit.** Setzt einen Server voraus. Draußen, solange Bubble
  keinen hat (siehe [`0006`](0006-fokus-lv-verstehen.md)).
- **Mittelwert und Standardabweichung für Ausreißer.** Ein Extremwert verschiebt beide
  so weit, dass er sich selbst versteckt.

## Folgen

- Die Gruppen entstehen **einmal beim Laden im Worker** und liegen fertig im Zustand.
  Kein Render rechnet sie nach. 10.000 Positionen brauchen dafür rund 0,4 Sekunden.
- Die Verkettung ist gewollt: Ist A ähnlich zu B und B ähnlich zu C, stehen alle drei
  zusammen. Der konservative Schwellwert (62 %) hält diese Ketten kurz.
- Die Obergrenzen aus Stufe 3 sind eine bewusste Näherung: in einem LV mit tausenden
  paarweise fast gleichen Texten kann eine Verbindung übersehen werden. Lieber eine
  Gruppe zu wenig als eine Oberfläche, die steht.
- Prüfregel **G4** (Einheitspreis fällt aus der Gruppe) wird damit erst möglich; sie war
  in WP-K ausdrücklich zurückgestellt.

## Für den Owner

- Nichts einzustellen. Die Ansicht **Ähnlichkeit** steht nach dem Import bereit.
- Findet Bubble in einer Datei keine Gruppen, ist das kein Fehler: dann wiederholt sich
  in dieser Datei nichts, was nah genug beieinander liegt.
- Der Schwellwert steht im Code (`DEFAULT_THRESHOLD` in
  `frontend/src/lib/relate/similarity.ts`). Wenn die Gruppen zu grob oder zu fein
  wirken, ist das die eine Stellschraube — bitte melden, statt selbst zu drehen.
