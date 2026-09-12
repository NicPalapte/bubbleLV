# Lösungsplan zu Issue #41 · App Usage Review

> Befund, Lösungsansätze und Umsetzungsplan zu
> [Issue #41](https://github.com/NicPalapte/bubbleLV/issues/41). Nachvollzogen mit der
> Beispieldatei aus dem Issue (GAEB DA XML 3.3, iTWO-Export). **Die Datei bleibt
> vertraulich und liegt nicht im Repo** – Tests bekommen eine kleine, selbst gebaute
> Ersatzdatei, die nur die Formatmuster nachstellt (siehe WP-41-1).

## Ergebnis in Kürze

- Alle Punkte aus dem Issue sind mit der Beispieldatei reproduzierbar.
- Zwei Punkte sind echte Fehler im Parser (Leerzeilen, zerrissene Sätze). Der Rest
  sind Darstellungs- und Bedienlücken in Tabelle und Graph.
- Kern des Graph-Problems: Das Layout legt Positionen als Kreisring um ihren Abschnitt.
  Bei 92 Positionen wird dieser Ring riesig. Dagegen gibt es Notlösungen
  (Punkte, Sammel-Bubbles), und genau diese Notlösungen sieht man im Issue.
- Vorschlag: fünf Arbeitspakete, jedes ein eigener PR. Reihenfolge WP-41-1 → WP-41-5.
- Offene Fragen an den Owner stehen am Ende. Sie betreffen nur Details, nicht die
  Richtung.

## Die Beispieldatei in Zahlen

| Merkmal | Wert |
|---|---|
| Struktur | 1 Los (ohne Nummer) → 1 Hauptabschnitt → 29 Unterabschnitte → Positionen |
| Positionen | 654, davon 92 im größten und 3 im kleinsten Unterabschnitt |
| Langtext-Zeilen | 16.119, davon 7.720 leer (48 %) – siehe Befund T1 |
| Textabsätze im XML | 7.829, davon 461 komplett leer |
| Zeilenlänge im XML | Median 45 Zeichen, 95 % unter 85 Zeichen – der Export bricht Sätze hart um |
| Textergänzungen (Platzhalter) | 757 Stück, davon 750 vom Auftraggeber, 7 für den Bieter |
| Hinweistexte zwischen Positionen | 137 – werden heute gar nicht eingelesen (Beobachtung B1) |

Graph nach „Alles ausklappen" heute: **4 Knoten** (Projekt, Los, Hauptabschnitt, eine
Sammel-Bubble „29 ABS."). Löst man die Sammel-Bubble auf, hat der Graph 686 Knoten und
einen Durchmesser von rund 40.000 Einheiten – bei 12 % Zoom passt er gerade so auf den
Bildschirm, dann ist nichts mehr lesbar.

---

## Befund je Punkt aus dem Issue

### Beide Ansichten · Texte

| Nr. | Punkt im Issue | Ursache | Paket |
|---|---|---|---|
| T1 | Leerzeilen zwischen Texten | `frontend/src/lib/gaeb/text.ts` übernimmt die Einrückung zwischen zwei `<p>`-Absätzen als Text. Sie enthält einen Zeilenumbruch, dazu kommt der Absatzumbruch → nach **jeder** Zeile eine Leerzeile. | WP-41-1 |
| T2 | Formatierung „komisch" (zerrissene Sätze) | Der Export schreibt jede Zeile eines Satzes in ein eigenes `<p>` (harter Umbruch bei ca. 55 Zeichen). Bubble zeigt jede Zeile als eigenen Absatz. | WP-41-1 |
| T3 | Formatierung „komisch" (Platzhalter auf eigener Zeile) | Textergänzungen (`<TextComplement>`, z. B. ein Platzhalter mitten im Satz) werden als Block behandelt. Vorher- und Nachtext landen auf getrennten Zeilen. | WP-41-1 |

### Tabellenansicht

| Nr. | Punkt im Issue | Ursache | Paket |
|---|---|---|---|
| A1 | Alle zu-/aufklappen | Die Knöpfe gibt es nur im Graphen (`GraphControls.tsx`). Der Baum in der Tabellenansicht hat keine. Die Aktionen `expandAll`/`collapseAll` existieren bereits im State. | WP-41-3 |
| A2 | Spaltenreihenfolge OZ · Bezeichnung · Einheit · Menge · Preis, dann Rest | Reihenfolge ist fest in `PositionsTable.tsx` (`COLUMNS`). Heute: OZ, Bezeichnung, Positionsart, Bauteiltyp, Druckfestigkeit, Einheit, Menge, EP, Status. | WP-41-3 |
| A3 | Spalten ein-/ausblenden | Nicht vorhanden. | WP-41-3 |
| A4 | Spaltenbreite anpassbar | `DataTable.tsx` setzt feste Prozentbreiten, keine Griffe. | WP-41-3 |
| A5 | Klassifizierungs-Badge wirkt klickbar | Das Badge ist der Baustein `Chip`, ein `<button>` mit Hand-Cursor. Ein Klick tut nichts. | WP-41-2 |
| A6 | „** = wichtig" ohne Bezug | Legende stammt aus dem Design-Prototyp. GAEB kennt keine `**`-Markierung; in der Beispieldatei kommt `**` nicht vor. | WP-41-2 |

### Graph

| Nr. | Punkt im Issue | Ursache | Paket |
|---|---|---|---|
| G1 | Ab § 1 nur kleine blaue Kreise ohne Text und Zahl; danach überflüssige Gruppen-Node | Ab 9 Geschwistern zeichnet das Layout Knoten als Punkte (`DOT_AT = 8`), ab 25 als Sammel-Bubble (`CLUSTER_AT = 24`). Die 29 Unterabschnitte werden zu Punkten ohne Label und Zähler. Hat ein Unterabschnitt selbst mehr als 24 Positionen, hängt dahinter noch eine Sammel-Bubble – die „überflüssige Gruppen-Node". | WP-41-4, WP-41-5 |
| G2 | Positionsnummern nicht verketten | `LVNode.code` ist die volle OZ (`01.07.0010`). Der Graph zeigt sie so an. | WP-41-4 |
| G3 | Nummerierung auch zugeklappt zeigen | Das Label hängt nur am Zoom (`LABEL_K`), nicht am Zustand. Unter 45 % Zoom (Abschnitt) bzw. 70 % (Unterabschnitt) verschwindet das Label komplett, auch die Nummer. | WP-41-4 |
| G4 | Bei Suche Treffer-Nodes ausklappen | Die Pfade zu Treffern gehen auf (`openNodes`), aber Punkte und Sammel-Bubbles bleiben. Der Treffer steckt unsichtbar in einer Sammel-Bubble. | WP-41-5 |
| G5 | Positionskreise unterschiedlich groß, nur dunkelorange ohne Ring | Zwei Darstellungen für dasselbe: bis 8 Geschwister große helle Bubble mit Ring (`BubbleNode`), darüber kleiner dunkler Punkt (`DotNode`). | WP-41-4 |
| G6 | Alle ausklappen klappt nicht alles aus | `expandAll` öffnet nur `expanded`, nicht die Sammel-Bubbles (`openClusters`). Ergebnis: 4 Knoten. | WP-41-4 |
| G7 | Verbindungen schwer erkennbar | Kantenfarbe `--bub-edge` (helles Blaugrau) bei 60 % Deckkraft; Linienstärke schrumpft mit dem Zoom. | WP-41-4 |
| G8 | Zoom auf gewählte Node | Nicht vorhanden. Es gibt nur `centerOn` für die Tastatur (verschiebt, zoomt nicht). | WP-41-4 |
| G9 | Gruppen und Überschriften besser bezeichnen | Titel auf 22 Zeichen gekürzt, einzeilig, nur innerhalb der Bubble und nur ab einem Zoom, bei dem der Graph längst nicht mehr auf den Schirm passt. | WP-41-4 |
| G10 | Wege zwischen verwandten Nodes kurz halten | Balloon-Layout: Kinder fächern sich in eine Halbebene (π). Der Ringradius wächst mit der Summe aller Kind-Teilbäume. 92 Positionen als Punkte brauchen einen Ring mit Radius ≈ 1.460; danach müssen die 29 Geschwister-Ringe nebeneinander passen. Außerdem stehen Projekt → Los → Hauptabschnitt als Kette aus drei Bubbles mit je „654 Pos." übereinander, bevor die erste Verzweigung kommt. | WP-41-5 |

### Beobachtungen außerhalb des Issues

- **B1 · Hinweistexte fehlen.** Die Beispieldatei enthält 137 Hinweistexte
  (`<Remark>` innerhalb einer Positionsliste, z. B. Vorbemerkungen zu einem Titel).
  Der Parser liest sie nicht ein. Sie fehlen in Tabelle, Suche und Details. Das ist
  kein Punkt aus #41 → eigenes Issue anlegen, Entscheidung offen (siehe Fragen).
- **B2 · Kette ohne Verzweigung.** Los ohne Nummer und ein einziger Hauptabschnitt
  sind in Vergabe-LVs üblich. Der Graph sollte damit umgehen, statt drei gleich große
  Bubbles übereinander zu zeigen (Teil von WP-41-5).

---

## Arbeitspakete

### WP-41-1 · Langtext-Aufbereitung · `fix(gaeb)` · Aufwand S

**Status: umgesetzt** (Reflow aktiviert, Owner-Entscheidung zu Frage 1: ja).

Behebt T1, T2, T3. Nur `frontend/src/lib/gaeb/text.ts` plus Tests.

Schritte:
1. `walk()` in `text.ts` ignoriert Textknoten, die nur aus Leerraum mit Zeilenumbruch
   bestehen (Einrückung zwischen Elementen). Damit sind die Leerzeilen weg (T1).
2. `<TextComplement>` wird inline behandelt: `ComplCaption`, `ComplBody`, `ComplTail`
   fließen mit Leerzeichen getrennt in den Satz. `BLOCK_ELEMENTS` verliert die drei
   Einträge (T3). Der Platzhalter-Text aus `ComplBody` bleibt sichtbar – er markiert,
   dass hier eine Angabe erwartet wird.
3. Neue reine Funktion `reflowLines(lines: string[]): string` (T2). Regel: Zwei
   aufeinanderfolgende nicht-leere Zeilen werden mit Leerzeichen verbunden, **außer**
   - die erste Zeile ist kurz (< 45 Zeichen) **und** endet mit `.`, `:`, `!` oder `?`
     (ein Satz, der bewusst allein steht), oder
   - die zweite Zeile beginnt wie ein Listenpunkt (`-`, `•`, `*`, `1.`, `a)`), oder
   - eine leere Zeile dazwischen liegt (echter Absatz; leere `<p/>` bleiben genau
     dafür erhalten).
   Ein `<br>` innerhalb eines `<p>` bleibt ein Zeilenumbruch.
4. Ersatz-Fixture `frontend/tests/fixtures/zeilenumbruch-export.x83`: kleine, selbst
   geschriebene Datei mit den drei Mustern (eine Zeile je `<p>`, leere `<p/>`,
   Textergänzung mitten im Satz). **Kein Text aus der Beispieldatei.**
5. Tests in `frontend/tests/gaeb/`: keine doppelten Zeilenumbrüche mehr;
   Textergänzung steht im Satz; Reflow-Regeln einzeln; bestehende Fixtures liefern
   unverändert dieselben Kurztexte.

Nebeneffekt: Die Suche findet Wortfolgen über einen harten Umbruch hinweg, weil
`longText` jetzt zusammenhängende Sätze enthält.

Fertig, wenn:
- Langtext der Beispieldatei liest sich als Absätze, ohne Leerzeile zwischen Zeilen.
- Platzhalter stehen im Satz, nicht auf einer eigenen Zeile.
- `npm test` grün, Kurztexte aller Fixtures unverändert.

### WP-41-2 · Eigenschaften-Panel · `fix(viewer)` · Aufwand S

**Status: umgesetzt** (Badge nicht klickbar, Owner-Entscheidung zu Frage 2: Vorschlag).

Behebt A5, A6.

1. `PositionDetails.tsx`: Legende „** = wichtig" entfernen. `Highlighted.tsx` behält
   die `**`-Erkennung (schadet nicht, kostet nichts).
2. Klassifizierungs-Badge nicht mehr als Schaltfläche: `Chip` bekommt eine Variante
   `static` (rendert `<span>`, Standard-Cursor, kein Hover). Das Panel nutzt sie.
   Alternative siehe Frage 2.

Fertig, wenn: kein Hand-Cursor über dem Badge, keine Legende ohne Bezug.

### WP-41-3 · Tabelle: Spalten und Baum · `feat(viewer)` · Aufwand M

**Status: umgesetzt** (Verschieben per Pfeile im Popover, Owner-Entscheidung zu Frage 3: Vorschlag).

Behebt A1–A4.

1. **Standardreihenfolge** (A2): OZ · Bezeichnung · Einheit · Menge · EP · Positionsart ·
   Bauteiltyp · Druckfestigkeit · Status.
2. **Spaltenkonfiguration** als reiner UI-Zustand (React-State in `PositionsTable.tsx`,
   überlebt keinen Reload – erlaubt laut `.claude/CLAUDE.md`):
   `{ order: string[]; hidden: Set<string>; widths: Record<string, number> }`.
   Reine Hilfsfunktionen (`moveColumn`, `toggleColumn`, `resizeColumn`) in
   `frontend/src/lib/table/columns.ts`, mit Unit-Tests.
3. **Popover „Spalten"** rechts im Tabellenkopf (Baustein `Popover` existiert):
   Kästchen zum Ein-/Ausblenden (A3), Pfeile ▲▼ zum Verschieben, „Zurücksetzen".
   OZ und Bezeichnung lassen sich nicht ausblenden.
4. **Breite ziehen** (A4): `DataTable.tsx` wechselt von Prozent auf Pixelbreiten
   (`flex: 0 0 <px>`, Mindestbreite 48 px). Am rechten Rand jedes Spaltenkopfs ein
   Zieh-Griff (`ResizeHandle` gibt es schon für die Seitenspalten – gleiche Mechanik).
   Die letzte sichtbare Spalte füllt den Rest.
5. **Baum** (A1): In der Zeile „Struktur" in `Tree.tsx` zwei kleine Knöpfe
   „alle aufklappen" / „alle zuklappen", die `expandAll` / `collapseAll` auslösen.
   Baum und Graph teilen den Zustand, also wirkt das in beiden Ansichten.

Fertig, wenn:
- Spalten lassen sich ausblenden, verschieben und in der Breite ziehen; Reload setzt
  alles zurück.
- Baum hat beide Knöpfe; mit 654 Positionen bleibt das Aufklappen flüssig
  (virtualisiert, Issue #23).

### WP-41-4 · Graph: Darstellung und Beschriftung · `feat(graph)` · Aufwand M

**Status: umgesetzt** (Positionen immer einheitlich groß, auch im Preis-Modus – Frage 4).

Behebt G2, G3, G5, G6, G7, G8, G9 und den Label-Teil von G1. Kein Layout-Umbau.

1. **Eigene Nummer je Ebene** (G2): `LVNode` bekommt `ownCode` (in `buildTree.ts`:
   `code` ohne den `code` des Elternknotens plus Punkt). Graph zeigt `ownCode`;
   Baum und Tabelle behalten die volle OZ. `ownCode` ist quellen-agnostisch, kein
   GAEB-Wissen nötig.
2. **Nummer immer sichtbar** (G3, G9): Für Los und Abschnitte wird die Nummer
   unabhängig vom Zoom gezeichnet, mit bildschirmfester Schriftgröße
   (`fontSize = clamp(9 / k, 9, 16)` – wird beim Rauszoomen nicht kleiner). Ist die
   Bubble auf dem Schirm kleiner als ca. 28 px, wandert das Label unter die Bubble
   (weißer Halo, zwei Zeilen, bis 36 Zeichen). Innerhalb der Bubble wie bisher ab
   `LABEL_K`.
3. **Eine Positionsdarstellung** (G5, G1): `DotNode` fällt weg. Positionen sind immer
   ein gefüllter Kreis in `--bub-position-line` ohne Rand, einheitlicher Radius. Der
   Größenmodus wirkt nur noch auf Los und Abschnitte (Frage 4).
4. **Kanten** (G7): Farbe `--dim`, Deckkraft 0,85, Linienstärke mindestens 1 px auf
   dem Schirm (`max(1.2, 1 / k)`). Hover-Spotlight unverändert.
5. **Zoom auf Auswahl** (G8): `fitTo(id)` in `BubbleGraph.tsx` – Bounding-Box des
   platzierten Teilbaums, dann wie `fit()`. Auslöser: Knopf „⌖" in `GraphControls`,
   Doppelklick auf eine Bubble, Taste `F` bei Fokus im Graphen. Beim Wechsel Tabelle
   → Graph mit vorhandener Auswahl wird auf die Auswahl eingepasst statt auf alles.
6. **Alles ausklappen** (G6): `expandAll` setzt zusätzlich `openClusters` auf alle
   Knoten mit Sammel-Bubble. Damit zeigt der Graph wirklich alles (und WP-41-5 macht
   das später erträglich).

Fertig, wenn:
- Bei „Alles einpassen" sind alle Abschnittsnummern lesbar, egal wie klein die Bubbles.
- Jede Position sieht gleich aus.
- „Alles ausklappen" zeigt 654 Positionen, nicht 4 Knoten.
- Doppelklick auf eine Bubble füllt den Bildschirm mit ihrem Teilbaum.

### WP-41-5 · Graph: Layout · `feat(graph)` · Aufwand L · ✅ umgesetzt

> **Stand:** umgesetzt. Entscheidung dazu:
> [`../decisions/0008-graph-layout-positionswolke.md`](../decisions/0008-graph-layout-positionswolke.md).
> Abweichungen vom Entwurf unten:
> - Punkt 4 (Sammel-Bubbles mit Treffern öffnen sich) betrifft nur noch
>   Geschwister-**Abschnitte** — Positionen werden gar nicht mehr geclustert. Die
>   Ableitung sitzt in `ViewerProvider.tsx` neben `openNodes`.
> - Punkt 5 (Detailstufe) greift erst ab 9 Positionen je Wolke; kleinere Wolken
>   kosten als Punkte nichts.
> - Zusätzlich behoben: Ketten (Projekt → Los → Hauptabschnitt) wurden über die
>   Breite ihres gesamten Teilbaums auseinandergezogen. Bei genau einem Kind zählt
>   jetzt nur noch der Abstand zur eigenen Bubble.
> - Die Punkt-Darstellung (`DOT_AT`) entfällt ganz: mit der Außenbeschriftung aus
>   WP-41-4 bleiben auch viele Geschwister-Abschnitte als echte Bubbles lesbar.
>   `CLUSTER_AT` steigt deshalb von 24 auf 40 und gilt nur noch für Abschnitte.

Behebt G1, G4, G10 an der Wurzel. Betrifft `frontend/src/lib/graph/layoutRadial.ts`,
`constants.ts`, `BubbleGraph.tsx`, `BubbleNode.tsx`, `state/viewer.ts`.
Erfordert eine Entscheidung in `docs/decisions/` (Layout-Wechsel = Weichenstellung).

1. **Positionswolke statt Ring.** Die Positionen eines Abschnitts liegen nicht mehr
   auf einem Kreisring, sondern dicht gepackt **um** die Abschnitts-Bubble herum
   (Sonnenblumen-Anordnung: Position i bei Radius `c·√i`, Winkel `i·137,5°`). Der
   Wolkenradius wächst mit `√n`: 92 Positionen ≈ Radius 100 statt 1.460; 10.000
   Positionen ≈ Radius 1.000. Ein zarter Halo (helle Fläche, dünner Rand) zeigt die
   Zugehörigkeit; **keine Kante je Position** – das nimmt dem Graphen die meisten
   Linien (hilft G7). Der Halo trägt Zähler und bei Filterung „Treffer/Gesamt".
2. **Voller Kreis für Verzweigungen** (G10). Kinder fächern sich über 360° minus den
   Sektor, aus dem der Elternknoten kommt – nicht mehr nur über 180°. Halbiert den
   Ringradius bei gleicher Kinderzahl. Ketten ohne Verzweigung (Projekt → Los →
   Hauptabschnitt, B2) bekommen minimalen Abstand, damit die erste echte Verzweigung
   nah an der Wurzel liegt.
3. **Punkte und Sammel-Bubbles zurückbauen.** `DOT_AT` entfällt. `CLUSTER_AT` gilt nur
   noch für Geschwister-**Abschnitte** und steigt auf 40 (29 Unterabschnitte werden
   dann einzeln gezeichnet). Positionen werden nie geclustert – die Wolke ersetzt das.
4. **Suche im Layout** (G4). Bei aktiver Suche/Filter: Sammel-Bubbles mit Treffern
   öffnen sich automatisch (abgeleitet wie `openNodes` in `ViewerProvider.tsx`, nicht
   gespeichert). Im Modus „Ausblenden" enthält die Wolke nur Treffer und schrumpft
   entsprechend; im Modus „Dämpfen" bleiben Nicht-Treffer als blasse Punkte.
5. **Detailstufe für große LVs.** Unter einem Schwellen-Zoom (Wolke kleiner als ca.
   40 px auf dem Schirm) wird eine Wolke als **eine** gefüllte Fläche mit Zähler
   gezeichnet statt als einzelne Kreise. So bleiben bei 10.000 Positionen nur wenige
   hundert DOM-Elemente, zusammen mit dem bestehenden Culling.
6. **Konstanten neu abstimmen**: `RADII`, `GAP`, `PARENT_PAD`, Halo-Abstand.
7. **Tests** (`frontend/tests/graph/layoutRadial.test.ts` weitgehend neu):
   Wolkenradius ∝ √n; Geschwister-Wolken überlappen nicht; 29 Abschnitte à 23
   Positionen ergeben einen Durchmesser < 6.000; 10.000 Positionen in einem Abschnitt
   layouten in < 100 ms; Suche öffnet Sammel-Bubbles mit Treffern.

Fertig, wenn:
- Beispieldatei komplett ausgeklappt: alle 29 Unterabschnitte mit Nummer lesbar bei
  „Alles einpassen", verwandte Abschnitte sichtbar nebeneinander.
- Suche zeigt Treffer als hervorgehobene Punkte in ihrer Wolke, ohne Klick.
- 10.000 Positionen: Layout < 100 ms, flüssiges Zoomen.

---

## Reihenfolge und Abhängigkeiten

```
WP-41-1 (Texte)  ──┐
WP-41-2 (Panel)  ──┼── unabhängig, klein, zuerst
WP-41-3 (Tabelle)──┘
WP-41-4 (Graph-Darstellung) ✅ ── vor ──▶ WP-41-5 (Graph-Layout) ✅
```

**Alle fünf Pakete sind umgesetzt.** Damit ist Issue #41 abgearbeitet; die
Positionswolke aus WP-41-5 baut auf der Beschriftung aus WP-41-4 auf.

- WP-41-1 bis WP-41-3 berühren sich nicht und können parallel laufen.
- WP-41-4 vor WP-41-5: `ownCode`, einheitliche Positionen und `fitTo` braucht das
  neue Layout ohnehin; so bleibt der Layout-PR auf das Layout beschränkt.
- Jedes WP ein PR, Conventional Commit mit dem angegebenen Scope.

## Was nicht geändert wird

- Kein Backend, keine Persistenz. Spaltenkonfiguration und Graph-Zustand leben nur in
  der Session.
- `matchPos` bleibt die einzige Filterlogik; das Layout liest nur `MatchIndex`.
- Baum und Graph teilen weiter denselben Aufklapp-Zustand (Issue #18).
- Status bleibt Filter-Facette, nicht editierbar.

## Offene Fragen an den Owner

1. **Zeilen zusammenziehen (T2):** Der Reflow ist eine Heuristik. Sie kann in
   seltenen Fällen zwei bewusst getrennte Zeilen verbinden (z. B. Tabellen im
   Langtext). Vorschlag: aktivieren, mit den Schutzregeln aus WP-41-1. Einverstanden?
2. **Klassifizierungs-Badge (A5):** Nicht klickbar (Vorschlag, einfach) – oder Klick
   setzt den passenden Filter (mehr Aufwand, aber die Hand wäre dann berechtigt)?
3. **Spalten verschieben (A2):** Pfeile im Popover (Vorschlag) oder Ziehen der
   Spaltenköpfe mit der Maus (aufwändiger, weniger barrierefrei)?
4. **Größenmodus für Positionen (G5):** Sollen Positionen im Modus „Gesamtpreis €"
   weiterhin nach Preis skalieren, oder immer gleich groß sein? Vorschlag: nur im
   Preis-Modus skalieren, sonst einheitlich.
5. **Hinweistexte (B1):** Eigenes Issue anlegen? Vorschlag: ja – als Zeile ohne Menge
   in Tabelle und Baum, durchsuchbar, nicht klassifiziert.
