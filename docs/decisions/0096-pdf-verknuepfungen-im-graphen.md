# 0096 – PDF-Verknüpfungen im Graphen: Karten am Rand mit Linien

- **Status:** akzeptiert
- **Datum:** 2026-11-06
- **Betrifft:** `frontend/src/components/graph/DocCards.tsx`,
  `frontend/src/components/graph/BubbleGraph.tsx`, `frontend/src/lib/docs/docGraph.ts`,
  `frontend/src/state/viewState.ts` (`graph.showDocs`, `graph.docSpotlight`)
- **Ergänzt:** 0072 (Begleitdokument als PDF), 0075 (Hervorhebung im Graphen)

## Worum geht's

- Stellen in Begleit-PDFs lassen sich mit Positionen verknüpfen (0072, 0080). Sichtbar war das
  bisher nur in der Positionskarte und im PDF selbst, nicht im Graphen.
- Für Nico ist genau dieser Zusammenhang das Kernfeature. Er wollte ihn vor der Vorstellung
  beim Arbeitgeber (KW 46) im Graphen sehen. Bewusste Ausnahme vom Feature-Freeze.
- Nico hat am 06.11.2026 im Mockup „PDF-Verknüpfungen im Graphen“ Variante B gewählt.

## Entscheidung

- **Karten am Rand:** Jedes PDF mit mindestens einer verknüpften Stelle ist eine Karte oben
  rechts im Graphen: Name, Zahl der Positionen, Seiten, „nicht geöffnet“, wenn das PDF in
  dieser Sitzung nicht offen ist.
- **Linien:** Von jeder verknüpften Position läuft eine dünne Linie zu ihrer Karte. Sind die
  Punkte einer Gruppe nur als Fläche zu sehen, läuft eine Linie je Gruppe.
- **Zahl am Punkt:** Ein kleiner cyanfarbener Kreis oben links am Punkt nennt die Zahl der
  verknüpften Stellen.
- **PDF antippen:** hebt das PDF hervor: Linien kräftig, Stellen aufgeklappt, andere Punkte
  blass oder ausgeblendet (Schalter „Nicht-Treffer“, wie 0075/0078). Nochmal antippen,
  Leerfläche antippen oder Escape hebt es auf. Filter, Suche und Auswahl bleiben unberührt.
- **Position wählen:** ihre Linien werden kräftig, jede Karte zeigt die Stellen dieser Position.
- **Stelle antippen:** wählt die Position (bei genau einer) und zeigt die Stelle im Bereich
  „Dokument“, wenn das PDF offen ist.
- **Schalter „Dokumente“** in der Steuerung unten rechts, standardmäßig an. Er erscheint nur,
  wenn es Verknüpfungen gibt.
- **Farbe:** Cyan steht für den Bezug zum Dokument. Rot (`--accent`) bleibt der Auswahl
  vorbehalten, Amber den Hinweisen.
- **Nur Anzeige:** Grundlage sind die gespeicherten Verknüpfungen. Kein neues Speicherformat,
  keine neuen Notizen. Angestrichene Stellen ohne Verknüpfung erscheinen nicht.
- Beim Einpassen bleibt rechts Platz für die Karten, solange der Graph breit genug ist.

## Verworfene Alternativen

- **Nur Zahl am Punkt (Mockup A):** ruhig, aber der Zusammenhang ist nicht auf einen Blick
  sichtbar. Die Zahl ist als Ergänzung in B übernommen.
- **Gliederung „nach Dokument“ (Mockup C):** zeigt Lücken gut, aber Positionen mit zwei PDFs
  stünden doppelt. Später denkbar.
- **Karte je Seite oder je Stelle:** zu viele Karten. Die Stellen stehen aufgeklappt in der
  Karte des PDFs.

## Folgen

- Wer PDFs verknüpft, sieht das sofort im Graphen. Mit vielen Verknüpfungen wird es voller;
  dann hilft der Schalter „Dokumente“ oder das Hervorheben eines PDFs.
- Nach einem Neuladen sind die PDFs nicht mehr offen (0072). Die Karten bleiben, Antippen
  einer Stelle wählt dann nur die Position.
