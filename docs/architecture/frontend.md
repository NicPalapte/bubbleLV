# Architektur — Frontend

> Vite · React · TypeScript · Tailwind. Lebt in `frontend/`. Lokal lauffähig,
> Backend über Dev-Proxy. Referenz-Design (nicht ausgeliefert): `design/`.

## Herkunft & Portierung

Das Design liegt als Single-File-React mit Browser-globalem `React`, Fixture-Daten
(`window.LV`) und `localStorage` vor. Portiert wird zu einer echten, modularen
TS-App. Beim Port gilt:

- **Keine Fixture-Daten** — alles kommt aus der API.
- **Kein `localStorage` für Fachdaten** — Zuständigkeit wird im Backend persistiert.
  Reiner UI-Zustand (Auswahl, Zoom, aktive Filter) darf in React-State/Context leben.
- `matchPos` bleibt die **einzige** Quelle für Filter-/Suchlogik.

## Ordnerstruktur

```
frontend/
├── index.html
├── vite.config.ts            # Proxy /api → FastAPI (kein CORS im Dev)
├── package.json
├── tailwind.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── pages/ViewerPage.tsx          # 3-Spalten-Layout
    ├── api/
    │   ├── client.ts                 # fetch-Wrapper, Fehlerbehandlung
    │   └── lv.ts                     # getTree, getPosition, setAssignee
    ├── types/lv.ts                   # LVNode, PositionSummary, PositionDetail, Facets
    ├── lib/
    │   ├── matchPos.ts               # Filter/Suche — single source of truth
    │   └── graph/                    # Graph-Engine (aus lv-graph.jsx)
    │       ├── buildTree.ts          # LVNode → interner Graph-Baum
    │       ├── layoutRadial.ts       # radiales Tidy-Tree-Layout
    │       └── lod.ts                # Zoom-Schwellen, Culling, Cluster
    ├── state/
    │   └── viewer.ts                 # view-Modus, Selektion, Filter, Suche (Context)
    └── components/
        ├── layout/{Tree,TopBar,PropertiesPanel}.tsx
        ├── graph/{BubbleGraph,BubbleNode,GraphControls}.tsx
        ├── table/PositionsTable.tsx
        ├── filter/{FilterStrip,FacetButton,RangeButton}.tsx
        └── common/{Status,Member,AssigneePicker,Highlighted}.tsx
```

## Datenfluss

```
ViewerPage
  └─ lädt getTree(projectId) → LVNode-Baum
       ├─ Tree            (linke Spalte, konsumiert LVNode)
       ├─ BubbleGraph     (Mitte, konsumiert denselben LVNode-Baum)
       ├─ PositionsTable  (Mitte, alternativer Modus)
       └─ PropertiesPanel (rechts, getPosition(id) bei Auswahl)
matchPos(position, filters, search)  ← überall identisch für Sichtbarkeit/Dimmen
```

Tree und Graph teilen sich **denselben** `LVNode`-Baum aus dem Backend — das ist der
direkte Nutzen der rekursiven API und der quellen-agnostischen DB.

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
| `components/graph/*` | `lv-graph.jsx` (`Bubbles`, Layout) | Bubble-Graph |
| `components/table/PositionsTable.tsx` | `PositionsTable` | Positionsliste, sortierbar |
| `components/filter/*` | `FilterStrip`,`FacetButton`,`RangeButton` | Facetten + aktive-Filter-Chips |
| `components/common/Highlighted.tsx` | `Highlighted` | rendert `**…**` im Langtext |
| `components/common/{Member,AssigneePicker}.tsx` | `Member`,`AssigneePicker`,`useAssignees` | Zuständigkeit |
| `components/common/Status.tsx` | `Status` | Status-Badge (nur Anzeige/Filter) |
| `lib/matchPos.ts` | `matchPos` | Filter/Suche |

**Nicht portiert:** `TasksBlock`, `lv-notes.jsx`, `lv-analytics.jsx`, `lv-vergabe.jsx`,
`wf-*.jsx`, `design-canvas.jsx` (Design-/Wireframe-Gerüst → nur Referenz in `design/`).

## Zuständigkeit (Responsibility)

`AssigneePicker` schreibt über `setAssignee(positionId, assigneeId)` →
`PATCH /api/positions/{id}`. Optimistisches UI-Update, danach Server-Wahrheit.
Team-Roster (`TEAM`) bleibt vorerst clientseitige Konstante; kann später ein
Endpunkt werden.

## Dev-Betrieb

`npm run dev` im DevContainer; `vite.config.ts` proxyt `/api` auf die FastAPI-App.
Node ist im DevContainer vorhanden. Kein Deployment im MVP — lokal genügt.
