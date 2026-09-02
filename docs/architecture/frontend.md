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
    │   │   ├── ruleBased.ts          # Orchestrierung Stufe 0–2 hinter Classifier
    │   │   ├── stlbCatalog.ts        # Stufe 0: STLB-Bau-LB-Katalog (Build-Zeit-Asset)
    │   │   ├── data/                 # ausgelieferte Kopie der Referenz-CSV
    │   │   └── rulesets/             # Registry + je Ruleset ein Modul
    │   ├── tree/
    │   │   ├── buildTree.ts          # LVDraft → LVNode-Baum
    │   │   └── matchCounts.ts        # Trefferzahlen je Knoten (Tree + Graph)
    │   ├── pipeline/                 # Datei → LoadedLV, inkl. Web Worker
    │   ├── matchPos.ts               # Filter/Suche — single source of truth
    │   ├── facets.ts                 # Facetten-Definitionen (dynamische Werte)
    │   └── graph/                    # Graph-Engine (aus lv-graph.jsx)
    │       ├── constants.ts          # Radien, LOD-Schwellen, Größenmodi
    │       ├── layoutRadial.ts       # Ballon-Layout (Kreis je Elternknoten) + Cluster
    │       └── culling.ts            # Viewport-Culling
    ├── state/
    │   ├── viewer.ts                 # State, Reducer, Context, Hooks
    │   └── ViewerProvider.tsx        # Provider + abgeleitete Sichten
    └── components/
        ├── layout/{Tree,TopBar,PropertiesPanel,ResizeHandle}.tsx
        ├── upload/FileDropzone.tsx   # Drag&Drop/Datei-Dialog → Pipeline
        ├── graph/{BubbleGraph,BubbleNode,GraphControls,GraphHeader}.tsx
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

**Nicht portiert:** `MemberAvatar` und `PackageTag` (Zuständigkeit und Vergabepakete
sind out of scope) sowie `Checkbox` (die Facetten-Zeile bringt ihre eigene mit).

**Zwei bewusste Abweichungen vom Skill-Markup:** `DataTable` und `TreeRow` tragen
ARIA-Rollen (`table`/`row`/`columnheader`/`cell` bzw. `treeitem`), weil beide aus
Flex-Divs gebaut sind; und `TreeRow` bekommt ein separates `onToggle`, damit ein Klick
auf die Zeile den Knoten auswählt und nur das Dreieck auf-/zuklappt.

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
  (`SIZE_MODES`). Größe kommt aus den `LVNode`-Aggregaten `position_count` / `total_price`.
- **Drill-in:** Klick auf eine Sammel-Bubble klappt sie auf bzw. zu und wählt sie
  fürs Eigenschaften-Panel — die Mitte bleibt der Graph. In die Tabelle führt das
  Tabellensymbol an der Bubble; bei Positionen öffnet der Klick direkt die
  Tabelle. Welche Ansicht die Mitte zeigt, steht als `centerMode` im Viewer-State
  und wird nicht aus der Auswahl abgeleitet.

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
bewusst nicht Teil des MVP (siehe [`mvp-scope.md`](../mvp-scope.md#out-of-scope)).

## Dev-Betrieb

`npm run dev` im DevContainer, Node ist dort vorhanden. Kein Proxy nötig — es gibt
keine API. `npm run build` erzeugt ein Static-Bundle, das ohne Backend von einem
beliebigen statischen Host ausgeliefert werden kann (Ziel: frei im Internet
erreichbar, siehe [`mvp-scope.md`](../mvp-scope.md)).
