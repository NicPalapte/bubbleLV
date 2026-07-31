# Bubble – Coding Agent

## Projektbeschreibung
Kostenloser, frei zugänglicher LV-Viewer als **reine Frontend-Anwendung** – kein
Server, keine Datenbank, kein Login. Bubble ergänzt **iTwo** als Kalkulationssoftware –
er ersetzt iTwo nicht, sondern übernimmt die Angebotskoordination drum herum. Das MVP:
GAEB-Datei im Browser laden, klassifizieren und das Leistungsverzeichnis als
**Bubble-Graph** und Tabelle einsehen, durchsuchen und filtern. Nichts wird
gespeichert – die Datei verlässt den Browser nie, ein Reload verwirft den Stand.

Vollständige Projekt-/Ordnerbeschreibung: @README.md
Scope: @docs/mvp-scope.md · Plan: @docs/implementation-plan.md
Architektur: @docs/architecture/pipeline.md · @docs/architecture/frontend.md · @docs/architecture/data-model.md

## Bash-Befehle
- `cd frontend && npm run dev` – App lokal starten
- `cd frontend && npm test` – Vitest (Unit-Tests, inkl. GAEB-Parser gegen Fixtures)
- `cd frontend && npm run build` – Production-Build (statisches Bundle)

_Linting/Formatierung laufen automatisch via Claude Code Hook nach jedem Edit/Write
(`.claude/hooks/lint.sh`)._

## Stack
- **App:** Vite · React · TypeScript · Tailwind (alles in `frontend/`)
- **Parsing:** eigener TS-Parser für GAEB DA XML, gekapselt hinter `GaebParser`
- **Persistenz:** keine – alles im Browser-Speicher einer Session

## Architektur (nicht verhandelbar)
- Kein Server, keine DB, kein Login. Jede Funktion muss ohne Netzwerk-Roundtrip
  auskommen (Ausnahme: das initiale Laden der statischen App selbst).
- **Kein `localStorage`/`sessionStorage`/Cookies für Fachdaten.** Reiner UI-Zustand
  (Auswahl, Zoom, aktive Filter) darf in React-State/Context leben, muss aber einen
  Reload nicht überleben.

### Client-seitige Pipeline (Kern)
- `GaebParser` ist die **einzige** Stelle mit GAEB-XML-Kenntnis
  (`frontend/src/lib/gaeb/parser.ts`); Exceptions nur `GAEBParseError`,
  `GAEBValidationError`, `GAEBVersionError`.
- Der Parser liefert das neutrale Zwischenmodell `LVDraft`
  (`frontend/src/types/lvDraft.ts`) – **ohne** GAEB-Begriffe.
- Klassifizierung läuft über das `LVDraft` **vor** dem Baum-Aufbau und schreibt nach
  `Position.attributes` – quellenunabhängig, siehe `docs/architecture/data-model.md`.
- Klassifizierung liegt hinter `ClassifierProtocol`-äquivalentem TS-Interface
  (`frontend/src/lib/classify/`). MVP: regelbasiert; LLM ist Post-MVP und nicht Teil
  dieses Repos, solange es keinen Server gibt.
- `buildTree(draft): LVNode` erzeugt den rekursiven Baum für Tree, Graph und Tabelle –
  reine Funktion, kein Fetch.
- Große LVs (Richtung ~10k Positionen): Parsing + Klassifizierung laufen in einem
  Web Worker, damit die UI nicht blockiert.

### Frontend
- Daten kommen aus der lokalen Pipeline (Datei → Parser → Klassifizierung → Baum) –
  **keine** Fixture-Daten, **kein** `localStorage` für Fachdaten
- `matchPos` ist die einzige Quelle für Filter-/Suchlogik
- Tree und Bubble-Graph konsumieren **denselben** rekursiven `LVNode`-Baum

## Code-Style
- Strikte TS-Types überall – kein `any` ohne Kommentar
- Kurze, gezielte Kommentare nur bei nicht-offensichtlichem WARUM (z. B. GAEB-Format-
  Eigenheiten)
- Zeilenlänge ≤ 100 Zeichen

## Domänenwissen
Norm-/DIN-/VOB-Nummer zitieren; bei Unsicherheit über normative Inhalte nachfragen
statt erfinden. Details/Index: @docs/domain/

## Commits (Conventional Commits)
Vor jeder neuen Aufgabe prüfen, ob ein passender Branch aktiv ist. Falls `main` aktiv
ist, darauf hinweisen – keinen Branch selbst erstellen.

`feat|fix|refactor|test|chore|docs|perf(<scope>): <beschreibung>`
Scopes: `gaeb · classify · tree · viewer · graph · frontend`

## Tests
- Unit: `GaebParser`, Klassifizierer, `buildTree`, `matchPos` – mit Vitest
- Parser-Tests laufen gegen echte GAEB-Fixtures unter `frontend/tests/fixtures/`
- Jede eigene Exception hat mindestens einen Test, der den Fehlerfall auslöst

## MVP-Scope (ein Release, keine Phasen)
**In Scope:** GAEB-Import im Browser · Klassifizierung Kurz-/Langtext ·
LV-Viewer (Tree + **Bubble-Graph** + Tabelle) · Suche · Facetten-Filter.

**Out of Scope** (ablehnen / vertrösten): Analytik, Aufgaben, Notizen, Vergabepakete,
NU-Anfragen, Bieterfragen, Zuständigkeit/Zuweisung, Status-**Änderung**, Auth/SSO,
Server jeglicher Art, Persistenz über die Session hinaus, Excel-/Manuell-Import,
Multi-Tenant, GAEB-Export, LLM-Klassifizierung. Details → @docs/mvp-scope.md #out-of-scope

## Kritische Constraints
- Bubble-Graph muss Richtung ~10k Positionen skalieren (Aggregate im `LVNode`, LOD,
  Culling, Parsing/Klassifizierung im Web Worker)
- Status ist Default `OPEN` aus dem Import und nur Filter-Facette, nicht editierbar
- Keine Netzwerk-Requests außerhalb des initialen App-Ladens – bei Unsicherheit
  nachfragen, bevor ein Feature einen Server voraussetzt

## Antwortformat
Beginne jede neue Komponente mit einem kurzen Implementierungsplan (3–5 Punkte).
Kein Code mit Platzhaltern (`# TODO: implement`).
