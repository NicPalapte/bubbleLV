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
    │   ├── gaeb/
    │   │   └── parser.ts             # GaebParser — einzige Stelle mit GAEB-Kenntnis
    │   ├── classify/                 # Klassifizierung (Regel-Pipeline, siehe pipeline.md)
    │   ├── tree/
    │   │   └── buildTree.ts          # LVDraft → LVNode-Baum
    │   ├── matchPos.ts               # Filter/Suche — single source of truth
    │   └── graph/                    # Graph-Engine (aus lv-graph.jsx)
    │       ├── layoutRadial.ts       # radiales Tidy-Tree-Layout
    │       └── lod.ts                # Zoom-Schwellen, Culling, Cluster
    ├── state/
    │   └── viewer.ts                 # LVNode-Baum, Selektion, Filter, Suche (Context)
    └── components/
        ├── layout/{Tree,TopBar,PropertiesPanel}.tsx
        ├── upload/FileDropzone.tsx   # Drag&Drop/Datei-Dialog → Pipeline
        ├── graph/{BubbleGraph,BubbleNode,GraphControls}.tsx
        ├── table/PositionsTable.tsx
        ├── filter/{FilterStrip,FacetButton,RangeButton}.tsx
        └── common/{Status,Highlighted}.tsx
```

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

## Bubble-Graph (Kern des Produkts)

Portiert aus `lv-graph.jsx` — eine skalierbare Knowledge-Graph-Engine, keine simple
Kreisgrafik. Eigenschaften, die erhalten bleiben:

- **Rekursives Baummodell** beliebiger Tiefe (Projekt → Los → Abschnitt →
  ggf. Unterabschnitt/Gruppe → Position).
- **Radiales Tidy-Tree-Layout** mit adaptiven Ring-Radien.
- **Dichte-abhängiges Rendering** je Tier: Bubble / Punkt / Cluster.
  **Cluster-Bubble** ab > 24 Geschwistern (`CLUSTER_AT`).
- **Level-of-Detail:** Labels blenden bei sinkendem Zoom aus (Schwellen je `kind`).
- **Viewport-Culling** (günstiger Bounding-Box-Test) für große LVs (~10k Positionen).
- **Größenmodi:** `Anz. Positionen` · `Gesamtpreis €` · `Einheitlich`
  (`SIZE_MODES`). Größe kommt aus den `LVNode`-Aggregaten `position_count` / `total_price`.
- **Drill-in:** Klick auf einen Abschnittsknoten öffnet dessen Tabelle;
  Umschalter Graph ⇄ Tabelle in der Mitte.

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
