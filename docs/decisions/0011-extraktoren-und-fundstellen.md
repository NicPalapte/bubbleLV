# 0011 – Gewerkeunabhängige Extraktoren und Fundstellen im Langtext

- **Status:** akzeptiert
- **Datum:** 2026-09-14
- **Betrifft:** Frontend (Klassifizierung, Eigenschaften-Panel)

## Worum geht's

Die Klassifizierung sagte bisher nur *was* in einer Position steht, nicht *wo*.
Und sie erkannte vieles nur dort, wo es ein Ruleset für das Gewerk gab. Ein
Normverweis, ein Maß oder eine offene Textergänzung bedeutet aber in jedem
Gewerk dasselbe.

## Entscheidung

- **Sechs Extraktoren** laufen für jede Position, unabhängig vom Gewerk:
  Normen · Maße · Material · offene Textergänzungen · Verweise · Fristen
  (`frontend/src/lib/classify/extractors/`).
- Sie laufen **vor** den gewerkespezifischen Rulesets. Ein Ruleset darf ihre
  Werte überschreiben — es weiß mehr über sein Gewerk — aber keinen löschen.
- Jeder Extraktor liefert zusätzlich die **Fundstelle im Langtext**: Anfang,
  Ende, Anzeigetext. Die Fundstellen liegen unter `attributes._spans`.
- Der **Attributwert kommt aus einem geschlossenen Vokabular** ("Winterbau"),
  der Wortlaut steckt in der Fundstelle. Ohne Treffer gibt es den Key nicht.
- Die Fundstellen zeigen auf den **Rohtext**, nicht auf die kleingeschriebene,
  von Leerraum befreite Fassung.
- Im Eigenschaften-Panel sind die Fundstellen **farbig markiert**, je Kategorie
  eine Farbe, jede Kategorie einzeln abschaltbar.
- Normverweise stehen nicht mehr unter „Besonderheiten", sondern im eigenen Key
  `normen`.

## Warum

- **Vor den Rulesets, nicht darin:** sonst müsste jedes neue Gewerk dieselbe
  Norm- und Maßerkennung mitbringen. Heute gibt es zwei Rulesets; mit jedem
  weiteren wäre die Doppelung größer geworden.
- **Rohtext statt normalisiertem Text:** die Normalisierung zieht Leerraum
  zusammen und verschiebt damit jeden Zeichen-Index. Auf ihr gefundene Stellen
  ließen sich im Langtext nicht mehr markieren.
- **Vokabular als Wert:** ein Filter „Zeitbezug" mit fünf Werten ist brauchbar.
  Ein Filter mit dem Wortlaut jeder Fundstelle hätte so viele Werte wie es
  Positionen gibt.
- **Kein Key ohne Treffer:** ein leeres Feld im Panel behauptet, es sei geprüft
  worden und nichts gefunden. Ein fehlendes Feld behauptet nichts.
- **Normen raus aus „Besonderheiten":** sonst stünde „DIN EN 206" zweimal im
  Panel — einmal als Besonderheit, einmal als Norm.

## Verworfene Alternativen

- **Materialliste im Code** – Baustoffbezeichnungen sind Fachvokabular. Eine
  selbst geschriebene Liste wäre eine ungeprüfte Aussage über die Domäne. Der
  Extraktor zieht deshalb **nur** aus der `keywords`-Spalte des
  STLB-Bau-Katalogs und bleibt still, solange die leer ist.
- **Fundstellen erst beim Anzeigen suchen** – hätte denselben Text bei jedem
  Rendern neu durchsucht, in jeder Ansicht. Genau der Fehler, den WP-I
  beseitigt hat.
- **Den Wortlaut als Attributwert** – siehe oben: unbrauchbare Filter.
- **Spans auch für den Kurztext** – zwei Bezugstexte hießen zwei Indexräume in
  einem Datentyp. Ein Merkmal, das nur im Kurztext steht, liefert seinen Wert
  ohne Fundstelle.

## Folgen

- Ein neues Merkmal, das in jedem Gewerk gilt, kommt als neues Modul unter
  `extractors/` hinzu und wird in `extractors/index.ts` eingetragen — der
  Klassifizierer selbst ändert sich nicht.
- Soll das Merkmal auch filterbar sein, braucht es zusätzlich eine Zeile in
  `frontend/src/lib/facets.ts`; ohne sie bleibt es reine Anzeige im Panel.
- Neue Filter in der Kopfleiste: **Normen · Material · Zeitbezug · Offene
  Stellen**.
- Das Laden eines LV mit 10.000 Positionen dauert dadurch rund 0,2 s länger
  (~0,6 s statt ~0,4 s, im Web Worker). Das Ziel „erste Ansicht < 5 s" bleibt
  weit unterschritten.
- **Für den Owner:** Die Facette „Material" bleibt leer, bis die
  `keywords`-Spalte in
  [`docs/domain/reference/stlb-bau-leistungsbereiche.csv`](../domain/reference/stlb-bau-leistungsbereiche.csv)
  mit Baustoffbegriffen gefüllt wird. Tätigkeitsbegriffe auf „-arbeiten" und
  „-anlagen" zählen dort bewusst nicht als Material.
