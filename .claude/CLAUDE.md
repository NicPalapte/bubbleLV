# Conocto – Coding Agent

## Projektbeschreibung
Conocto macht **ein Leistungsverzeichnis lesbar**: es zeigt jede Information, die in der
Datei steckt, hebt das Wichtige hervor und macht die Beziehungen zwischen Positionen
sichtbar. Das ist die einzige Aufgabe — alles, was nicht dem Verstehen einer geladenen
Datei dient, gehört nicht in dieses Produkt.

**Reine Frontend-Anwendung** – kein Server, keine Datenbank, kein Login. GAEB-Datei im
Browser laden, klassifizieren, prüfen und im Graphen mit Fenstern darüber
durchsuchen und filtern. Die Datei verlässt den Browser nie. Einzige Ausnahme vom
Nicht-Speichern: die zuletzt geöffnete eigene Datei samt eigenen Markierungen und Kommentaren
bleibt in der IndexedDB dieses Browsers (`docs/decisions/0046-letzte-datei-im-browser.md`,
`docs/decisions/0047-kommentare-und-markierungen.md`), dazu die im Admin-Werkzeug gelernten
Begriffe für die Langtext-Hervorhebung (`docs/decisions/0053`); sonst verwirft ein Reload
den Stand.

Technischer Überblick (Aufbau, Ordner, Deployment, Review): @docs/entwicklung.md
Öffentliche Beschreibung für Besucher: `README.md` – nur Produkt/Vision, keine Agent-/Entwicklerinhalte
Scope: @docs/scope.md · Plan: @docs/implementation-plan.md · Prüfregeln: @docs/domain/vob-pruefungen.md
Architektur: @docs/architecture/pipeline.md · @docs/architecture/frontend.md · @docs/architecture/data-model.md
Entscheidungen: @docs/decisions/README.md · Einrichtung CI/Agenten: @docs/setup/ci-und-agenten.md

## Bash-Befehle
- `cd frontend && npm run dev` – App lokal starten
- `cd frontend && npm test` – Vitest (Unit-Tests, inkl. GAEB-Parser gegen Fixtures)
- `cd frontend && npm run typecheck` – TypeScript über `src`, `vite.config.ts` und `tests`
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
  sie transportieren keine Nutzdaten. Hanken Grotesk (Titel) und Schibsted Grotesk (Text)
  kommen über `@conocto/design/fonts` (selbst gehostet, im Bundle, `frontend/src/main.tsx`) –
  kein Fremdaufruf an Google Fonts.
- **Kein `localStorage`/`sessionStorage`/Cookies für Fachdaten.** Reiner UI-Zustand
  (Auswahl, Zoom, aktive Filter) darf in React-State/Context leben, muss aber einen
  Reload nicht überleben. Ausnahme: die Anordnung im Splitscreen (Entscheidung 0073).
- **IndexedDB nur über `frontend/src/lib/persist/lastLv.ts`:** genau ein Projekt
  (Original-Bytes + Angaben der zuletzt geöffneten eigenen Datei + Marker, Kommentar-Verlauf
  und Textmarkierungen je Positions-Hash `hashes.id`, `lib/annotations.ts`, Entscheidung 0057,
  dazu Stellen in Begleit-PDFs `lib/docs/docNotes.ts`, 0072),
  löschbar auf der Startseite. Dazu, unabhängig von der Datei, die im Admin-Werkzeug gelernten
  Begriffe (`lib/highlight/terms.ts`), die eigenen Namen der Markierfarben
  (`lib/paintNames.ts`, `state/paintNames.tsx`) und der Merker der Kurzumfrage
  (`state/survey.tsx`, Schlüssel `umfrage`, Entscheidung 0071) und die letzte Anordnung
  im Splitscreen (`state/ViewerProvider.tsx`, Schlüssel `anordnung`, Entscheidung 0073)
  und die eigenen Regeln `bubble-rule-v1` (`state/admin.tsx`, Schlüssel `regeln`, 0081).
  Urteile über Verbindungen aus Regeln liegen in den Notizen der Datei (`links`, 0081).
  Kein geparstes LV speichern, keine Demo-LVs, keine zweite Datei, keine PDF-Bytes. Notizen
  nur schreiben, wenn die Projekt-Kennung (`persistIdOf`) noch passt. Fehlt IndexedDB ⇒ still ohne
  Speicher weiter, kein Fehler (Entscheidungen 0046, 0047, 0053).

### Client-seitige Pipeline (Kern)
- `GaebParser` ist die **einzige** Stelle mit GAEB-XML-Kenntnis
  (`packages/core/src/gaeb/parser.ts`); Exceptions nur `GAEBParseError`,
  `GAEBValidationError`, `GAEBVersionError`.
- Der Parser liefert das neutrale Zwischenmodell `LVDraft`
  (`packages/core/src/model/lvDraft.ts`) – **ohne** GAEB-Begriffe.
- Kern `packages/core/` (Entscheidung 0054): App importiert nur über `@core`; im Kern kein
  React und kein Import aus `frontend/`. Neue Fachlogik ohne UI-Bezug gehört dorthin.
- Positionen tragen Inhalts-Hashes (`PositionHashes`, Entscheidung 0055). Preis,
  Klassifizierung und Notizen gehen nie in den Hash ein; Normierung nur mit neuer
  Schema-Kennung (`bubble-pos-v1`) ändern.
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
- Alle Bereiche des Splitscreens und alle Fenster arbeiten auf derselben gefilterten Menge
  und derselben Auswahl;
  Zustand getrennt in `filterState` / `selectionState` / `viewState`

## Code-Style
- Produktname **Conocto** (`docs/decisions/0069-conocto-look.md`). Alt-Kennungen mit
  `bubble` nicht umbenennen – bricht gespeicherte Daten und Links: `DB_NAME`,
  `NOTES_FILE_KIND`, `bubble-pos-v1`, `bubble-graph-v1`, GoatCounter-Code, Repo `bubbleLV`,
  `@bubble/core`. „Bubble" als Blase im Graphen (`BubbleGraph`) bleibt.
- Farben nur über CSS-Variablen aus dem Paket `@conocto/design` (`tokens.css`, Entscheidung
  0076); `--accent*` ist der Ziegelrot-Akzent (Auswahl, Interaktion). Neue/geänderte Tokens
  im Repo `conocto-design`, nicht in `frontend/src/index.css`. Hinweise amber, nie rot. Titel `font-display`
  (Hanken Grotesk), sonst Schibsted Grotesk; kein `tabular-nums` (verbreitert `.` und `,`).
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
- Parser-Tests laufen gegen echte GAEB-Fixtures unter `packages/core/tests/fixtures/`
- Jede eigene Exception hat mindestens einen Test, der den Fehlerfall auslöst

## Produkt-Scope
**In Scope:** GAEB-Import im Browser (x83 **und** preisführende x84/x86) ·
Klassifizierung Kurz-/Langtext inkl. Textstellen · Hervorhebung der vier
Wichtig-Kategorien (Geld/Menge · Risiko · Norm · Frist) · VOB-Check als Hinweis ·
fachliche Filter · **Graph als Hauptscreen** auf einem Filterzustand
(`docs/decisions/0034-graph-als-hauptscreen.md`): Graph, Tabelle, Positionskarte, Überblick
(mit Import-Log), Prüfung und Dokument **nur** als nahtloser Splitscreen mit tausch-,
stapel- und schließbaren Bereichen, ein- und ausblendbar über „Ansicht“, schmal Graph + ein
Platz mit Reitern (`docs/decisions/0074-nur-noch-splitscreen.md`); Filterleiste und
Vergleich (max. 4 Positionen, `docs/decisions/0037-vergleichsfenster.md`) darüber
(`view.workspace`, `docs/decisions/0064-splitscreen.md`,
`docs/decisions/0070-splitscreen-nahtlos-stapeln.md`; frei teilbar, letzte Anordnung
gemerkt: `docs/decisions/0073-splitscreen-frei-teilen-und-merken.md`) · Beziehungen zwischen Positionen nur als
ähnliche Positionen im Vergleich, keine wertende Prüfregel (`docs/decisions/0049`) · eigene Marker (Fortschritt Offen/In Bearbeitung/Fertig + Wichtig, `docs/decisions/0062`) + Kommentar-Verlauf je Position zur letzten
Datei (`docs/decisions/0047-kommentare-und-markierungen.md`, `docs/decisions/0053`) ·
eigene Textmarkierungen im Langtext (6 feste Farben mit eigenen Namen, `docs/decisions/0063`) ·
gelernte Hervorhebungen im Langtext nur über Admin-Werkzeug (0053) · Regeleditor im
Admin-Werkzeug (`bubble-rule-v1`, Auswerter nur in `packages/core/src/rules/`; Verbindungen
zwischen Positionen nur als Vorschlag, gilt erst nach Bestätigung, `docs/decisions/0081`) · lokaler Export/Druck über das
Logo-Menü · Notizen als Datei sichern/laden (`lib/notesFile.ts`, 0061) · freiwillige Kurzumfrage
zum Produkt (Owner-Wunsch, `docs/decisions/0071-kurzumfrage.md`). · Begleit-PDF im
Fenster „Dokument“ lesen, anstreichen, Stellen von Hand mit Positionen verknüpfen, keine
Interpretation (`components/docs/`, `docs/decisions/0072-begleitdokument-pdf.md`); Vorschläge nur
bei exakt passender OZ oder eindeutiger Menge+Einheit (gleiche Menge: eigene Kurztext-Wörter im
Satzteil, bei Aufzählung/„je“ mehrere Positionen), Übernahme erst per Klick, „Nein“ gemerkt,
kein inhaltliches Matching (`lib/docs/docSuggest.ts`, `docs/decisions/0080`);
Suchleiste nur fürs LV, eigenes Suchfeld im Dokument nur fürs PDF, filtert das LV nie
(`docs/decisions/0083`). Matrix und
Ähnlichkeit sind entfernt (`docs/decisions/0031-drei-ansichten.md`); keine
Befehlspalette (`docs/decisions/0038-keine-befehlspalette.md`).

**Out of Scope** (ablehnen / vertrösten): Server jeglicher Art, Persistenz über die
Session hinaus (außer 0046/0047/0053/0073), Auth/SSO (das Admin-Passwort aus 0053 ist nur
Sichtschutz), **mehrere Dateien gleichzeitig** (Versionsvergleich,
x83+x84-Merge — perspektivisch gewollt, jetzt draußen; Begleit-PDF erlaubt, 0072), Aufgaben, Notizen außer
Markierung/Kommentar je Position, Vergabepakete, NU-Anfragen, Bieterfragen **verwalten**, Zuständigkeit/Zuweisung,
Status-**Änderung**, EP-Kalkulation, Excel-/Manuell-Import, Multi-Tenant, GAEB-Export,
LLM-Klassifizierung. Details → @docs/scope.md #out-of-scope

## Kritische Constraints
- **~10k Positionen** müssen flüssig laufen — im Graphen und in jedem Fenster. Messbare
  Zielwerte: erste Ansicht < 5 s, Filterwechsel < 100 ms, Fenster öffnen < 200 ms
  (siehe @docs/scope.md). Mittel: flacher Positions-Index statt Baum-Traversierung
  je Render, Aggregation im Web Worker, Virtualisierung, LOD + Culling im Graphen.
- **Ein Filterzustand für alle Bereiche.** Einen Bereich, Reiter oder ein Fenster öffnen/
  schließen ändert nie Filter, Suche oder Auswahl. Bereiche nur über `view.workspace`;
  kein zweiter Fenster-Modus (Entscheidung 0074).
- **Beziehungen werden einmal beim Laden im Worker berechnet**, nie im Render. Kein
  All-Paare-Vergleich — erst nach Einheit vorgruppieren.
- **Prüfregeln sind Hinweise, keine Urteile.** Jede Regel nennt ihren Norm-Verweis,
  zeigt die Fundstelle und ist einzeln abschaltbar. Fehlende Referenzdaten ⇒ Regel
  inaktiv, kein Fehler. Formulierungen nie als Rechtsrat.
- Status ist Default `OPEN` aus dem Import, nur Anzeige, nicht editierbar, kein Filter
  (`docs/decisions/0051-kein-status-filter.md`)
- Kein Request, der Fachdaten irgendwohin schickt – bei Unsicherheit nachfragen,
  bevor ein Feature einen eigenen Server voraussetzt. Statische Fremd-Assets
  (Fonts, CDN-Pakete) sind davon nicht betroffen. Lokale Downloads (CSV/Markdown/
  Notiz-JSON als Blob) und Browser-Druck sind erlaubt – sie erzeugen keinen Request.
- **Nutzungszählung nur über `frontend/src/lib/usage/count.ts`** (GoatCounter,
  Entscheidung 0056): nur feste Namen aus `USAGE_EVENTS`. Verboten: Dateinamen, LV-Texte,
  Suchtexte, Filterwerte, Positions-IDs, URL-Fragment mitsenden. Neues Ereignis ⇒ Namen
  in `USAGE_EVENTS` ergänzen, Zuordnung in `usageEventOf` oder Aufruf von `countEvent`.
  Hauptschalter `VITE_USAGE_COUNT=1` in `frontend/.env.production` nur nach Freigabe des
  Owners setzen (Datenschutzerklärung muss GoatCounter nennen).

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
- `.github/workflows/ci.yml` – Lint, Format, Typecheck, Test, Build bei jedem PR
- `.github/workflows/claude-review.yml` – Review-Agent, max. 3 automatische Läufe je PR
- `.github/workflows/pr-preview.yml` – Preview-App je PR unter `pr-preview/pr-<nr>/`,
  nur auf Kommentar `/preview`
- `.github/workflows/deploy-pages.yml` – `main` → Branch `gh-pages` (Wurzel)
- `gh-pages` wird ausschließlich von Workflows geschrieben – niemals von Hand committen
- Der Review-Agent misst am Inhalt dieser Datei; Regeländerungen hier ändern den
  Review-Maßstab

## Antwortformat
Beginne jede neue Komponente mit einem kurzen Implementierungsplan (3–5 Punkte).
Kein Code mit Platzhaltern (`# TODO: implement`).
