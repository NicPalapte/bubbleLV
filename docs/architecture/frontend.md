# Architektur — Frontend

> Vite · React · TypeScript · Tailwind. Lebt in `frontend/`. **Rein client-seitig,
> kein Server** — die App lädt sich einmal statisch, danach passiert alles im
> Browser. Referenz-Design (nicht ausgeliefert): `design/`.

## Herkunft & Portierung

Das Design liegt als Single-File-React mit Browser-globalem `React`, Fixture-Daten
(`window.LV`) und `localStorage` vor. Portiert wird zu einer echten, modularen
TS-App. Beim Port gilt:

- **Keine Fixture-Daten** — alles kommt aus der lokalen Pipeline (Datei → Parser →
  Klassifizierung → Baum, siehe [`pipeline.md`](pipeline.md)).
- **Kein `localStorage` für Fachdaten** — es gibt keine Persistenz über die Session
  hinaus, auch nicht clientseitig. Reiner UI-Zustand (Auswahl, Zoom, aktive Filter)
  darf in React-State/Context leben, muss aber einen Reload nicht überleben.
- `matchPos` bleibt die **einzige** Quelle für Filter-/Suchlogik.

## Ordnerstruktur

```
frontend/
├── index.html
├── vite.config.ts
├── package.json
├── tailwind.config.js
├── tests/
│   └── fixtures/                     # echte GAEB DA XML-Testdateien
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── pages/ViewerPage.tsx          # 3-Spalten-Layout
    ├── types/
    │   ├── lvDraft.ts                # LVDraft, LotDraft, SectionDraft, PositionDraft
    │   └── lvNode.ts                 # LVNode, PositionSummary, PositionDetail, Facets
    ├── lib/
    │   ├── gaeb/                     # GaebParser — einzige Stelle mit GAEB-Kenntnis
    │   ├── classify/                 # Klassifizierung (Regel-Pipeline, siehe pipeline.md)
    │   │   ├── ruleBased.ts          # Orchestrierung der Stufen hinter Classifier
    │   │   ├── stlbCatalog.ts        # Stufe 0: STLB-Bau-LB-Katalog (Build-Zeit-Asset)
    │   │   ├── data/                 # ausgelieferte Kopie der Referenz-CSV
    │   │   ├── extractors/           # gewerkeunabhängige Merkmale + Fundstellen (WP-J)
    │   │   └── rulesets/             # Registry + je Ruleset ein Modul
    │   ├── tree/
    │   │   ├── buildTree.ts          # LVDraft → LVNode-Baum
    │   │   └── matchCounts.ts        # Trefferzahlen je Knoten (Tree + Graph)
    │   ├── index/
    │   │   ├── positionIndex.ts      # flacher Positions-Index (Rechenbasis, WP-I)
    │   │   └── summary.ts            # Facetten-Zähler + Wertebereiche, einmal berechnet
    │   ├── overview/                 # Kennzahlen, Treemap-Layout (WP-L)
    │   │   ├── model.ts              # buildOverview: Kennzahlen, Gruppen, Pareto, Mengen
    │   │   └── treemap.ts            # squarified Treemap, reine Funktion
    │   ├── export/                   # CSV, Markdown, Download, Melde-Link (WP-P)
    │   │   ├── positions.ts          # positionsCsv: gefilterte Menge, alle Spalten
    │   │   ├── checkReport.ts        # checkMarkdown: Hinweise im aktuellen Filter
    │   │   ├── download.ts           # Blob → <a download>, kein Request
    │   │   └── issueLink.ts          # vorbefülltes GitHub-Formular, ohne Fachdaten
    │   ├── share/                    # Zustand im URL-Fragment (WP-P)
    │   │   └── urlState.ts           # encode/decode, prüft jeden fremden Link
    │   ├── matrix/                   # Heatmap über zwei Facetten (WP-O)
    │   │   └── model.ts              # buildMatrix: Achsen, Zellen, Zellmaß
    │   ├── relate/                   # Beziehungen: Ähnlichkeit, Ausreißer (WP-M)
    │   │   ├── text.ts               # Normalisierung, Wort-Schindeln, Jaccard
    │   │   ├── stats.ts              # Median, Quartile, Ausreißer-Grenzen
    │   │   ├── similarity.ts         # Vorgruppierung, Cluster-Bildung (im Worker)
    │   │   └── types.ts              # Cluster, Outlier, RelationResult
    │   ├── check/                    # Prüfregeln + Hinweise (WP-K)
    │   │   ├── rules/                # ein Modul je Regelgruppe
    │   │   ├── referenz.ts           # Regel-Status und Listen aus den CSV
    │   │   └── data/                 # ausgelieferte Kopien der Referenz-CSV
    │   ├── pipeline/                 # Datei → LoadedLV, inkl. Web Worker
    │   ├── matchPos.ts               # Filter/Suche — single source of truth
    │   ├── csv.ts                    # gemeinsamer Leser der Referenzdateien
    │   ├── units.ts                  # Einheiten zusammenführen (Filter, nicht Anzeige)
    │   ├── perf.ts                   # Messpunkte (nur Konsole, nur Entwicklung)
    │   ├── spanCategories.ts         # Farbe und Name je Fundstellen-Kategorie
    │   ├── facets.ts                 # Facetten-Definitionen (dynamische Werte)
    │   ├── colors.ts                 # Gewerk-Farbskala für alle Ansichten (WP-L)
    │   └── graph/                    # Graph-Engine (aus lv-graph.jsx)
    │       ├── constants.ts          # Radien, LOD-Schwellen, Größenmodi
    │       ├── layoutRadial.ts       # Ballon-Layout (Kreis je Elternknoten) + Cluster
    │       └── culling.ts            # Viewport-Culling
    ├── state/                        # drei getrennte Bereiche, eine Klammer (WP-L)
    │   ├── filterState.ts            # Suche, Facetten, Nicht-Treffer, stumme Regeln
    │   ├── selectionState.ts         # Auswahl + Aufklapp-Zustand (Tree und Graph)
    │   ├── viewState.ts              # aktive Ansicht + Zustand je Ansicht
    │   ├── viewer.ts                 # Klammer: State, Reducer, Context, Hooks
    │   └── ViewerProvider.tsx        # Provider + abgeleitete Sichten (Trefferindex)
    └── components/
        ├── layout/{Tree,TopBar,PropertiesPanel,ResizeHandle}.tsx
        ├── upload/FileDropzone.tsx   # Drag&Drop/Datei-Dialog → Pipeline
        ├── graph/{BubbleGraph,BubbleNode,GraphControls,GraphHeader}.tsx
        ├── check/CheckView.tsx           # Ansicht „Prüfung" (WP-K)
        ├── relate/                       # Ansicht „Ähnlichkeit" (WP-M)
        │   └── {SimilarView,ClusterCard}.tsx
        ├── overview/                     # Ansicht „Überblick" (WP-L)
        │   └── {OverviewView,MetricTiles,Treemap,ParetoCard,UnitTotals}.tsx
        ├── matrix/                       # Ansicht „Matrix" (WP-O)
        │   └── {MatrixView,AxisPicker}.tsx
        ├── print/PrintView.tsx           # Druckansicht, unvirtualisiert (WP-P)
        ├── table/PositionsTable.tsx
        ├── filter/{FilterStrip,FacetButton,RangeButton}.tsx
        ├── common/{Highlighted.tsx,useOutsideClose.ts}
        └── ui/                           # Design-System-Bausteine (s. u.)
```

## Design-System

Die Bausteine unter `components/ui/` sind 1:1-Ports der Referenz-Komponenten aus
`.claude/skills/bubble-design/components/core/` (JSX → TSX): `BubbleLogo`, `Chip`,
`StatusPill`, `PropField`/`PropGrid`, `PanelHeader`/`BlockLabel`,
`Popover`/`PopoverHead`/`PopoverRow`, `SegmentedControl`, `EmptyState`, `DataTable`,
`TreeRow`. Sie arbeiten wie im Skill mit Inline-Styles auf CSS-Variablen — Tailwind
bleibt für das Seiten-Layout zuständig.

Die `.tsx` hier sind die gültige Fassung, die `.jsx` im Skill bleiben Prototyp-Vorlagen;
Regeln dazu in `.claude/skills/bubble-design/components/USAGE.md` (§ Source of truth),
Begründung in [`0004`](../decisions/0004-design-kit-und-frontend.md).

**Nicht portiert:** `MemberAvatar` und `PackageTag` (Zuständigkeit und Vergabepakete
sind out of scope) sowie `Checkbox` (die Facetten-Zeile bringt ihre eigene mit).

**Zwei bewusste Abweichungen vom Skill-Markup:** `DataTable` und `TreeRow` tragen
ARIA-Rollen (`table`/`row`/`columnheader`/`cell` bzw. `treeitem`), weil beide aus
Flex-Divs gebaut sind; und `TreeRow` bekommt ein separates `onToggle`, damit ein Klick
auf die Zeile den Knoten auswählt und nur das Dreieck auf-/zuklappt. Der
Zeilenklick klappt zusätzlich **auf** (nie zu) — sonst verschwände beim Anklicken
genau das, was man sehen will.

**Design-Tokens** (Farben, Typografie, Maße, Elevation) stehen vollständig als
CSS-Variablen in `src/index.css`, übernommen aus `bubble-design/tokens/`; die Farben
und Schriftfamilien sind zusätzlich in `tailwind.config.js` als Theme-Erweiterung
verfügbar. Die Markenschriften IBM Plex Mono und Space Grotesk kommen über Google
Fonts (`index.html`) — die Einbindung liegt an genau einer Stelle, damit ein Wechsel
auf selbst gehostete Schriften (`@fontsource/*`) lokal bleibt.

## Datenfluss

```
FileDropzone
  └─ Datei → GaebParser → classify() → buildTree() → LVNode-Baum in state/viewer.ts
       ├─ Tree            (linke Spalte, konsumiert LVNode)
       ├─ BubbleGraph     (Mitte, konsumiert denselben LVNode-Baum)
       ├─ PositionsTable  (Mitte, alternativer Modus)
       └─ PropertiesPanel (rechts, zeigt Details des gewählten LVNode)
matchPos(position, filters, search)  ← überall identisch für Sichtbarkeit/Dimmen
```

Tree und Graph teilen sich **denselben** `LVNode`-Baum, der lokal aus der geladenen
Datei aufgebaut wird — kein Fetch, kein Server, ein Contract für beide Ansichten.

### Baum ist die Struktur, Index ist die Rechenbasis (WP-I)

Neben dem Baum steht ein **flacher Positions-Index** (`lib/index/positionIndex.ts`).
Er entsteht einmal je geladenem LV und hält je Position den Verweis auf den
Baumknoten, die fertigen Facettenwerte, den fertigen (kleingeschriebenen) Suchtext
sowie Menge, EP und GP als `Float64Array`. Filter, Summen und ab WP-M die
Beziehungen rechnen gegen ihn, nie gegen den Baum.

- Die Filterentscheidung bleibt **eine** Funktion: `matchFacts` in `lib/matchPos.ts`.
  Neu ist nur, dass die Ableitung je Position vorher passiert statt bei jeder Prüfung.
  `matchPos(position, filters, search)` bleibt die Hülle für Aufrufer ohne Index.
- Der Index wird im **Haupt-Thread** gebaut, nicht im Worker: er zeigt auf die
  Baumknoten, und Objektidentität überlebt den `structuredClone` der Worker-Grenze
  nicht.
- Die **Aggregate** (`lib/index/summary.ts`: Facetten-Zähler, Wertebereiche,
  Gesamtsumme) entstehen dagegen in `classifyAndBuild` — also im Worker, sobald
  dessen Schwelle greift — und liegen fertig im `LoadedLV`. Sie sind reine Zahlen
  und Namen und überstehen den Transport unbeschadet.
- Begründung und verworfene Wege:
  [`decisions/0010`](../decisions/0010-positions-index-und-aggregate.md).

### Ein Zustand für beide Ansichten

Baum und Graph zeigen dieselbe Struktur und laufen deshalb nie auseinander
(Issue #18). Alles, was beide betrifft, steht **einmal** im Viewer-State bzw. im
Provider:

| Was | Wo | Bemerkung |
|---|---|---|
| Aufklapp-Zustand | `state.selection.expanded` (`ReadonlySet<string>`) | offene Knoten; ein Klick im Baum wirkt im Graphen und umgekehrt |
| aufgelöste Cluster | `state.selection.openClusters` | reine Graph-Darstellung, gleiche Lebensdauer |
| Positions-Index | `derived.index` (`PositionIndex`) | flache Rechenbasis, einmal je geladenem LV |
| Trefferzahlen | `derived.matches` (`MatchIndex`) | einmal je Filter-/Suchwechsel, für Baum, Graph und Tabelle |
| tatsächlich offene Knoten | `derived.openNodes` | `expanded` **plus** die Pfade zu den Treffern, die Suche/Filter automatisch öffnen |

`openNodes` ist abgeleitet statt gespeichert: fällt der Filter weg, steht wieder
genau der Aufklapp-Zustand da, den der Nutzer selbst gesetzt hat. Nach dem Import
sind Projekt und Lose offen (`expandedToDepth(tree, 2)`), `Alles einklappen` fällt
auf die Lose zurück — die Wurzel bleibt offen, sonst wäre der Baum leer.

### Drei getrennte Bereiche, eine Klammer (WP-L)

`ViewerState` besteht aus `lv` plus drei Bereichen mit je eigenem Modul und
eigenem Reducer. Die Trennung ist keine Ordnungsfrage: sie macht es unmöglich,
dass ein Ansichtswechsel Filter oder Auswahl anfasst.

| Bereich | Datei | Inhalt |
|---|---|---|
| `filter` | `state/filterState.ts` | Suche, Facetten, Mengenbereich, Nicht-Treffer-Modus, stummgeschaltete Prüfregeln |
| `selection` | `state/selectionState.ts` | angewählter Knoten/Position, Mauszeiger, Aufklapp-Zustand, offene Sammel-Bubbles |
| `view` | `state/viewState.ts` | aktive Ansicht plus Zustand **je** Ansicht: Graph-Ausschnitt und Größenmodus, Sortierung/Umfang/Spalten der Tabelle, offene Regeln der Prüfung, Scrollposition je Ansicht, Maße der Info-Panels |

`state/viewer.ts` klammert die drei und behandelt selbst nur, was mehr als einen
Bereich betrifft: `loaded`, `clear`, `openInTable` und `showGraph`. Ändert ein
Bereich sich nicht, gibt sein Reducer dieselbe Referenz zurück — dann bleibt auch
der Gesamtzustand identisch und kein Render läuft umsonst.

Der **Ansichtsumschalter** (`setViewMode`) fasst ausschließlich `view.mode` an.
Weil jede Ansicht ihren Zustand in `view` ablegt statt in lokalem `useState`,
steht sie nach dem Rückwechsel wieder so da, wie man sie verlassen hat — obwohl
die Komponente zwischendurch abgebaut war.

**Ausnahme Graph-Ausschnitt:** Pan/Zoom bleibt während der Bedienung lokal in
`BubbleGraph` — es ändert sich pro Frame und würde als Context-State die ganze
Seite neu rendern. Beim Abbau der Ansicht wandert der Ausschnitt **einmal** nach
`view.graph.viewport` und wird beim nächsten Öffnen als Startwert übernommen;
dann entfällt das automatische Einpassen. Ein neuer Import verwirft ihn.

**Scrollpositionen** laufen nach demselben Muster
(`components/common/useScrollMemory.ts`, in der Tabelle über die `DataTable`-Props
`initialScrollTop`/`onLeave`): laufend in einem Ref, einmal beim Abbau in den
Zustand.

### Ansicht „Überblick" (WP-L)

Die Eingangsansicht nach dem Import. Sie rechnet nichts im Render: `buildOverview`
(`lib/overview/model.ts`) läuft einmal je Filterwechsel über dem flachen
Positions-Index und liefert Kennzahlen, die Treemap-Gruppen (Gewerk → Abschnitt),
die Pareto-Kurve und die Mengen je Einheit. Das Kachel-Layout ist eine reine
Funktion (`lib/overview/treemap.ts`, squarified). Gefiltert wird über dieselbe
`ActiveFilters`-Aufbereitung wie überall (`derived.active`), gezählt wird also
dieselbe Menge, die Tabelle und Graph zeigen.

Führt die Datei **keine Preise** (x83), misst die Treemap die Anzahl statt der
Summe, die Geld-Kachel sagt das ausdrücklich, und die Pareto-Auswertung entfällt
mit Begründung — Nullwerte wären eine Aussage, die die Datei nicht macht.

### Ansicht „Ähnlichkeit" (WP-M)

Die Gruppen entstehen **nicht** hier, sondern einmal beim Laden im Worker
(`lib/relate/`) und liegen fertig als `lv.relations` im Zustand. Die Ansicht wählt
aus, sortiert und zeigt an — sie rechnet nichts nach.

Wie die Ansicht „Prüfung" arbeitet sie auf der gefilterten Menge: eine Gruppe zeigt
nur Mitglieder, die der aktive Filter durchlässt, und verschwindet, wenn zu wenige
übrig bleiben. Der Regler „ab n Mitgliedern" begrenzt die Liste und ist bewusst
**kein** globaler Filter: `matchPos` entscheidet je Position aus der Position selbst,
die Gruppen-Zugehörigkeit entsteht erst danach
([`../decisions/0016`](../decisions/0016-aehnlichkeit-und-cluster.md)).

Ein Klick auf eine Position wählt sie an und wechselt in die Tabelle, wo sie
vollständig zu sehen ist. „Vergleichen" an einer Gruppe legt ihre Mitglieder
nebeneinander (WP-N) — ungekürzt: gekürzt wird erst in der Ansicht, damit der Rest
der Gruppe benannt statt weggeworfen wird.

### Ansicht „Vergleich" (WP-N)

Bis zu fünf gewählte Positionen nebeneinander, eine Spalte je Position, eine Zeile
je Merkmal. Die Merkmale kommen aus `merkmaleOf` (`lib/relate/similarity.ts`) —
derselben Funktion, nach der die Ähnlichkeit gruppiert. Unterschiede in Menge und
Preis entscheidet der **rohe** Wert, nicht die gerundete Anzeige; sehen zwei Werte
gerundet gleich aus, zeigt die Zeile mehr Nachkommastellen. Der Langtext wird
wortweise verglichen ([`../decisions/0020`](../decisions/0020-langtext-vergleich-ohne-bibliothek.md)).

Die Auswahl selbst ist **nicht** begrenzt: die Ansicht zeigt die ersten fünf und
sagt, wie viele warten.

### Geteilter Link (WP-P, Schritt 2)

Ansicht, Filter und die OZ der Auswahl stehen im **Fragment** der Adresse
(`components/common/useShareLink.ts`, `lib/share/urlState.ts`). Alles hinter `#`
sendet ein Browser nie an einen Server — auch nicht im Referrer. Geschrieben wird
entprellt per `replaceState`, gelesen einmal je geladener Datei, und beim Lesen
wird jeder Wert geprüft: ein Link aus einer älteren Fassung darf die App nicht in
einen Zustand bringen, den ihre Oberfläche nicht kennt
([`../decisions/0023`](../decisions/0023-zustand-im-url-fragment.md)).

### Mitnehmen: Export, Druck, Fehler melden (WP-P)

Drei Wege aus der App heraus, alle **ohne Request**: CSV und Markdown entstehen als
Blob im Browser (`lib/export/`), der Druck läuft über `window.print()`, und der
Melde-Knopf öffnet ein vorbefülltes GitHub-Formular ohne einen Inhalt aus der
geladenen Datei. Begründungen und verworfene Wege:
[`../decisions/0022`](../decisions/0022-export-und-druck-ohne-request.md).

Gedruckt wird eine **eigene, unvirtualisierte** Tabelle
(`components/print/PrintView.tsx`), gezeichnet erst bei `beforeprint`. Print-CSS über
die Positionstabelle hätte nur das gerade sichtbare Fenster aufs Papier gebracht —
und wäre vollständig ausgesehen.

### Ansicht „Matrix" (WP-O)

Zwei Facetten als Achsen, eine Zelle je Wertepaar. `buildMatrix`
(`lib/matrix/model.ts`) läuft einmal je Filterwechsel über dem flachen
Positions-Index; die Ansicht rechnet nichts selbst. Ein Klick auf eine Zelle setzt
**beide** Facetten auf den Wert der Zelle und wechselt in die Tabelle.

Die Zählregeln — mehrwertige Merkmale zählen in jeder Zelle mit, „Ohne Angabe"
bekommt eine eigene, nicht filterbare Zeile, 14 Werte je Achse stehen einzeln —
stehen in [`../decisions/0021`](../decisions/0021-matrix-zaehlregeln.md). Der
Zellwert „Menge" gilt weiter nur innerhalb einer Einheit
([`../decisions/0019`](../decisions/0019-mengen-nur-je-einheit.md)), „Summe" nur
mit Preisen in der Datei; sonst steht der Knopf gesperrt da und nennt den Grund.

Die `PositionsTable` zeigt wahlweise den gewählten Abschnitt oder das ganze LV
(Umschalter im Tabellenkopf). Bei aktivem Filter fällt sie automatisch auf das
ganze LV zurück, sobald der gewählte Abschnitt keinen Treffer hat — sonst stünde
man vor einer leeren Tabelle, während der Baum daneben Treffer zeigt. Umfassen
die Zeilen mehr als eine Überschrift, stehen sie unter deren Pfad gruppiert.

## Bubble-Graph (Kern des Produkts)

Portiert aus `lv-graph.jsx` — eine skalierbare Knowledge-Graph-Engine, keine simple
Kreisgrafik. Eigenschaften, die erhalten bleiben:

- **Rekursives Baummodell** beliebiger Tiefe (Projekt → Los → Abschnitt →
  ggf. Unterabschnitt/Gruppe → Position).
- **Ballon-Layout:** jeder Knoten legt seine Kinder als Kreis um sich selbst.
  Kreisradius und Winkelanteile folgen der Größe der Teilbäume, die Abstände
  skalieren damit mit dem LV statt aus einer festen Ring-Tabelle zu kommen.
  Kinder fächern nur in die Halbebene vom Elternknoten weg auf — dadurch bleibt
  jeder Teilbaum überschneidungsfrei.
- **Dichte-abhängiges Rendering** je Tier: Bubble / Punkt / Cluster.
  **Cluster-Bubble** ab > 24 Geschwistern (`CLUSTER_AT`); ein Klick darauf löst
  sie in Punkte auf.
- **Level-of-Detail:** Labels blenden bei sinkendem Zoom aus (Schwellen je `kind`).
- **Viewport-Culling** (günstiger Bounding-Box-Test) für große LVs (~10k Positionen).
- **Größenmodi:** `Anz. Positionen` · `Gesamtpreis €` · `Einheitlich`
  (`SIZE_MODES`). Größe kommt aus den `LVNode`-Aggregaten `position_count` /
  `total_price`. Der Radius wächst mit der Wurzel des Werts, damit die *Fläche*
  dem Wert folgt; verglichen wird je Ebene (`sizedRadius`). Haben alle Knoten
  einer Ebene denselben Wert, bleibt es beim Basisradius. Führt die Datei keine
  Einheitspreise, ist `Gesamtpreis €` **gesperrt** statt still auf `Anzahl`
  zurückzufallen — sonst sieht der Knopf gewählt aus und nichts ändert sich.
- **Drill-in:** Klick auf eine Sammel-Bubble klappt sie auf bzw. zu und wählt sie
  fürs Eigenschaften-Panel — die Mitte bleibt der Graph, und der Baum klappt
  mit. In die Tabelle führt das Tabellensymbol an der Bubble; bei Positionen
  öffnet der Klick direkt die Tabelle. Welche Ansicht vorn steht, ist eigener
  Zustand (`view.mode`) und wird nicht aus der Auswahl abgeleitet. Zurück in den Graphen führen der
  `Graph`-Knopf im Tabellenkopf und die Projektzeile im Baum — beide in einem
  Schritt, unabhängig davon, wie tief man steht.

**Beim Port entfernt** (out of scope): die Vergabepaket-Kanten / `nodeVpIds` /
`positionPakete`-Hover-Overlays und das `genDemoLot`-Demo-Lot (nur als optionales
Skalierungs-Testwerkzeug hinter einem Flag denkbar, nicht im Default-Pfad).

## Komponenten-Port-Map

| Ziel (TS) | Quelle (Design) | Zweck |
|---|---|---|
| `components/layout/Tree.tsx` | `Tree` in `lv-main.jsx` | linke Hierarchie, filter-/suchbewusst |
| `components/layout/TopBar.tsx` | `TopBar` | Suchleiste + Facetten-Buttons |
| `components/layout/PropertiesPanel.tsx` | rechte Spalte in `lv-main.jsx` | Positionsdetails |
| `components/upload/FileDropzone.tsx` | — (neu) | Datei laden → Pipeline anstoßen |
| `components/graph/*` | `lv-graph.jsx` (`Bubbles`, Layout) | Bubble-Graph |
| `components/table/PositionsTable.tsx` | `PositionsTable` | Positionsliste, sortierbar |
| `components/filter/*` | `FilterStrip`,`FacetButton`,`RangeButton` | Facetten + aktive-Filter-Chips |
| `components/common/Highlighted.tsx` | `Highlighted` | rendert `**…**` im Langtext |
| `components/common/Status.tsx` | `Status` | Status-Badge (nur Anzeige/Filter) |
| `lib/matchPos.ts` | `matchPos` | Filter/Suche |

**Nicht portiert:** `TasksBlock`, `lv-notes.jsx`, `lv-analytics.jsx`, `lv-vergabe.jsx`,
`wf-*.jsx`, `design-canvas.jsx` (Design-/Wireframe-Gerüst → nur Referenz in `design/`),
sowie `Member`/`AssigneePicker`/`useAssignees` — Zuständigkeit ist ohne Server/Persistenz
bewusst nicht Teil des MVP (siehe [`scope.md`](../scope.md#out-of-scope)).

## Dev-Betrieb

`npm run dev` im DevContainer, Node ist dort vorhanden. Kein Proxy nötig — es gibt
keine API. `npm run build` erzeugt ein Static-Bundle, das ohne Backend von einem
beliebigen statischen Host ausgeliefert werden kann (Ziel: frei im Internet
erreichbar, siehe [`scope.md`](../scope.md)).
