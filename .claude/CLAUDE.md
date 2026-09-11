# Bubble – Coding Agent

## Projektbeschreibung
Bubble macht **ein Leistungsverzeichnis lesbar**: es zeigt jede Information, die in der
Datei steckt, hebt das Wichtige hervor und macht die Beziehungen zwischen Positionen
sichtbar. Das ist die einzige Aufgabe — alles, was nicht dem Verstehen einer geladenen
Datei dient, gehört nicht in dieses Produkt.

**Reine Frontend-Anwendung** – kein Server, keine Datenbank, kein Login. GAEB-Datei im
Browser laden, klassifizieren, prüfen und in mehreren gleichrangigen Ansichten
durchsuchen, filtern und vergleichen. Nichts wird gespeichert – die Datei verlässt den
Browser nie, ein Reload verwirft den Stand.

Vollständige Projekt-/Ordnerbeschreibung: @README.md
Scope: @docs/scope.md · Plan: @docs/implementation-plan.md · Prüfregeln: @docs/domain/vob-pruefungen.md
Architektur: @docs/architecture/pipeline.md · @docs/architecture/frontend.md · @docs/architecture/data-model.md
Entscheidungen: @docs/decisions/README.md · Einrichtung CI/Agenten: @docs/setup/ci-und-agenten.md

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
- **Kein eigenes Backend**, keine DB, kein Login. Jede Fachfunktion – Parsen,
  Klassifizieren, Filtern, Rendern – läuft im Browser und darf keinen eigenen
  Server voraussetzen. Fachdaten verlassen den Browser nie.
- Statische Fremd-Assets (Webfonts, npm-Pakete, CDN-Ressourcen) sind **erlaubt**;
  sie transportieren keine Nutzdaten. IBM Plex Mono und Space Grotesk werden über
  `@fontsource/*` selbst gehostet und im Bundle ausgeliefert (`frontend/src/main.tsx`) –
  kein Fremdaufruf an Google Fonts.
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
  reine Funktion, kein Fetch. Für Filter, Summen und Beziehungen kommt ein **flacher
  Positions-Index** dazu (WP-I) – der Baum bleibt die Struktur, der Index die Rechenbasis.
- Prüfregeln liegen in `frontend/src/lib/check/` hinter einer Registry, ein Modul je
  Regel; Katalog und Norm-Verweise: @docs/domain/vob-pruefungen.md
- Große LVs (Richtung ~10k Positionen): Parsing + Klassifizierung laufen in einem
  Web Worker, damit die UI nicht blockiert.

### Frontend
- Daten kommen aus der lokalen Pipeline (Datei → Parser → Klassifizierung → Baum) –
  **keine** Fixture-Daten, **kein** `localStorage` für Fachdaten
- `matchPos` ist die einzige Quelle für Filter-/Suchlogik
- Tree und Bubble-Graph konsumieren **denselben** rekursiven `LVNode`-Baum
- Alle Ansichten arbeiten auf derselben gefilterten Menge und derselben Auswahl;
  Zustand getrennt in `filterState` / `selectionState` / `viewState`

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
Scopes: `gaeb · classify · tree · viewer · graph · relate · check · frontend`

## Tests
- Unit: `GaebParser`, Klassifizierer, `buildTree`, `matchPos` – mit Vitest
- Parser-Tests laufen gegen echte GAEB-Fixtures unter `frontend/tests/fixtures/`
- Jede eigene Exception hat mindestens einen Test, der den Fehlerfall auslöst

## Produkt-Scope
**In Scope:** GAEB-Import im Browser (x83 **und** preisführende x84/x86) ·
Klassifizierung Kurz-/Langtext inkl. Textstellen · Hervorhebung der vier
Wichtig-Kategorien (Geld/Menge · Risiko · Norm · Frist) · VOB-Check als Hinweis ·
fachliche Filter · **acht gleichrangige Ansichten** auf einem Filterzustand (Überblick ·
Graph · Tabelle · Matrix · Ähnlichkeit · Vergleich · Prüfung · Eigenschaften) ·
Beziehungen zwischen Positionen (Ähnlichkeit, Unterschiede, Ausreißer) · lokaler
Export/Druck.

**Out of Scope** (ablehnen / vertrösten): Server jeglicher Art, Persistenz über die
Session hinaus, Auth/SSO, **mehrere Dateien gleichzeitig** (Versionsvergleich,
x83+x84-Merge — perspektivisch gewollt, jetzt draußen), Aufgaben, Notizen,
Vergabepakete, NU-Anfragen, Bieterfragen **verwalten**, Zuständigkeit/Zuweisung,
Status-**Änderung**, EP-Kalkulation, Excel-/Manuell-Import, Multi-Tenant, GAEB-Export,
LLM-Klassifizierung. Details → @docs/scope.md #out-of-scope

## Kritische Constraints
- **~10k Positionen** müssen flüssig laufen — in *jeder* Ansicht. Messbare Zielwerte:
  erste Ansicht < 5 s, Filterwechsel < 100 ms, Ansichtswechsel < 200 ms
  (siehe @docs/scope.md). Mittel: flacher Positions-Index statt Baum-Traversierung
  je Render, Aggregation im Web Worker, Virtualisierung, LOD + Culling im Graphen.
- **Ein Filterzustand, alle Ansichten.** Ein Ansichtswechsel ändert nie Filter, Suche
  oder Auswahl. Der Graph ist eine Ansicht unter mehreren, kein Sonderfall.
- **Beziehungen werden einmal beim Laden im Worker berechnet**, nie im Render. Kein
  All-Paare-Vergleich — erst nach Gewerk/Einheit/Bauteiltyp vorgruppieren.
- **Prüfregeln sind Hinweise, keine Urteile.** Jede Regel nennt ihren Norm-Verweis,
  zeigt die Fundstelle und ist einzeln abschaltbar. Fehlende Referenzdaten ⇒ Regel
  inaktiv, kein Fehler. Formulierungen nie als Rechtsrat.
- Status ist Default `OPEN` aus dem Import und nur Filter-Facette, nicht editierbar
- Kein Request, der Fachdaten irgendwohin schickt – bei Unsicherheit nachfragen,
  bevor ein Feature einen eigenen Server voraussetzt. Statische Fremd-Assets
  (Fonts, CDN-Pakete) sind davon nicht betroffen. Lokale Downloads (CSV/Markdown als
  Blob) und Browser-Druck sind erlaubt – sie erzeugen keinen Request.

## Sprache & Zielgruppen
Der Repo-Owner ist **kein Software-Experte**. Zwei Textsorten, zwei Stile – Begründung:
@docs/decisions/0003-sprache-und-dokumentation.md

**Texte für den Owner** (Chat-Antworten, Commit-Messages, PR-Beschreibungen, `README.md`,
`docs/decisions/`, `docs/setup/`, Kommentare in `.github/workflows/`):
- Einfache Sprache, kurze Sätze, Stichpunkte statt Absätze
- Ergebnis zuerst, dann der Weg dorthin
- Fachbegriff nur wenn nötig – dann beim ersten Vorkommen in einem Halbsatz erklären
  (nicht erklären: GAEB, LV, Position, Los, iTwo – das ist sein Fachgebiet)
- Manuelle Schritte des Owners explizit benennen, inkl. Folge, wenn er sie auslässt
- Keine Statusfloskeln, keine Wiederholung der Aufgabenstellung

**Texte für die KI** (`.claude/CLAUDE.md`, `.claude/commands/`, `.claude/skills/`,
Prompts in Workflows):
- Regeln als Aufzählung, knapp und eindeutig, keine Erzählform
- Exakte Pfade und Symbolnamen statt Umschreibungen
- Verbote als Verbot formulieren + erlaubte Alternative nennen
- Keine Höflichkeitsfloskeln, keine Redundanz

## Dokumentation
- Weichenstellungen gehören nach `docs/decisions/` – eine nummerierte Datei je
  Entscheidung, Vorlage und Kriterien in @docs/decisions/README.md
- Vor Abschluss einer Aufgabe prüfen: neue Abhängigkeit, neuer Workflow, geänderte
  Architekturregel oder verworfene Alternative? → Eintrag anlegen + Übersichtstabelle
  ergänzen
- Getroffene Entscheidungen nicht umschreiben: Status auf `ersetzt durch NNNN` setzen,
  neue Datei anlegen
- Kein Eintrag für Bugfixes, Tests, Umbenennungen, Formatierung
- Anleitungen für manuelle Schritte des Owners nach `docs/setup/`

## Automatik im Repo (nicht ohne Rückfrage ändern)
- `.github/workflows/ci.yml` – Lint, Format, Test, Build bei jedem PR
- `.github/workflows/claude-review.yml` – Review-Agent, max. 3 automatische Läufe je PR
- `.github/workflows/pr-preview.yml` – Preview-App je PR unter `pr-preview/pr-<nr>/`
- `.github/workflows/deploy-pages.yml` – `main` → Branch `gh-pages` (Wurzel)
- `gh-pages` wird ausschließlich von Workflows geschrieben – niemals von Hand committen
- Der Review-Agent misst am Inhalt dieser Datei; Regeländerungen hier ändern den
  Review-Maßstab

## Antwortformat
Beginne jede neue Komponente mit einem kurzen Implementierungsplan (3–5 Punkte).
Kein Code mit Platzhaltern (`# TODO: implement`).
