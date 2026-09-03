# Bubble

Ein kostenloser LV-Viewer: GAEB-Leistungsverzeichnis laden, automatisch klassifizieren
und als interaktiven Graph im Browser durchsuchen und filtern — **komplett
client-seitig**. Keine Installation, kein Login, kein Server: die Datei verlässt den
Browser nie, es wird nichts gespeichert.

Die Besonderheit ist, dass sich das Leistungsverzeichnis interaktiv als Nodes in einem Browser anschauenlässt. 
Die Nodes lassen sich nach verschiedenen Attributen, Beziehungen und Größen anschauen, filtern und sortieren. 

Bubble ergänzt dabei **iTwo** als Kalkulationssoftware – er ersetzt iTwo nicht,
sondern übernimmt die Angebotskoordination drum herum.

## Datenmodell

Die LV-Struktur (Los → Abschnitt → Position, Abschnitt selbst-verschachtelbar) ist
quellen-agnostisch beschrieben: GAEB ist die einzige Quelle im MVP, aber nichts am
Modell ist GAEB-spezifisch. Details: [`docs/architecture/data-model.md`](docs/architecture/data-model.md).

---

## Systemarchitektur

### Stack

| Schicht       | Technologie                                          |
|---------------|------------------------------------------------------|
| App           | Vite · React · TypeScript · Tailwind (`frontend/`)   |
| GAEB-Parsing  | eigener TS-Parser, gekapselt hinter `GaebParser`      |
| Persistenz    | **keine** — alles im Browser-Speicher einer Session   |
| Testing       | Vitest                                                |
| Linting       | ESLint + Prettier                                     |

Es gibt kein Backend, keine Datenbank, keinen Login. Eine geladene Datei wird per
`File.arrayBuffer()` im Browser gelesen, geparst, klassifiziert und in React-State
gehalten — nichts wird an einen Server geschickt oder in `localStorage` abgelegt.
Ein Reload verwirft den Stand; das ist gewollt.

### Client-seitige Pipeline

```
Datei (Drag&Drop/Input)
    │  File.arrayBuffer()
    ▼
GaebParser          ← einzige Stelle mit GAEB-XML-Kenntnis
    │  → LVDraft (quellen-agnostisch, ohne GAEB-Begriffe)
    ▼
classify(draft)      ← Klassifizierung Kurz-/Langtext, befüllt Position.attributes
    ▼
buildTree(draft)      ← rekursiver LVNode-Baum für Tree, Graph und Tabelle
    ▼
React State (Session-only, kein localStorage für Fachdaten)
```

`matchPos` ist die einzige Quelle für Filter-/Suchlogik. Tree und Bubble-Graph
konsumieren denselben rekursiven `LVNode`-Baum.

### Projektstruktur

```
bubble/
├── .devcontainer/
│   ├── devcontainer.json
│   └── docker-compose.yml
├── frontend/                     # wird in WP-D angelegt
│   ├── src/
│   │   ├── lib/
│   │   │   ├── gaeb/             # GaebParser – einzige Stelle mit GAEB-Kenntnis
│   │   │   ├── classify/         # RuleBasedClassifier (TS-Port aus WP-2)
│   │   │   └── tree/             # buildTree – LVDraft → LVNode
│   │   ├── components/
│   │   ├── state/
│   │   └── types/
│   └── tests/
│       └── fixtures/             # echte GAEB DA XML-Testdateien
├── tests/
│   └── fixtures/                 # GAEB DA XML-Testdateien (Quelle, siehe oben)
├── docs/
│   ├── mvp-scope.md              # Feature-Specs und Out-of-Scope-Liste
│   ├── implementation-plan.md    # Arbeitspakete WP-A…G
│   └── architecture/
├── .claude/
│   ├── CLAUDE.md                 # Coding-Agent-Instruktionen
│   ├── settings.json             # Claude Code Hook-Konfiguration
│   └── hooks/lint.sh             # ESLint + Prettier nach jedem Edit/Write
```

### GAEB-Parser-Pattern

GAEB DA XML (Versionen 2.0–3.3) ist ein offenes XML-Format. Statt einer Server-Library
wie `pyGAEB` gibt es einen eigenen, schlanken TS-Parser, der wie zuvor der
Python-Adapter vollständig gekapselt ist:

```
GaebParser (Interface)
    └── XmlGaebParser   ← frontend/src/lib/gaeb/parser.ts
```

GAEB-XML-Elemente (`<Award>`, `<BoQ>`, `<BoQBody>`, `<BoQCtgy>`, …) verlassen die
Adaptergrenze nie. Der Parser liefert ausschließlich `LVDraft`-Typen (eigene TS-Typen,
kein GAEB-Vokabular). Ein Format-/Versionswechsel erfordert nur Änderungen an dieser
einen Stelle.

---

## MVP-Scope (ein Release)

Ein einziges MVP, frontend-only: GAEB laden → klassifizieren → als Bubble-Graph und
Tabelle einsehen, mit Suche und Facetten-Filter. Kein Server, kein Login, keine
Persistenz über die Session hinaus. Details → docs/mvp-scope.md · Umsetzungsplan →
docs/implementation-plan.md

---

## Deployment (GitHub Pages)

Die App ist ein statisches Bundle und wird als GitHub Project Page ausgeliefert:
**https://nicpalapte.github.io/bubbleLV/**

Der Workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
baut `frontend/` und deployt `frontend/dist` — bei jedem Push auf `main` und manuell
über *Actions → Deploy to GitHub Pages → Run workflow* (damit lässt sich auch ein
Feature-Branch testweise veröffentlichen).

Einmalig im Repo einzustellen: *Settings → Pages → Source: **GitHub Actions***.

Project Pages liegen unter `/<repo>/`, deshalb baut der Workflow mit
`--base=/<repo-name>/`. Lokal (`npm run dev`, `npm run build`) bleibt die Base `/`.
Die Fachdaten-Regel gilt unverändert: Pages liefert nur statische Dateien aus, die
GAEB-Datei verlässt den Browser nicht.

---

## Entwicklungsrichtlinien

Die vollständigen Vorgaben für den Coding-Agenten stehen in
[`.claude/CLAUDE.md`](.claude/CLAUDE.md). Kurzübersicht:

- **Kein Server, keine DB** — Import, Klassifizierung, Baum-Aufbau, Suche/Filter laufen
  vollständig im Browser
- **Kein `localStorage` für Fachdaten** — Session-Zustand lebt nur in React-State
- **Strikte TS-Types** überall, kein `any` ohne Kommentar
- **Conventional Commits** — `feat|fix|refactor|test|chore|docs|perf(<scope>): <beschreibung>`
- **Linting** läuft automatisch via Claude Code Hook nach jedem Edit/Write

Vollständiges PRD: [Notion](https://www.notion.so/35a380b03be5817ba3d4f7a83474320a)
