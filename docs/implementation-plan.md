# Implementierungsplan

> Der verbindliche, sequenzierte Plan. Jedes Arbeitspaket (WP) hat einen Commit-Scope,
> konkrete Schritte und **Abnahmekriterien** („Fertig, wenn …").
> Scope-Definition: [`scope.md`](scope.md) · Kursänderung:
> [`decisions/0006-fokus-lv-verstehen.md`](decisions/0006-fokus-lv-verstehen.md).

**Konventionen:** Conventional Commits mit Scopes `gaeb · classify · tree · viewer ·
graph · relate · check · frontend`. Trunk-based, kurzlebige Feature-Branches. Vor jedem
WP prüfen, ob der passende Branch aktiv ist; auf `main` nur hinweisen, keinen Branch
selbst anlegen.

## Stand

| WP | Was | Status |
|---|---|---|
| WP-A…G | MVP: Import, Klassifizierung, Baum, Tree/Tabelle/Filter, Graph, Panel | ✅ umgesetzt (Details unten) |
| WP-41-1…3 | Langtexte, Eigenschaften-Panel, Tabellen-Spalten (Issue #41) | ✅ umgesetzt |
| WP-H | Graph fertigstellen (= WP-41-4 + WP-41-5) | ✅ umgesetzt |
| WP-I | Performance-Fundament für 10k Positionen | ✅ umgesetzt |
| WP-J | Klassifizierung v2: generische Extraktoren + Textstellen | ✅ umgesetzt |
| WP-K | Flags und VOB-Check, Ansicht „Prüfung" | ✅ umgesetzt |
| WP-L | Ansichts-Gerüst + Ansicht „Überblick" | ✅ umgesetzt |
| WP-M | Beziehungen: Ähnlichkeit, Unterschiede, Ausreißer | umgesetzt |
| WP-Q | Graph mit Mehrwert: Treffer isolieren, Stichworte, Menge, Sprung (Issues #51, #60) | ✅ umgesetzt |
| WP-N | Ansicht „Vergleich" | ✅ umgesetzt |
| WP-O | Ansicht „Matrix" | offen |
| WP-P | Feinschliff: Kommandopalette, URL-Zustand, Export, Druck | offen |

Seit [`decisions/0015`](decisions/0015-gewerk-aus-der-abschnittsueberschrift.md) erbt
eine Position das Gewerk aus der Überschrift ihres Abschnitts, wenn ihr eigener Text
keinen Leistungsbereich nennt — das deckt den Normalfall ab. Offen bleibt trotzdem die
inhaltliche Pflege der `keywords`-Spalte in
[`domain/reference/stlb-bau-leistungsbereiche.csv`](domain/reference/stlb-bau-leistungsbereiche.csv)
sowie die neuen Referenzdateien aus [`domain/vob-pruefungen.md`](domain/vob-pruefungen.md).
Ohne sie greifen die jeweiligen Regeln nicht — das ist kein Fehler.

---

# Release 2 · „LV verstehen"

## Reihenfolge

```
WP-H ──► WP-I ──┬──► WP-J ──► WP-K ──────────────┐
                │                                 ├──► WP-P
                ├──► WP-L ──► WP-M ──► WP-N ──► WP-O
                └──► WP-Q
```

- **WP-H und WP-I zuerst** — beide stehen. Ohne tragfähigen Graphen und ohne
  Performance-Fundament bringt jede neue Ansicht nur mehr Ruckeln.
- WP-J ist die Datengrundlage für WP-K, WP-M, WP-N und WP-O. Ohne die neuen Merkmale
  haben Prüfung, Ähnlichkeit, Vergleich und Matrix nichts zu zeigen.
- **WP-Q läuft als Nächstes**, vor WP-N und WP-O: der Graph ist die Einstiegsansicht,
  und die einzigen offenen Issues (#51, #60) zeigen auf ihn. Er hängt nur an WP-I
  (Positions-Index) und WP-J (Merkmale), beide stehen.
- Ein WP = ein Pull Request.

---

## WP-H · Graph fertigstellen · `feat(graph)`

**Ziel:** Der Graph verträgt reale Dateien. Umfang und Abnahme stehen bereits in
[`plans/issue-41-app-usage-review.md`](plans/issue-41-app-usage-review.md) — WP-41-4
(Darstellung, Beschriftung, Zoom auf Auswahl) und WP-41-5 (Positionswolke statt Ring,
weiter Fächer, Detailstufe). Dieses WP übernimmt sie unverändert.

**Beide Pakete sind umgesetzt** — WP-41-4 (Beschriftung, `ownCode`, Zoom auf die
Auswahl) und WP-41-5 (Positionswolke, Entscheidung
[`decisions/0008-graph-layout-positionswolke.md`](decisions/0008-graph-layout-positionswolke.md)).

**Zusatz gegenüber dem alten Plan:** Der Graph ist ab jetzt eine Ansicht unter
mehreren, kein Sonderfall. Sein Zustand (Zoom, offene Knoten) lebt im gemeinsamen
Viewer-State, damit WP-L ihn beim Ansichtswechsel erhalten kann.

**Fertig, wenn:** die Abnahmekriterien von WP-41-4 und WP-41-5 erfüllt sind und der
Graph-Zustand einen Ansichtswechsel übersteht.

---

## WP-I · Performance-Fundament · `perf(frontend)`

**Ziel:** 10.000 Positionen ohne Ruckeln. Vorher traversierte jede Ansicht den
`LVNode`-Baum bei jedem Render und leitete je Position die Merkmale neu ab — das
trug nicht.

**Umgesetzt.** Begründung und verworfene Wege:
[`decisions/0010-positions-index-und-aggregate.md`](decisions/0010-positions-index-und-aggregate.md).

Schritte:
1. ✅ `src/lib/index/positionIndex.ts`: flacher Index über alle Positionen, einmal nach
   `buildTree` erzeugt. Je Position ein Eintrag mit Verweis auf den Baumknoten, den
   vorberechneten Facettenwerten und dem fertigen Suchtext; Menge, EP und GP als
   `Float64Array`, damit Summen und Wertebereiche ohne Objekt-Traversierung laufen.
2. ✅ Aggregate (`src/lib/index/summary.ts`: Facetten-Zähler, Wertebereiche,
   Gesamtsumme) entstehen in `classifyAndBuild` — also im Worker, sobald dessen
   Schwelle greift — und liegen fertig im `LoadedLV`. `FacetButton` und `RangeButton`
   rechnen nichts mehr im Render.
3. ✅ Die Filterentscheidung bleibt eine einzige Funktion (`matchFacts` in
   `src/lib/matchPos.ts`); sie arbeitet gegen die vorberechneten Fakten des Index.
   `matchPos` bleibt die Hülle für Aufrufer ohne Index.
4. ✅ Tabelle und Baumspalte waren bereits virtualisiert (Issues #22 und #23) — am
   10k-Fixture nachgeprüft, kein weiterer Umbau nötig.
5. ✅ Messpunkte in `src/lib/perf.ts`: Ladezeit, Index-Aufbau, Filterzeit,
   Ansichtswechsel — Ausgabe in der Konsole, nur im Entwicklungsmodus, nie im UI.
6. ✅ Generator für 10.000 synthetische Positionen in `tests/support/syntheticLv.ts`
   (Testcode, keine große Datei im Repo).

**Gemessen bei 10.000 Positionen** (Node 22, CI-Container):

| Schritt | Zeit |
|---|---|
| Klassifizierung + Baum + Index + Aggregate (im Worker) | ~360 ms |
| Index-Aufbau allein (Haupt-Thread, einmal je LV) | ~35 ms |
| Filterlauf (Facette, Mengenbereich oder Volltextsuche) | ~2 ms |
| Trefferzahlen für Baum und Graph | ~7 ms |

Vorher kostete allein die Positionsprüfung ~30 ms je Durchlauf — und sie lief
mehrfach je Filterwechsel.

**Fertig, wenn:** ✅ alle drei Kriterien erfüllt.
- 10k Positionen: erste Ansicht < 5 s, Filterwechsel < 100 ms, Ansichtswechsel < 200 ms.
- Die Tabelle mit 10k Zeilen scrollt flüssig.
- `npm test` enthält einen Performance-Test (`tests/perf/filter.test.ts`), der die
  Filterzeit misst und bei Überschreitung fehlschlägt.

---

## WP-J · Klassifizierung v2 · `feat(classify)`

**Ziel:** Merkmale, die in **jedem** Gewerk greifen, plus die Textstellen dazu.

**Umgesetzt.** Begründung und verworfene Wege:
[`decisions/0011-extraktoren-und-fundstellen.md`](decisions/0011-extraktoren-und-fundstellen.md).

Schritte:
1. ✅ `ClassificationResult` um `spans` erweitert (`{ key, start, end, label }`),
   abgelegt unter dem reservierten `attributes._spans`. Die Indizes zeigen auf den
   **Rohtext** des Langtexts — auf der normalisierten Fassung ließe sich nichts
   markieren. Schema:
   [`architecture/data-model.md`](architecture/data-model.md#spans).
2. ✅ Gewerkeunabhängige Extraktoren in `src/lib/classify/extractors/`:
   - `normen.ts` — DIN, DIN EN, DIN EN ISO, VOB/C, ATV, ZTV; Ausgabestand gehört
     zur Fundstelle, nicht zum Wert
   - `masse.ts` — Zahl + Einheit mit Kontext (Dicke, Höhe, Länge, Gewicht);
     kompositumfest („Wandstärke 24 cm"), Formelzeichen nur mit `=`
   - `material.ts` — Materialstichworte **ausschließlich** aus der
     `keywords`-Spalte des STLB-Katalogs; leer, solange die gepflegt werden muss
   - `platzhalter.ts` — offene Textergänzungen (Punktreihen aus
     `<TextComplement Kind="Bidder">`, ausformulierte Bieterangaben) samt Anzahl
   - `verweise.ts` — „siehe Pos.", „laut Anlage", Vorbemerkung, Plan, Gutachten
   - `fristen.ts` — Termin, Bauzeit, Winterbau, Vorleistung, Arbeiten unter
     Verkehr, Nacht-/Wochenendarbeit, Bauablauf
3. ✅ Sie laufen **vor** den Rulesets; die Rulesets überschreiben nur. Die Maße
   sind dabei aus `fallback.ts`/`beton.ts`/`mauerwerk.ts` hierher gewandert statt
   dreimal zu existieren.
4. ✅ `Highlighted.tsx` zeichnet Spans mehrerer Kategorien gleichzeitig, je
   Kategorie eine Farbe (`lib/spanCategories.ts`), einzeln abschaltbar über die
   Schalterreihe über dem Langtext.
5. ✅ Unit-Tests je Extraktor mit Treffer **und** Negativfall
   (`tests/classify/extractors.test.ts`), Weg der Fundstelle bis in die Attribute
   (`tests/classify/spans.test.ts`), Zeichnen und Abschalten
   (`tests/components/highlighted.test.tsx`).

**Zusatz gegenüber dem alten Plan:** Normverweise stehen nicht mehr unter
`keywords` („Besonderheiten"), sondern im eigenen Key `normen` — sonst stünde
„DIN EN 206" zweimal im Eigenschaften-Panel. Neue Facetten: Normen · Material ·
Zeitbezug · Offene Stellen.

**Fertig, wenn:** ✅ alle drei Kriterien erfüllt.
- Eine Position mit „C30/37 nach DIN EN 206, d = 30 cm" liefert `normen`, `dicke`
  und `beton` — jeweils mit korrekter Textstelle (Test in
  `tests/classify/extractors.test.ts`).
- Im Eigenschaften-Panel sind die Fundstellen im Langtext farbig markiert.
- Eine Position ohne erkennbare Merkmale liefert keine leeren Keys.

Gegenprobe an der echten Beispieldatei (`tests/fixtures/gaeb-xml-beispiel.x83`):
13 von 28 Positionen tragen Fundstellen, darunter `DIN 18300`, `DIN 18915`,
„gemäß Gutachten" und zwei offene Textergänzungen („Breite von …").

---

## WP-K · Flags und VOB-Check · `feat(check)`

**Ziel:** Die vier „wichtig"-Kategorien und der VOB-Check als auswertbare Hinweise.

**Umgesetzt.** Begründung und verworfene Wege:
[`decisions/0012-pruefregeln-und-norm-verweise.md`](decisions/0012-pruefregeln-und-norm-verweise.md).

Schritte:
1. ✅ `src/lib/check/types.ts`: `Flag { id, category, severity, positionId, title, span }`.
   Kategorien: `geld | menge | risiko | norm | frist | vob`. Dazu `RuleStatus` — eine
   Regel, die nicht läuft, verschwindet nicht, sondern nennt ihren Grund.
2. ✅ Regel-Registry `src/lib/check/` — ein Modul je Regelgruppe, Registrierung wie bei
   den Rulesets. Der **Norm-Verweis steht nicht im Code**, sondern in
   [`domain/reference/pruefregeln.csv`](domain/reference/pruefregeln.csv).
3. ✅ V1, V2, V4, V5, V6, V7 umgesetzt und aktiv. V3, V8, V9, V10 angemeldet und
   inaktiv, bis ihre Referenzdateien Einträge haben — mit sichtbarem Grund.
4. ✅ Geld-/Mengentreiber: G1 (Anteil an der Gesamtsumme), G2 (Mengen-Rang **je
   Einheit**), G3 (dieselbe Einheit uneinheitlich geschrieben). Bewusst **Rang statt
   Schwellwert**, und eine Rangliste erscheint erst, wenn sie auch jemanden auslässt
   — „Rang 3 von 4" ist Rauschen. Der EP-Ausreißer kam mit WP-M nach (G4): ohne
   Vergleichsgruppe war er nicht berechenbar.
5. ✅ **Einheiten-Gruppen** aus
   [`domain/reference/einheiten-gruppen.csv`](domain/reference/einheiten-gruppen.csv):
   `Stk`/`Stck`/`St`/`Stück`, `to`/`t`, `h`/`Std`/`Stunde`. Groß-/Kleinschreibung und
   `m³`/`m3` führt der Code selbst zusammen (WP-J). `lfm` und `m` bleiben getrennt —
   Abrechnungsart, keine Schreibweise. Dazu Regel G3 als Hinweis.
6. ✅ Ansicht **Prüfung** als dritter Ansichtsmodus: Hinweise nach Regel gruppiert,
   mit Anzahl, aufklappbarer Fundliste, Sprung zur Position und Schalter je Regel.
7. ✅ Formulierungen: Hinweis, kein Urteil. Ein Test hält das fest — keine Regel darf
   „unzulässig", „Verstoß", „verboten", „fehlerhaft" oder „falsch" sagen.

**Fertig, wenn:** ✅ alle vier Kriterien erfüllt.
- Eine reale Datei mit Bedarfspositionen und Platzhaltern erzeugt Hinweise mit
  korrekter Anzahl und korrektem Sprungziel.
- Jede Regel ist einzeln abschaltbar; abgeschaltet verschwindet sie aus allen Ansichten.
- Fehlende Referenzdatei ⇒ Regel inaktiv, kein Fehler, sichtbarer Hinweis „inaktiv".
- Je Regel mindestens ein Test mit Treffer und einer ohne.

**Gegenprobe an der Beispieldatei** (`tests/fixtures/gaeb-xml-beispiel.x83`, 28
Positionen): 11 Hinweise — 2× Bedarfsposition (V1), 3× Abrechnung nach Zeit (V2),
1× fehlende Menge und Einheit (V5), 1× Verweis auf ein Gutachten (V6), 1× zwei offene
Textergänzungen (V7), 3× dieselbe Einheit als „psch", „Psch" und „PSCH" (G3). Vier
Regeln stehen als inaktiv mit ihrem Grund da. Ein Test prüft, dass jedes Sprungziel
eine Position im Baum ist.

**Offen für den Owner:** Die Norm-Verweise von V1, V2, V4, V5 und V6 tragen den Status
`zu_bestaetigen` und erscheinen im UI mit dem Zusatz „Verweis zu bestätigen"
(Fragenliste in [`domain/vob-pruefungen.md`](domain/vob-pruefungen.md)).
Ebenso leer: Herstellerliste (V3) und Nebenleistungs-Listen (V8, V9).

---

## WP-L · Ansichts-Gerüst und Überblick · `feat(viewer)`

**Ziel:** Acht gleichrangige Ansichten auf einem Filterzustand — und die erste neue.

**Umgesetzt.** Vier von acht Ansichten stehen: Überblick · Graph · Tabelle · Prüfung.

Schritte:
1. ✅ Der Viewer-Zustand ist in drei Bereiche getrennt, je ein Modul mit eigenem
   Reducer: `src/state/filterState.ts` (Suche, Facetten, Nicht-Treffer-Modus,
   stummgeschaltete Prüfregeln), `src/state/selectionState.ts` (Auswahl,
   Aufklapp-Zustand) und `src/state/viewState.ts` (aktive Ansicht plus je Ansicht
   eigener Zustand). `viewer.ts` klammert sie und behandelt nur, was mehr als einen
   Bereich betrifft (`loaded`, `clear`, `openInTable`, `showGraph`). Die
   Mehrfachauswahl kommt mit WP-N dazu.
2. ✅ Ansichtsumschalter in der `TopBar`. `setViewMode` fasst nur `view.mode` an;
   Sortierung, Tabellen-Umfang, Spalten, Scrollposition je Ansicht und der
   Graph-Ausschnitt liegen im Ansichts-Zustand und überleben den Wechsel. Der
   Graph-Ausschnitt wandert **beim Verlassen** dorthin, nicht je Frame — als
   Context-State würde jedes Ziehen die ganze Seite neu rendern.
3. ✅ Ansicht **Überblick** (`src/components/overview/`, Rechenteil in
   `src/lib/overview/`): Kennzahlen, Treemap (squarified, `lib/overview/treemap.ts`)
   nach Gewerk und Abschnitt mit Klick-Filter, Pareto-Kurve und Mengen je Einheit.
   Gerechnet wird gegen den flachen Positions-Index, einmal je Filterwechsel.
4. ✅ Ohne Preise: die Geld-Kachel sagt „keine Preise", die Treemap misst die Anzahl
   statt der Summe, und die Pareto-Auswertung entfällt mit sichtbarem Grund.
5. ✅ Gewerk-Farbskala in `src/lib/colors.ts` über den Tokens `--cat-1…10`, einmal je
   Datei im `ViewerProvider` gebaut und für alle Ansichten da
   ([`decisions/0013`](decisions/0013-gewerk-farbskala.md)).

**Der Überblick ist die Eingangsansicht** — nach dem Import steht er vorn, nicht mehr
der Graph. Er ordnet die Datei ein, bevor man tiefer geht.

**Fertig, wenn:** ✅ alle drei Kriterien erfüllt.
- Filter setzen, Ansicht wechseln, zurückwechseln: Filter, Auswahl und Scrollposition
  sind unverändert (`tests/state/viewer.test.ts`, `tests/App.test.tsx`).
- Der Überblick einer realen Datei stimmt gegen die Tabellensummen (Stichprobe):
  `tests/overview/model.test.ts` prüft die Summe gegen die vorberechneten Aggregate.
- Eine x83-Datei ohne Preise zeigt keine Null-Euro-Kacheln
  (`tests/components/overviewView.test.tsx` gegen die Beispieldatei).

---

## WP-M · Beziehungen · `feat(relate)`

**Ziel:** Ähnliche Positionen finden, Unterschiede benennen, Ausreißer zeigen.

**Umgesetzt.** Begründung und verworfene Wege:
[`decisions/0016`](decisions/0016-aehnlichkeit-und-cluster.md).

Schritte:
1. ✅ `src/lib/relate/` — `text.ts` (Kleinschreibung, Zahlen und Einheiten maskiert,
   Stoppwörter, Wort-Schindeln), `stats.ts` (Median, Quartile), `similarity.ts`
   (Vorgruppierung, Ähnlichkeitsmaß, Cluster), `types.ts`. Vorgruppiert wird nach
   Gewerk, Einheit und Bauteiltyp; verglichen wird nur innerhalb einer Gruppe.
   Ähnlichkeit = Jaccard über Wort-Schindeln (Kurztext vor Langtext) plus
   Merkmals-Übereinstimmung. Schwellwert einstellbar, Standard 0,62.
2. ✅ Ergebnis `Cluster { id, positionIds, label, gemeinsameMerkmale,
   unterscheidendeMerkmale, ausreisser, unitPrice, quantity, similarity }` —
   beschrieben in [`architecture/data-model.md`](architecture/data-model.md#cluster).
3. ✅ Läuft in `classifyAndBuild` — also im Worker, sobald dessen Schwelle greift —
   und liegt fertig als `LoadedLV.relations` im State. Kein Render rechnet nach.
4. ✅ Ausreißer je Cluster über Median und Quartilsabstand (Tukey-Zaun 1,5 × IQR),
   für Einheitspreis und Menge getrennt. Unter vier Werten oder bei
   Quartilsabstand 0 meldet die Gruppe nichts — das wäre Rauschen.
5. ✅ Ansicht **Ähnlichkeit** (`src/components/relate/`) als fünfter Ansichtsmodus:
   Gruppen mit Größe, Streuung, gemeinsamen und unterscheidenden Merkmalen,
   aufklappbarer Mitgliederliste und Sprung zur Position. Regler „ab n Mitgliedern"
   und Sortierung nach Größe, Streuung oder Ähnlichkeit.
6. ✅ Tests in `tests/relate/` und `tests/components/similarView.test.tsx`.

**Zusatz gegenüber dem alten Plan:** Prüfregel **G4 · Einheitspreis fällt aus der
Gruppe**. WP-K hatte sie ausdrücklich an dieses Paket abgegeben („ohne
Vergleichsgruppe nicht berechenbar"); mit den Clustern ist sie berechenbar.

**Abweichung:** Der Regler „nur Positionen in Clustern ab n Mitgliedern" begrenzt die
Liste **in der Ansicht** und ist kein globaler Filter. `matchPos` entscheidet je
Position aus der Position selbst; die Cluster-Zugehörigkeit entsteht erst danach.

**Mit WP-N nachgezogen:** Jede Cluster-Karte legt ihre Mitglieder auf Wunsch
nebeneinander („Vergleichen"); der Klick auf eine einzelne Position führt weiterhin
in die Tabelle.

**Fertig, wenn:** ✅ alle drei Kriterien erfüllt.
- Eine reale Datei mit wiederkehrenden Leistungen zeigt diese als Cluster: die
  Beispieldatei (`tests/fixtures/gaeb-xml-beispiel.x83`, 28 Positionen) ergibt
  4 Gruppen mit 8 Positionen — unter anderem zwei Kalksandstein-Innenwände, die sich
  nur in der Dicke unterscheiden (`tests/relate/similarity.test.ts`).
- Ein Cluster benennt, welche Merkmale gemeinsam und welche unterschiedlich sind
  (`tests/components/similarView.test.tsx`).
- Die Laufzeit bleibt im Worker und blockiert die UI nicht (Budget 3 s,
  `tests/relate/similarity.test.ts`). Gemessen wird der **teure** Fall: 9.900
  Positionen in **einer** Vorgruppe, jede mit eigenem Text — 300 Wandtypen à 33
  Varianten, damit die Abkürzung über wortgleiche Texte nicht greift. Rund 0,3 s,
  und die 300 Familien kommen als 300 Gruppen heraus. Ein LV mit viel Wiederholung
  (`syntheticDraft`) liegt darunter und steht als zweiter Fall daneben.

---

## WP-Q · Graph mit Mehrwert · `feat(graph)`

**Ziel:** Der Graph beantwortet drei Fragen auf einen Blick: Wo steckt das Geld? Wo
sitzen meine Treffer? Was steht hinter dieser Bubble? Deckt Issue #51 und Issue #60 ab.

**Vorgabe des Owners zu Issue #60:** beides bauen — Treffer im ganzen Graphen
hervorheben **und** Treffer isolieren — mit einem Umschalter dazwischen. Eine geteilte
Ansicht war zunächst gebaut und wurde nach dem Ausprobieren wieder verworfen
([`decisions/0018`](decisions/0018-graph-treffer-isolation.md)).

Schritte:

1. ✅ **Trefferansicht umschaltbar.** Zustand `view.graph.focus` in
   `src/state/viewState.ts`: `'structure' | 'isolate'`.
   - `structure` („Gesamter Graph") — heutiger Stand: das ganze LV, Treffer
     hervorgehoben, Rest gedämpft.
   - `isolate` („Isolation") — nur Treffer, neu gruppiert (Schritt 2).
   Umschalter im Graph-Kopf, nur bedienbar, solange Filter oder Suche aktiv sind; ohne
   Treffer fällt die Ansicht auf `structure` zurück. Der Umschalter ändert **nie** den
   Filter — Regel „ein Filterzustand, alle Ansichten" bleibt unberührt.
   **Einstieg ist `structure`** (Wunsch des Owners nach der Preview von PR #61): der
   ganze Graph ordnet die Treffer ins LV ein, die Isolation ist der zweite Blick.
   Dazu steht der Umschalter „Nicht-Treffer" (Hervorheben/Ausblenden) nur noch dort,
   wo er etwas bewirkt — im Baum der Tabellenansicht und im ganzen Graphen. Die
   Isolation zeigt ausschließlich Treffer, Überblick, Prüfung und Ähnlichkeit
   rechnen ohnehin nur mit ihnen.
2. ✅ **Treffer-Cluster in der Isolation.** Gruppenschlüssel umschaltbar: Abschnitt,
   Gewerk oder Bauteiltyp. Jede Gruppe ist eine Bubble mit Trefferzahl und Summe,
   Gruppen absteigend nach dem aktiven Größenmodus sortiert. Gerechnet wird auf dem
   Positions-Index aus WP-I, nicht auf dem Baum.
3. ✅ **Positionen sortiert und beschriftet** (Issue #51). Innerhalb eines Abschnitts
   stehen die Positionen absteigend nach dem aktiven Größenmodus — die teuerste sitzt
   innen. Jede Positions-Bubble trägt neben der OZ ein Stichwort aus dem Kurztext;
   Wortwahl über die vorhandene Textnormalisierung aus `src/lib/relate/text.ts`
   (Stoppwörter raus, Zahlen und Einheiten maskiert), damit Graph und Ähnlichkeit
   dieselben Worte verwenden.
4. ✅ **Anteil sichtbar machen** (Issue #51). Abschnitts-Bubbles zeigen ihren Anteil am
   Projekt in Prozent. Größenmodus **Menge** kommt dazu, wird aber nur angeboten, wenn
   die gefilterte Menge **eine einzige Einheit** hat — m³ und Stück zu addieren ergibt
   keine Zahl. Sonst ist der Modus ausgegraut und nennt den Grund.
5. ✅ **Sprung in die Tabellenzeile** (Issue #51). Die Auswahlkarte im Graphen führt in
   die Tabelle, die dort auf die Zeile scrollt — derselbe Weg wie `jumpTo` in
   `src/components/check/CheckView.tsx` und `src/components/relate/SimilarView.tsx`,
   dafür in `src/components/common/useJumpToPosition.ts` zusammengezogen.
6. ✅ **Entscheidung festhalten:** `docs/decisions/0018-graph-treffer-isolation.md` —
   warum zwei Ansichten, und warum die Isolation den ganzen Graphen nicht ersetzt.
7. ✅ **Tests:** Gruppenbildung, Wolken-Sortierung, Stichwort und Mengen als reine
   Funktionen in `tests/graph/`; Umschalter, Anteil, gesperrter Mengen-Modus, Sprung
   und das Holen der Zeile in `tests/components/`; Laufzeit der Gruppenbildung bei 10k
   Positionen gegen ein Budget.

**Umgesetzt (Schritt 1 und 2).** Begründung und verworfene Wege:
[`decisions/0018`](decisions/0018-graph-treffer-isolation.md). Kern ist
`src/lib/graph/focusTree.ts`: die Isolation ist ein **synthetischer `LVNode`-Baum**
(Wurzel → Gruppen → Treffer) und läuft durch dasselbe Layout und denselben Renderer
wie der ganze Graph — kein zweiter Graph. Die Positionsknoten darin sind dieselben
Objekte wie im echten Baum, deshalb bleiben Auswahl und Farben beim Umschalten stehen.
Tests: `tests/graph/focusTree.test.ts`, `tests/components/graphFocus.test.tsx`.

**Abweichung zu Schritt 2:** Gebündelt wird nach Bauteiltyp statt nach „der Facette,
die den Treffer erzeugt hat" — bei einer Volltextsuche gibt es keine auslösende
Facette, die Bündelung wäre mal da und mal weg.

**Umgesetzt (Schritt 3 bis 5).** Neu sind `src/lib/graph/keywords.ts` (Stichwort aus
dem Kurztext), `src/lib/graph/quantities.ts` (Mengen über die gefilterte Menge) und
`src/components/common/useJumpToPosition.ts` (ein Sprung für alle Ansichten). Die
Tabelle holt die gewählte Zeile jetzt ins Fenster (`revealKey` in `ui/DataTable.tsx`)
— das fehlte auch Prüfung und Ähnlichkeit.

**Abweichungen:**
- Das Stichwort erscheint nicht ab einer festen Zoomstufe, sondern sobald der Abstand
  zweier Nachbarn auf dem Schirm ein Wort trägt (`KEYWORD_AT_PX`). Ab einer festen
  Stufe stünden in einer dichten Wolke hundert Wörter übereinander.
- Der Klick auf eine Positions-Bubble öffnet weiter die Auswahlkarte (Issue #30); der
  Sprung in die Tabelle sitzt als Knopf **in** der Karte. Ein Klick, der die Ansicht
  wechselt, wäre ein Rückschritt hinter Issue #30.
- Der Anteil steht nicht an der Wurzel und nicht an Positionen: „100 %" am einzigen Los
  ist keine Information, und Positionsanteile sind zu kleine Zahlen.

**Offen:** Eine Gruppen-Bubble der Isolation ist kein LV-Knoten; sie lässt sich
einpassen, aber nicht auswählen und nicht zuklappen.

**Fertig, wenn:**
- Eine Suche mit wenigen Treffern in einem 10k-LV zeigt in `isolate` nur diese Treffer,
  gruppiert und sortiert; ein Umschalten nach `structure` und zurück ändert weder
  Filter noch Auswahl.
- ✅ Positions-Bubbles tragen ein lesbares Stichwort, sobald der Platz dafür reicht, und
  die größte Position eines Abschnitts sitzt im Kern ihrer Wolke.
- ✅ Aus der Auswahlkarte landet man in der zugehörigen Tabellenzeile, und die Tabelle
  scrollt sie ins Fenster.
- Umschalten der Trefferansicht bleibt unter 100 ms bei 10k Positionen.

---

## WP-N · Vergleich · `feat(viewer)`

**Ziel:** 2–5 Positionen nebeneinander, Unterschiede sichtbar.

Schritte:
1. ✅ Mehrfachauswahl: Strg-/Cmd-Klick in Tabelle, Baum und Graph; die Cluster-Liste
   der Ähnlichkeit legt eine ganze Gruppe auf einmal nebeneinander („Vergleichen").
2. ✅ Ansicht **Vergleich**: Spalte je Position, Zeile je Merkmal. Abweichende Werte
   farbig, gleiche Werte gedämpft, dazu ein Schalter „nur Unterschiede".
3. ✅ Langtext-Diff wortweise, eigene Implementierung ohne Abhängigkeit —
   [`decisions/0020`](decisions/0020-langtext-vergleich-ohne-bibliothek.md).
4. ✅ Sprung von jeder Spalte zurück in die Tabelle (`useJumpToPosition`).

**Umgesetzt.** Neu sind `src/lib/compare/rows.ts` (Merkmalszeilen) und
`src/lib/compare/textDiff.ts` (Wortvergleich), dazu die Ansicht
`src/components/compare/CompareView.tsx`. Die Merkmalszeilen kommen aus
`merkmaleOf` (WP-M) — dieselbe Funktion, nach der die Ähnlichkeit gruppiert:
sagt sie „diese beiden unterscheiden sich in der Dicke", hebt der Vergleich genau
diese Zeile hervor. Tests: `tests/compare/`, `tests/components/compareView.test.tsx`.

**Abweichungen:**
- Die **Auswahl** wird nicht begrenzt; die **Ansicht** zeigt die ersten fünf und sagt,
  wie viele warten. Eine Auswahl still wegzuwerfen wäre schlimmer als eine ehrliche
  Grenze.
- Die Menge steht mit der kanonischen Einheit da („Psch" und „PSCH" sind dieselbe):
  ein Unterschied in der Schreibweise ist keiner in der Sache.

**Fertig, wenn:** ✅ beide Kriterien erfüllt.
- Zwei fast gleiche Positionen zeigen genau die abweichenden Zeilen
  (`tests/compare/rows.test.ts`, `tests/components/compareView.test.tsx`).
- Fünf Positionen passen lesbar nebeneinander; ab sechs zeigt die Ansicht die ersten
  fünf und benennt den Rest — von Hand gewählt wie als ganze Gruppe
  (`tests/components/compareView.test.tsx`, `tests/components/similarView.test.tsx`).

---

## WP-O · Matrix · `feat(viewer)` ✅ umgesetzt

**Ziel:** Heatmap über zwei Merkmale, Lücken und Häufungen auf einen Blick.

Schritte:
1. ✅ Zwei Achsen frei wählbar aus allen Facetten (Standard: Gewerk × Bauteiltyp).
   Wer die Facette der Gegenachse wählt, tauscht die Achsen.
2. ✅ Zellwert umschaltbar: Anzahl, Menge, Summe. „Menge" nur innerhalb einer
   Einheit (Entscheidung 0019), „Summe" nur mit Preisen in der Datei — sonst
   steht der Knopf gesperrt da und nennt den Grund.
3. ✅ Klick auf eine Zelle setzt **beide** Facetten auf den Wert der Zelle und
   wechselt in die Tabelle.
4. ✅ Leere Zellen bleiben sichtbar leer — die Lücke ist die Information.
5. ✅ Zählregeln in `docs/decisions/0021-matrix-zaehlregeln.md`: mehrwertige
   Merkmale zählen in jeder Zelle mit (und die Ansicht sagt es), „Ohne Angabe"
   bekommt eine eigene, nicht filterbare Zeile, 14 Werte je Achse stehen
   einzeln, der Rest wird gesammelt.

**Fertig, wenn:** ✅ beide Kriterien erfüllt.
- Achsen und Zellwert lassen sich umschalten, ohne den Filter zu verlieren
  (`tests/components/matrixView.test.tsx`).
- Klick auf eine Zelle führt zur passenden gefilterten Menge
  (`tests/matrix/model.test.ts`, `tests/components/matrixView.test.tsx`).

---

## WP-P · Feinschliff · `feat(frontend)`

**Ziel:** Das Werkzeug wird schnell bedienbar und teilbar.

Schritte:
1. **Kommandopalette** (Strg/Cmd + K): zu OZ springen, Filter setzen, Ansicht wechseln.
2. **Zustand im URL-Fragment** (`#...`): aktive Ansicht, Filter, Auswahl. Ein Fragment
   wird von Browsern **nie** an einen Server gesendet — die Regel „keine Fachdaten nach
   draußen" bleibt gewahrt. Kurz in der Entscheidung festhalten.
3. ✅ **Lokaler Export**: gefilterte Positionsliste als CSV (alle Spalten,
   Semikolon und BOM für Excel) und Prüf-Hinweise als Markdown, erzeugt als Blob
   im Browser (`lib/export/`).
4. ✅ **Druckansicht** für die gefilterte Menge — als **eigene, unvirtualisierte**
   Tabelle (`components/print/PrintView.tsx`), gezeichnet erst bei `beforeprint`.
   Print-CSS über die Positionstabelle hätte nur das sichtbare Fenster gedruckt.
   Ohne Preise fallen die Preisspalten weg, mit Preisen steht eine Summe über
   genau die gedruckten Zeilen darunter.
5. Tastaturbedienung in allen Ansichten (Auswahl mit Pfeiltasten, Enter öffnet).
6. ✅ **Fehler melden** (Issue #57): ein Knopf öffnet ein vorbefülltes GitHub-Issue in
   einem neuen Tab — Browser, App-Version, Fehlermeldung. **Keine Fachdaten aus der
   geladenen Datei**, kein Dateiname, keine Positionstexte. Der Nutzer sieht den Text
   vor dem Absenden und schickt ihn selbst ab. Begründung und die abgelehnte
   Nutzungsmessung: [`decisions/0017`](decisions/0017-keine-nutzungsmessung.md).

Die Schritte 3, 4 und 6 stehen (Menü „Mitnehmen" in der Kopfleiste); Begründungen
und verworfene Wege: [`decisions/0022`](decisions/0022-export-und-druck-ohne-request.md).
Offen sind die Schritte 1, 2 und 5.

**Fertig, wenn:**
- Ein geteilter Link stellt Ansicht und Filter wieder her, sobald dieselbe Datei geladen
  ist — ohne Fachdaten im Link außer der OZ der Auswahl.
- ✅ Der Export enthält genau die gefilterte Menge (`tests/export/positions.test.ts`,
  `tests/components/exportMenu.test.tsx`).
- ✅ Im Netzwerk-Tab ist bei Export und Druck kein Request zu sehen
  (`tests/export/download.test.ts`; zusätzlich im Browser gegengeprüft).
- ✅ Der Melde-Knopf erzeugt einen GitHub-Link ohne einen einzigen Inhalt aus der geladenen
  Datei (Test über die erzeugte URL: `tests/export/issueLink.test.ts`).

---

## Zurückgestellt

**Issue #56 — Lesezeichen und Text-Tags:** zurückgestellt, bis WP-N, WP-O und WP-P
stehen. Ohne Persistenz wäre jedes Lesezeichen nach einem Reload weg. Ob das trotzdem
nützt, entscheidet sich erst, wenn der Export aus WP-P existiert.

**Issue #57 — Nutzung messen:** abgelehnt. Jede Messung braucht einen Empfänger, also
einen Server. Vom Issue bleibt der Melde-Knopf in WP-P Schritt 6. Begründung:
[`decisions/0017`](decisions/0017-keine-nutzungsmessung.md).

---

## Offene Fragen an den Owner

1. **Anwendungsfälle UC-1…UC-6** in [`scope.md`](scope.md#anwendungsfälle): stimmen sie,
   fehlt einer, ist einer überflüssig?
2. **VOB-Paragraphen** aus [`domain/vob-pruefungen.md`](domain/vob-pruefungen.md):
   bitte die als `zu bestätigen` markierten Verweise prüfen.
3. **Referenzdaten:** Wer liefert Herstellerliste (V3) und Nebenleistungen je ATV (V8)?
4. **Kennzahlen-Plausibilität** (Schalung m² je m³ Beton, Bewehrung kg je m³): Richtwerte
   müssen aus der Praxis kommen, nicht aus dem Modell. Willst du sie beisteuern? Dann
   wird daraus ein eigenes WP.
5. **Beispieldateien mit Preisen** (x84/x86) für Tests — gibt es welche, die im Repo
   liegen dürfen?

---

# Abgeschlossen · MVP (WP-A … WP-G)

> Historie. Diese Pakete sind umgesetzt und werden nicht mehr geändert — sie
> dokumentieren, wie der heutige Stand entstanden ist.

## WP-A · Frontend-Gerüst  · `feat(frontend)`

**Ziel:** Vite + React + TypeScript + Tailwind in `frontend/`, lauffähig, ohne
Fachlogik. Grundlage für alle folgenden WPs.

Schritte:
1. `frontend/` mit Vite (React-TS-Template) + Tailwind aufsetzen.
2. `src/types/lvDraft.ts`, `src/types/lvNode.ts` — TS-Äquivalente der bisherigen
   Pydantic-Modelle (`LVDraft`/`LotDraft`/`SectionDraft`/`PositionDraft`, `LVNode`),
   siehe [`architecture/data-model.md`](architecture/data-model.md).
3. `src/pages/ViewerPage.tsx` — 3-Spalten-Layout (leer/Platzhalter), `src/App.tsx`,
   `src/main.tsx`.
4. `vitest` + `@testing-library/react` als Dev-Dependencies, ein Smoke-Test.
5. ESLint + Prettier-Konfiguration (wird vom Claude-Code-Hook genutzt).

**Fertig, wenn:**
- `npm run dev` startet die App lokal.
- `npm test` läuft grün (Smoke-Test).
- `npm run build` erzeugt ein statisches Bundle ohne Fehler.

---

## WP-B · GAEB-Parser (TS)  · `feat(gaeb)`

**Ziel:** GAEB DA XML (2.0–3.3) im Browser parsen, ohne Server. Ersetzt den
`PyGAEBAdapter` funktional, portiert dessen Feldabdeckung.

Schritte:
1. `src/lib/gaeb/parser.ts`: `GaebParser`-Interface + `XmlGaebParser`-Implementierung
   (DOMParser, kein zusätzliches XML-Package nötig für den Kernpfad; bei Bedarf
   `fast-xml-parser` als Fallback für Edge Cases).
2. Mapping GAEB-Item-Typen → `PositionType` (`Normal`, `LumpSum`, `Alternative`,
   `Eventual`, `BaseSurcharge`, `Supplement`, `Markup`, …) — Referenz: die Mapping-
   Tabelle aus dem archivierten `app/adapters/gaeb_adapter.py`.
3. Exceptions: `GAEBParseError`, `GAEBValidationError`, `GAEBVersionError` — geworfen,
   nicht stillschweigend verschluckt; UI zeigt sie als Fehlermeldung.
4. `mapToLvDraft()`: geparste GAEB-Struktur → `LVDraft` (kein GAEB-Vokabular mehr
   danach).
5. `frontend/tests/fixtures/` mit den bestehenden echten GAEB-XML-Dateien (aus
   `tests/fixtures/` im Repo-Root übernehmen) — Parser-Tests laufen dagegen.

**Fertig, wenn:**
- Alle Fixtures unter `frontend/tests/fixtures/` parsen fehlerfrei zu `LVDraft`.
- Eine Datei mit nicht unterstützter Version wirft `GAEBVersionError`.
- `grep -R "GaebParser\|LVDraft" src/lib/classify src/lib/tree` liefert nichts — der
  Parser bleibt die einzige Stelle mit GAEB-Kenntnis.

---

## WP-C · Klassifizierung (TS)  · `feat(classify)`

**Ziel:** Merkmale aus Kurz-/Langtext **mehrstufig** erzeugen und in `attributes`
ablegen — hinter einem stabilen TS-Interface, analog zum bisherigen
`ClassifierProtocol`. Design: [`architecture/pipeline.md`](architecture/pipeline.md#klassifizierung).

Schritte:
1. `src/lib/classify/types.ts`: `Classifier`-Interface, `ClassifierInput`,
   `ClassificationResult` (`attributes` + `meta`).
2. **Stufe 0 (StlbMatch):** Kurz-/Langtext gegen die Referenztabelle
   [`domain/reference/stlb-bau-leistungsbereiche.csv`](domain/reference/stlb-bau-leistungsbereiche.csv)
   matchen (als statisches Asset geladen, z. B. via `fetch('/stlb-bau.csv')` oder
   Build-Time-Import) → `attributes.gewerk_lb`, `attributes.gewerk`, ggf.
   `attributes.positionsart`. Kein Treffer → Fallback auf Stichwort-/Einheiten-
   Heuristik, kein Fehler.
3. **Stufe 1 (nur `positionsart="bauteil"`):** Bauteiltyp-Erkennung.
4. **Ruleset-Registry** (`src/lib/classify/rulesets/`): ein Modul je (Bauteiltyp,
   `gewerk_lb`), `resolve()` fällt auf `FallbackRuleset` zurück statt zu werfen.
5. `getClassifier()`-Factory; Aufrufer importieren nur das Interface, nie eine
   konkrete Implementierung.
6. Läuft synchron direkt nach dem Parsen, vor `buildTree()`; bei großen LVs im
   Web Worker (siehe WP-E).
7. Unit-Tests: je Stufe, STLB-Match-Treffer **und** Kein-Treffer-Fallback, je
   registriertem Ruleset, Ruleset-Fallback-Pfad, Nicht-Bauteil-Pfad.

**Fertig, wenn:**
- Eine Wand-Position mit Beton-/Stahlbetonarbeiten-LB im Referenzkatalog →
  `positionsart:"bauteil"`, `gewerk_lb`, `gewerk`, `bauteiltyp:"Wand"`, `beton`,
  `expo`, `tragend`, `_meta.classifier="rule"`.
- Solange die Referenz-CSV leer ist: alle Positionen laufen über den
  Heuristik-Fallback, kein Fehler.
- `npm test` grün.

---

## WP-D · In-Memory-Baum  · `feat(tree)`

**Ziel:** `buildTree(draft): LVNode` — reine Funktion, ersetzt den früher geplanten
`/tree`-Endpunkt. Ein Contract, zwei Konsumenten (Tree-Spalte, Bubble-Graph).

Schritte:
1. `src/types/lvNode.ts`: `LVNode` (`id`, `kind`, `code`, `label`, `position_count`,
   `total_price`, `children`, optional `position`).
2. `src/lib/tree/buildTree.ts`: `LVDraft` (nach Klassifizierung) → `LVNode`-Baum,
   Aggregate (`position_count`, `total_price`) bottom-up berechnet.
3. `src/state/viewer.ts` (Context/Reducer): hält den aktuellen `LVNode`-Baum,
   Auswahl, Zoom, aktive Filter — reiner UI-/Session-State, kein `localStorage`.

**Was der Parser aus WP-B liefert** (Annahmen für `buildTree`, verifiziert gegen die
Fixtures in `frontend/tests/fixtures/`):
- `SectionDraft.number` und `PositionDraft.oz` sind bereits **vollständige Pfade**
  (`"001.002"`, `"001.002.0050"`), keine lokalen Teilnummern. Indexpositionen tragen
  den Index als letztes Segment (`"001.001.0010.A"`), damit die OZ eindeutig bleibt —
  `oz` ist deshalb als Knoten-ID brauchbar, muss aber nach `kind` präfixiert werden
  (`section:001.002` vs. `position:001.002.0050`), weil ein namenloser Wrapper-
  Abschnitt dieselbe Nummer tragen kann wie sein Los.
- `LotDraft.number` ist **leer**, wenn die Datei keine Los-Ebene hat (häufigster Fall,
  z. B. die BVBS-Musterdatei). Dann trägt das Los nur ein Label → `LVNode.code` darf
  leer sein, die Tree-Spalte muss auf das Label ausweichen.
- Positionen ohne eigenen LV-Bereich hängen in einem Wrapper-Abschnitt mit
  `label: null` — der Baum bekommt also nie Positionen direkt unter einem Los.
- `unitPrice` ist in x83-Dateien (Angebotsaufforderung) meist `null`; Preise stehen
  erst in x84. `totalPrice` = Σ `quantity × unitPrice` mit `null` als 0 ⇒ der
  Größenmodus „Gesamtpreis" kann für ein ganzes LV 0 sein. Der Graph (WP-F) braucht
  dafür einen Fallback auf „Anzahl" statt Bubbles mit Radius 0.

**Fertig, wenn:**
- Eine geparste + klassifizierte Fixture ergibt einen `LVNode`-Baum mit korrekten
  Aggregatwerten (Stichprobe manuell verifiziert).
- Ein LV ohne Los-Ebene und ein LV mit Los-Ebene (`sample.X83`) ergeben beide einen
  vollständigen Baum ohne verlorene Positionen.

---

## WP-E · Viewer: Tree + Tabelle + Suche + Filter  · `feat(viewer)`

**Ziel:** Tree, Tabelle, Suche, Facetten-Filter rendern eine geladene LV (noch ohne
Graph).

Schritte:
1. Port aus `design/claude-design/lv-main.jsx`: `Tree`, `PositionsTable`, `TopBar`,
   `FilterStrip`, `FacetButton`/`RangeButton`, `Highlighted`, `Status`.
2. `src/lib/matchPos.ts` — Filter-/Suchlogik 1:1 aus dem Design (single source of
   truth), arbeitet auf dem `LVNode`-Baum aus WP-D.
3. Datei-Upload-Komponente (Drag & Drop + Datei-Dialog) → `file.arrayBuffer()` →
   `getGaebParser().parse()` → `mapToLvDraft()` → `classify` → `buildTree` → State.
   Große Dateien: Pipeline in einem Web Worker, damit die UI responsiv bleibt.
4. Fehleranzeige für `GAEBParseError`/`GAEBValidationError`/`GAEBVersionError`.

**Anbindung an den Parser aus WP-B:**
- **Bytes, nicht Text:** `file.arrayBuffer()` verwenden, **nicht** `FileReader.readAsText`.
  Der Parser liest das Encoding aus der XML-Deklaration (GAEB-Exporte sind oft
  ISO-8859-1); vorab als UTF-8 dekodierter Text zerstört Umlaute in Positionstexten.
- Import ausschließlich aus `src/lib/gaeb` (Barrel), nie aus `parser.ts` — die drei
  Exception-Klassen kommen aus derselben Quelle und sind per `instanceof` prüfbar.
- **Korrektur zur ursprünglichen Annahme:** `DOMParser` ist laut HTML-Spezifikation
  nur im Window-Scope definiert und in keinem Browser im Worker verfügbar. Der
  Parser-Schritt bleibt deshalb im Haupt-Thread (nativer XML-Parser, entsprechend
  schnell); in den Worker wandert der rechenintensive Teil — Klassifizierung +
  `buildTree` — über das `structuredClone`-fähige `LVDraft`. Details:
  [`architecture/pipeline.md`](architecture/pipeline.md#wo-der-worker-ansetzt-und-warum-nicht-früher).
- Facette „Positionsart": `positionType` ist `NORMAL | ALTERNATIV | BEDARF |
  ZULAGENPOSITION`; alle vier kommen in `gaeb-xml-beispiel.x83` vor und eignen sich als
  Testfall für den Filter.
- Suche über `longText` trifft auch Unterbeschreibungen (`<SubDescr>`), die der Parser
  an den Langtext der Position anhängt. `shortText` ist nie leer, solange ein Langtext
  existiert (Fallback auf dessen erste Zeile).

**Fertig, wenn:**
- App lädt eine echte GAEB-Datei per Drag & Drop und zeigt Tree + Tabelle.
- Suche und alle Facetten-Filter (inkl. Hervorheben/Ausblenden) funktionieren.
- `grep -R "window.LV\|localStorage" frontend/src` liefert nichts für Fachdaten.
- Eine defekte/nicht unterstützte Datei zeigt eine verständliche Fehlermeldung
  (`unsupported-version.x83` aus den Fixtures als Handprobe).

---

## WP-F · Bubble-Graph  · `feat(graph)`

**Ziel:** Die Graph-Engine aus `lv-graph.jsx` als Mitte-Modus, gespeist aus demselben
`LVNode`-Baum. Vergabepaket-Kanten entfallen (out of scope).

Schritte:
1. Engine nach `src/lib/graph/` (Baumaufbau, `layoutRadial`, Walk) und Komponenten
   nach `src/components/graph/`.
2. An `LVNode` aus WP-D binden (kein Fixture, kein Demo-Lot im Default-Pfad).
3. Größenmodi (Anzahl / Gesamtpreis / Einheitlich), Zoom + LOD, Culling, Cluster
   übernehmen.
4. Drill-in: Klick auf Abschnittsknoten → Tabelle des Abschnitts; Umschalter
   Graph ⇄ Tabelle.
5. `nodeVpIds`/Vergabepaket-Overlays entfernen.

**Fertig, wenn:**
- Graph rendert eine geladene LV; Zoom/LOD/Culling funktionieren.
- Größenmodi schalten korrekt um; Klick drillt in Abschnitt → Tabelle.
- Eine ~10k-Positionen-Fixture (oder synthetisch generiert) bleibt bei Zoom/Pan
  flüssig (Culling greift).

---

## WP-G · Eigenschaften-Panel + Static-Deploy-Vorbereitung  · `feat(frontend)`

**Ziel:** Eigenschaften-Panel rechts, letzter Schliff, Build ist deploy-fertig für
einen beliebigen statischen Host (Netlify/Vercel/Cloudflare Pages/GitHub Pages).

Schritte:
1. Eigenschaften-Panel rechts: Langtext mit `Highlighted`, Attribute, Einheit/
   Menge/EP.
2. `npm run build` erzeugt ein reines Static-Bundle, keine Server-abhängigen Pfade
   (keine `/api`-Referenzen, kein Proxy nötig).
3. Prüfen: kein Request, der Fachdaten irgendwohin schickt (Browser-Devtools-
   Netzwerk-Tab manuell verifizieren). Erwartet werden das eigene Bundle und die
   Webfonts von Google Fonts — sonst nichts.

**Fertig, wenn:**
- Panel zeigt klassifizierte Merkmale der gewählten Position.
- Das gebaute Bundle läuft von einem beliebigen statischen Host aus, ohne Backend.

---

## Abhängigkeiten (MVP)

```
WP-A ─► WP-B ─► WP-C ─► WP-D ─► WP-E ─► WP-F ─► WP-G
```
