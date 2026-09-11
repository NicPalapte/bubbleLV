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
| WP-I | Performance-Fundament für 10k Positionen | offen |
| WP-J | Klassifizierung v2: generische Extraktoren + Textstellen | offen |
| WP-K | Flags und VOB-Check, Ansicht „Prüfung" | offen |
| WP-L | Ansichts-Gerüst + Ansicht „Überblick" | offen |
| WP-M | Beziehungen: Ähnlichkeit, Unterschiede, Ausreißer | offen |
| WP-N | Ansicht „Vergleich" | offen |
| WP-O | Ansicht „Matrix" | offen |
| WP-P | Feinschliff: Kommandopalette, URL-Zustand, Export, Druck | offen |

Offen bleibt weiterhin die inhaltliche Pflege der `keywords`-Spalte in
[`domain/reference/stlb-bau-leistungsbereiche.csv`](domain/reference/stlb-bau-leistungsbereiche.csv)
sowie die neuen Referenzdateien aus [`domain/vob-pruefungen.md`](domain/vob-pruefungen.md).
Ohne sie greifen die jeweiligen Regeln nicht — das ist kein Fehler.

---

# Release 2 · „LV verstehen"

## Reihenfolge

```
WP-H ──► WP-I ──┬──► WP-J ──► WP-K ──────────────┐
                │                                 ├──► WP-P
                └──► WP-L ──► WP-M ──► WP-N ──► WP-O
```

- **WP-H und WP-I zuerst.** Ohne tragfähigen Graphen und ohne Performance-Fundament
  bringt jede neue Ansicht nur mehr Ruckeln.
- WP-J ist die Datengrundlage für WP-K, WP-M, WP-N und WP-O. Ohne die neuen Merkmale
  haben Prüfung, Ähnlichkeit, Vergleich und Matrix nichts zu zeigen.
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

**Ziel:** 10.000 Positionen ohne Ruckeln. Heute traversiert jede Ansicht den
`LVNode`-Baum bei jedem Render — das trägt nicht.

Schritte:
1. `src/lib/index/positionIndex.ts`: flacher Index über alle Positionen, einmal nach
   `buildTree` erzeugt. Je Position ein Eintrag mit OZ, Verweis auf den Baumknoten,
   Menge, Einheit, EP, GP und den klassifizierten Merkmalen. Numerische Spalten als
   typisierte Arrays, damit Filter und Summen ohne Objekt-Traversierung laufen.
2. Aggregate (Summe, Anzahl, Min/Max je Facette) im Worker berechnen und als
   fertiges Ergebnis in den State geben, nicht im Render.
3. `matchPos` arbeitet gegen den Index statt gegen den Baum; die Filterlogik selbst
   bleibt unverändert die einzige Quelle.
4. Tabelle virtualisieren (nur sichtbare Zeilen im DOM).
5. Messpunkte einbauen: Ladezeit, Filterzeit, Renderzeit — in der Konsole, nicht im UI.
6. Test-Fixture mit 10.000 synthetischen Positionen erzeugen (Generator im Testcode,
   keine große Datei im Repo).

**Fertig, wenn:**
- 10k Positionen: erste Ansicht < 5 s, Filterwechsel < 100 ms, Ansichtswechsel < 200 ms.
- Die Tabelle mit 10k Zeilen scrollt flüssig.
- `npm test` enthält einen Performance-Test, der die Filterzeit misst und bei
  Überschreitung fehlschlägt.

---

## WP-J · Klassifizierung v2 · `feat(classify)`

**Ziel:** Merkmale, die in **jedem** Gewerk greifen, plus die Textstellen dazu.

Schritte:
1. `ClassificationResult` um `spans` erweitern: je Merkmal Anfang und Ende im Langtext
   (`{ key, start, end, label }`). Schema-Erweiterung in
   [`architecture/data-model.md`](architecture/data-model.md) nachziehen.
2. Gewerkeunabhängige Extraktoren in `src/lib/classify/extractors/`:
   - `normen.ts` — DIN, DIN EN, ISO, ZTV, ATV-Verweise
   - `masse.ts` — Zahl + Einheit mit Kontext (Dicke, Höhe, Länge, Gewicht)
   - `material.ts` — Materialstichworte, gespeist aus dem STLB-Katalog
   - `platzhalter.ts` — offene Textergänzungen aus dem Parser
   - `verweise.ts` — „siehe Pos.", „gemäß …", „laut Anlage"
   - `fristen.ts` — Datum, Bauzeit, Winterbau, Vorleistung, Arbeiten unter Verkehr
3. Die Extraktoren laufen **vor** den gewerkespezifischen Rulesets und werden von
   ihnen nur überschrieben, nie gelöscht.
4. `Highlighted.tsx` kann Spans aus mehreren Kategorien gleichzeitig zeichnen, je
   Kategorie eine Farbe, einzeln abschaltbar.
5. Unit-Tests je Extraktor, inklusive Negativfall (kein Treffer → kein Key).

**Fertig, wenn:**
- Eine Position mit „C30/37 nach DIN EN 206, d = 30 cm" liefert `normen`, `masse`,
  `beton` — jeweils mit korrekter Textstelle.
- Im Eigenschaften-Panel sind die Fundstellen im Langtext farbig markiert.
- Eine Position ohne erkennbare Merkmale liefert keine leeren Keys.

---

## WP-K · Flags und VOB-Check · `feat(check)`

**Ziel:** Die vier „wichtig"-Kategorien und der VOB-Check als auswertbare Hinweise.

Schritte:
1. `src/lib/check/types.ts`: `Flag { id, category, severity, ruleRef, positionId, span }`.
   Kategorien: `geld | risiko | norm | frist | vob`.
2. Regel-Registry `src/lib/check/rules/` — ein Modul je Regel, Registrierung wie bei den
   Rulesets. Jede Regel liefert Titel, Norm-Verweis und Fundstelle.
3. Regeln V1, V2, V4, V5, V6, V7 aus [`domain/vob-pruefungen.md`](domain/vob-pruefungen.md)
   umsetzen. V3, V8, V9, V10 bleiben inaktiv, bis die Referenzdateien da sind.
4. Geld-/Mengentreiber: Anteil an der Gesamtsumme, Mengen-Rang, EP-Ausreißer (Letzteres
   erst nach WP-M, vorher ohne Vergleichsgruppe nicht berechenbar).
5. Ansicht **Prüfung**: Liste aller Hinweise, gruppiert nach Regel, mit Anzahl, Sprung
   zur Position und Schalter je Regel.
6. Formulierungen: Hinweis, kein Urteil. Norm-Verweis immer sichtbar.

**Fertig, wenn:**
- Eine reale Datei mit Bedarfspositionen und Platzhaltern erzeugt Hinweise mit
  korrekter Anzahl und korrektem Sprungziel.
- Jede Regel ist einzeln abschaltbar; abgeschaltet verschwindet sie aus allen Ansichten.
- Fehlende Referenzdatei ⇒ Regel inaktiv, kein Fehler, sichtbarer Hinweis „inaktiv".
- Je Regel mindestens ein Test mit Treffer und einer ohne.

---

## WP-L · Ansichts-Gerüst und Überblick · `feat(viewer)`

**Ziel:** Acht gleichrangige Ansichten auf einem Filterzustand — und die erste neue.

Schritte:
1. `src/state/viewer.ts` trennen: `filterState` (Suche, Facetten, Modus),
   `selectionState` (Auswahl, Mehrfachauswahl), `viewState` (aktive Ansicht, je Ansicht
   eigener Zustand wie Zoom oder Sortierung).
2. Ansichtsumschalter in der `TopBar`. Wechsel ändert **nie** Filter oder Auswahl.
3. Ansicht **Überblick** (`src/components/overview/`):
   - Kennzahlen: Positionen, Summe, Anzahl Gewerke, Anteil ohne Preis, Anzahl Hinweise
   - Treemap nach Gewerk und Abschnitt, Klick filtert
   - Pareto: welcher Anteil der Positionen trägt 80 % der Summe
   - Mengen je Einheit, absteigend
4. Ohne Preise in der Datei: Geld-Kacheln zeigen ausdrücklich „keine Preise in dieser
   Datei" statt Nullwerten, Mengen übernehmen die Hauptrolle.
5. Eine Gewerk-Farbskala in `src/lib/colors.ts`, gültig für **alle** Ansichten.

**Fertig, wenn:**
- Filter setzen, Ansicht wechseln, zurückwechseln: Filter, Auswahl und Scrollposition
  sind unverändert.
- Der Überblick einer realen Datei stimmt gegen die Tabellensummen (Stichprobe).
- Eine x83-Datei ohne Preise zeigt keine Null-Euro-Kacheln.

---

## WP-M · Beziehungen · `feat(relate)`

**Ziel:** Ähnliche Positionen finden, Unterschiede benennen, Ausreißer zeigen.

Schritte:
1. `src/lib/relate/similarity.ts`:
   - Text normalisieren (Kleinschreibung, Zahlen und Einheiten maskieren, Stoppwörter).
   - Kandidaten vorgruppieren nach Gewerk, Einheit und Bauteiltyp — nur innerhalb einer
     Gruppe wird verglichen. Alle Paare zu vergleichen ist bei 10k Positionen
     (~50 Mio. Paare) nicht bezahlbar.
   - Innerhalb der Gruppe Ähnlichkeit über Wort-Schindeln und Jaccard-Maß; zusätzlich
     Merkmals-Übereinstimmung. Schwellwert einstellbar, Standard konservativ.
2. Ergebnis: `Cluster { id, positionIds, gemeinsameMerkmale, unterscheidendeMerkmale }`.
3. Läuft **einmal beim Laden im Worker**, Ergebnis liegt im State.
4. Ausreißer je Cluster: Einheitspreis oder Menge außerhalb des Erwartungsbereichs
   (Median und Quartilsabstand, nicht Mittelwert — einzelne Extremwerte verzerren sonst).
5. Ansicht **Ähnlichkeit**: Cluster als Liste, Größe und Streuung sichtbar, Klick öffnet
   den Vergleich (WP-N). Filter „nur Positionen in Clustern ab n Mitgliedern".
6. Tests: bekannte Dublette wird gefunden, bewusst unterschiedliche Positionen landen
   nicht im selben Cluster, 10k Positionen clustern in < 3 s.

**Fertig, wenn:**
- Eine reale Datei mit wiederkehrenden Leistungen zeigt diese als Cluster.
- Ein Cluster benennt, welche Merkmale gemeinsam und welche unterschiedlich sind.
- Die Laufzeit bleibt im Worker und blockiert die UI nicht.

---

## WP-N · Vergleich · `feat(viewer)`

**Ziel:** 2–5 Positionen nebeneinander, Unterschiede sichtbar.

Schritte:
1. Mehrfachauswahl: Strg-Klick in Tabelle, Baum, Graph und Cluster-Liste.
2. Ansicht **Vergleich**: Spalte je Position, Zeile je Merkmal. Abweichende Werte
   farbig, gleiche Werte gedämpft.
3. Langtext-Diff wortweise (eigene, kleine Implementierung oder Bibliothek — Auswahl in
   einer Entscheidung festhalten, falls eine Abhängigkeit dazukommt).
4. Sprung von jeder Spalte zurück in die Tabelle oder den Graphen.

**Fertig, wenn:**
- Zwei fast gleiche Positionen zeigen genau die abweichenden Zeilen.
- Fünf Positionen passen lesbar nebeneinander; ab sechs wird die Auswahl begrenzt.

---

## WP-O · Matrix · `feat(viewer)`

**Ziel:** Heatmap über zwei Merkmale, Lücken und Häufungen auf einen Blick.

Schritte:
1. Zwei Achsen frei wählbar aus allen Facetten (Standard: Gewerk × Bauteiltyp).
2. Zellwert umschaltbar: Anzahl, Menge, Summe.
3. Klick auf eine Zelle setzt den passenden Filter und wechselt in die Tabelle.
4. Leere Zellen bleiben sichtbar leer — die Lücke ist die Information.

**Fertig, wenn:**
- Achsen und Zellwert lassen sich umschalten, ohne den Filter zu verlieren.
- Klick auf eine Zelle führt zur passenden gefilterten Menge.

---

## WP-P · Feinschliff · `feat(frontend)`

**Ziel:** Das Werkzeug wird schnell bedienbar und teilbar.

Schritte:
1. **Kommandopalette** (Strg/Cmd + K): zu OZ springen, Filter setzen, Ansicht wechseln.
2. **Zustand im URL-Fragment** (`#...`): aktive Ansicht, Filter, Auswahl. Ein Fragment
   wird von Browsern **nie** an einen Server gesendet — die Regel „keine Fachdaten nach
   draußen" bleibt gewahrt. Kurz in der Entscheidung festhalten.
3. **Lokaler Export**: gefilterte Positionsliste und Prüf-Hinweise als CSV oder
   Markdown, erzeugt als Blob im Browser.
4. **Druckansicht** über Print-CSS für die gefilterte Menge.
5. Tastaturbedienung in allen Ansichten (Auswahl mit Pfeiltasten, Enter öffnet).

**Fertig, wenn:**
- Ein geteilter Link stellt Ansicht und Filter wieder her, sobald dieselbe Datei geladen
  ist — ohne Fachdaten im Link außer der OZ der Auswahl.
- Der Export enthält genau die gefilterte Menge.
- Im Netzwerk-Tab ist bei Export und Druck kein Request zu sehen.

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
