# Code-Review 2026-10-02

Stand: Branch `claude/admiring-lamport-k6mn6o`. Nichts am Code geändert, nichts committet.

## Kurzfazit

- Die App hält ihre Kernzusagen ein: kein Server, kein Request mit Fachdaten, kein Storage.
- Gemessen: 10.000 Positionen laufen weit unter den Zielwerten.
- Ein echter Fehler bei Effizienz/Sicherheit: eine Regex im Maß-Extraktor wird bei langen Ziffernfolgen quadratisch langsam (40.000 Ziffern = 11 s). Inzwischen behoben (#89).
- Fehlermeldungen sind meistens gut. Lücken: kein Größenlimit, englische Technik-Texte bei leerer Datei, Export ohne Fehlermeldung, Teilen-Link verwirft Fehler still.
- Dopplungen: kleine Wortlisten- und Hilfsfunktions-Dopplungen. Die Filterlogik selbst ist sauber an einer Stelle.

## Ampel

| Bereich | Ampel | Grund in einem Satz |
| --- | --- | --- |
| Dopplungen | gelb | Filterlogik sauber; Wortlisten und zwei Hilfsfunktionen doppelt |
| Effizienz | gelb | Zielwerte klar erreicht; eine quadratische Regex (inzwischen behoben, #89) |
| Sicherheit | gelb | Kein XSS, keine Datenabflüsse; CSV-Schutz vorhanden; Regex-DoS, 5 Dev-Warnungen, Workflow-Härtung offen |
| Fehlermeldungen | gelb | Alle drei Exceptions erreichen die UI; Lücken bei Größe, Export, Teilen-Link |

## Prüfläufe

| Lauf | Ergebnis |
| --- | --- |
| `npm ci` | ok |
| `npm test` | 71 Dateien, 710 Tests, alle grün (68 s) |
| `npm run typecheck` | ohne Fehler |
| `npm run build` | ok (Haupt-Bundle 435,68 kB, gzip 135,88 kB) |
| `npm audit` (alles) | 5 Warnungen (2 moderat, 3 hoch), nur Dev-Werkzeuge |
| `npm audit --omit=dev` | 0 Warnungen |

Die 5 Warnungen betreffen `undici`, `brace-expansion`, `nanoid`, `@vitest/mocker`/`vitest`. Keines davon liegt im ausgelieferten Bundle. `npm audit` nennt `npm audit fix` als Lösung.

## Messung (10.000 Positionen)

Methode:
- Skript im Scratchpad, nicht im Repo.
- Synthetisches LV: 106 echte Positionstexte aus den beiden Demo-Dateien, vervielfacht.
- 10.000 Positionen = 5,4 MB XML, im Schnitt 206 Zeichen Langtext.
- Lauf in Node 22 mit jsdom, nicht im Browser.
- Einzelmessung je Schritt, kein Median.

| Schritt | 1.000 Pos. | 10.000 Pos. (Texte variiert) | 10.000 Pos. (Texte gleich) |
| --- | --- | --- | --- |
| XML parsen (jsdom) | 373 ms | 2.473 ms | 2.903 ms |
| Klassifizieren | 110 ms | 802 ms | 813 ms |
| `buildTree` | 2 ms | 11 ms | 9 ms |
| Positions-Index | 5 ms | 55 ms | 49 ms |
| `summarize` | 12 ms | 26 ms | 23 ms |
| `buildRelations` | 48 ms | 347 ms | 446 ms |
| `runChecks` | 14 ms | 65 ms | 64 ms |
| `structuredClone` Ergebnis | 13 ms | 109 ms | 155 ms |

Summe bis zur ersten Ansicht (10.000, variiert): rund 3,9 s in jsdom.
- Zielwert ist < 5 s.
- Das jsdom-Parsen ist vermutlich langsamer als der native Parser im Browser. Browser-Wert ist nicht gemessen.
- Klassifizierung und Beziehungen laufen im Worker, das Parsen auf dem Haupt-Thread (so im Code vorgesehen).

Filterwechsel (10.000 Positionen), Ziel < 100 ms:

| Schritt | Suche "beton" | Suche "xyz" | Suche "DIN" |
| --- | --- | --- | --- |
| `filterMask` | 4 ms | 2 ms | 3 ms |
| `computeMatchCounts` | 11 ms | 7 ms | 7 ms |
| `buildOverview` | 7 ms | 0 ms | 13 ms |

Nicht gemessen: Ansichtswechsel (< 200 ms), Rendern von Graph, Tabelle, Matrix. Dafür braucht es einen echten Browser.

Die Beziehungen bleiben im Test günstig. Gründe im Code (`lib/relate/similarity.ts`):
- Vorgruppierung nach Gewerk/Einheit/Bauteiltyp (Zeile 138, 262-285).
- Obergrenzen `MAX_POSTING = 256` und `MAX_COMPARISONS = 256` (Zeile 46, 48).
- Mein Testmaterial hatte nur 106 verschiedene Texte. Ein LV mit sehr vielen verschiedenen Texten in einer Gruppe ist nicht gemessen.

## Befunde

### Hoch

Keine.

### Mittel

**M1. Quadratische Regex bei langen Ziffernfolgen**
- Status: **behoben** in 8913ec1 (#89). Anker vor der Zahl, Test in `extractors.test.ts`. Die Messwerte unten zeigen den Stand vor dem Fix.
- Datei: `frontend/src/lib/classify/extractors/masse.ts:42-44` (`suffixed`), Aufruf über `REGELN`.
- Problem: `suffixed()` baut `\d+(?:[.,]\d+)?\s*(?:mm|cm|dm|m)\s*(?:…)\b` ohne Anker vor der Zahl. Bei einer langen Ziffernfolge ohne Einheit startet der Treffer an jeder Stelle neu und liest bis zum Ende. Das ist quadratisch.
- Beleg (gemessen, jsdom, ein Langtext mit n Ziffern):
  - 10.000 Ziffern: 606 ms
  - 20.000 Ziffern: 2.654 ms
  - 40.000 Ziffern: 11.279 ms
  - Zum Vergleich "1," x 40.000: 17 ms.
- Folge: Eine präparierte oder fehlerhafte Datei friert den Browser-Tab ein. Das Parsen läuft auf dem Haupt-Thread, die Klassifizierung ab 500 Positionen im Worker, darunter ebenfalls auf dem Haupt-Thread.
- Vorschlag:
  - Vor die Zahl `(?<![\d.,])` setzen.
  - Alternativ Langtexte vor der Regex auf eine Obergrenze kürzen.
  - Test mit 50.000 Ziffern ergänzen.

**M2. Kein Größenlimit, keine Meldung bei sehr großen Dateien**
- Dateien: `frontend/src/components/upload/FileDropzone.tsx:45-49`, `frontend/src/lib/pipeline/loadLv.ts:113-115`, `frontend/src/lib/gaeb/parser.ts`.
- Problem: Es gibt keine Prüfung der Dateigröße. `file.arrayBuffer()`, Dekodieren und DOM-Parsen laufen am Stück auf dem Haupt-Thread.
- Beleg: Suche nach Limit/Größe in `src` und `docs/scope.md` ohne Treffer. Gemessen ist nur bis 5,4 MB (2,5 s in jsdom). Browser-Verhalten bei 100 MB oder mehr ist nicht gemessen.
- Folge: Bei sehr großen Dateien kann der Tab abstürzen. Dann kommt keine Meldung der App.
- Vorschlag:
  - Grenze festlegen, z. B. nach einer Messung im Browser.
  - Darüber eine klare Meldung: "Datei ist X MB groß, die App liest bis Y MB."
  - Grenze in `docs/scope.md` festhalten.

**M3. Tief verschachteltes XML: Absturz mit englischem Systemtext**
- Dateien: `frontend/src/lib/gaeb/parser.ts` (`parseCategory` ruft sich selbst auf), `frontend/src/lib/pipeline/messages.ts:30-33`.
- Problem: Ein XML mit 5.000 verschachtelten `BoQCtgy` wirft `RangeError: Maximum call stack size exceeded`. Die Pipeline ordnet das als `unknown` ein und zeigt den rohen englischen Text.
- Beleg (gemessen, jsdom): `RangeError | Maximum call stack size exceeded | 19.357 ms`. Ob der Browser-Parser das vorher ablehnt, ist nicht gemessen.
- Vorschlag:
  - Im Parser eine Tiefengrenze einbauen, die `GAEBValidationError` mit deutschem Text wirft.
  - Außerdem in `toPipelineError` den Fall `unknown` mit deutscher Standardmeldung versehen. Den Rohtext nur anhängen, nicht allein zeigen.

**M4. Export (CSV, Markdown) ohne Fehlerbehandlung**
- Dateien: `frontend/src/lib/export/download.ts:26-37`, `frontend/src/components/common/useMitnehmen.ts:37-62`.
- Problem: `downloadText` hat kein `try/catch` und keine Rückmeldung. Fehler in Klick-Handlern fängt die `ErrorBoundary` nicht, sie landen nur in der Konsole. Eine Erfolgsmeldung fehlt ebenfalls.
- Beleg: Code gelesen. Ein Fehler wurde nicht ausgelöst.
- Folge: Wenn der Download scheitert (z. B. Browser blockiert, Speicher voll), sieht der Nutzer nichts.
- Vorschlag: Fehler abfangen und eine sichtbare Meldung zeigen ("Export fehlgeschlagen: …").

**M5. Workflow `claude-review.yml`: Kommentar-Auslöser prüft keinen Fork und keine Rechte selbst**
- Datei: `.github/workflows/claude-review.yml:17-21, 38-44, 121` (Trigger, `if`, `gh pr checkout`).
- Problem:
  - Der Schutz gegen Fork-PRs gilt nur für das Event `pull_request`.
  - Beim Event `issue_comment` reicht der Text `@claude review` in einem PR-Kommentar. Danach läuft `gh pr checkout` auf den PR-Stand.
  - Der Job hat `pull-requests: write`, `issues: write`, `id-token: write` und Zugriff auf das Secret `CLAUDE_CODE_OAUTH_TOKEN`.
- Beleg: Workflow gelesen. Ob die eingesetzte Action (`anthropics/claude-code-action@v1`) selbst Schreibrechte des Auslösers verlangt, habe ich nicht geprüft. Bitte klären.
- Folge: Möglich sind Kosten durch fremde Auslöser und Prompt-Injection über fremden PR-Code. Der Agent darf nur lesen und kommentieren (siehe `--allowedTools`), das begrenzt den Schaden.
- Vorschlag:
  - Im `if` für `issue_comment` die Rolle prüfen (`github.event.comment.author_association` ist OWNER, MEMBER oder COLLABORATOR).
  - Und prüfen, dass der PR aus demselben Repo kommt.

### Niedrig

**N1. Doppelte Hilfsfunktion `walkParents` / `indexParents`**
- Dateien: `frontend/src/lib/graph/layoutRadial.ts:139-147` und `frontend/src/lib/tree/buildTree.ts:156-164`.
- Problem: Beide Funktionen sind Zeile für Zeile gleich. `BubbleGraph.tsx:159` rechnet die Zuordnung zusätzlich pro `root` selbst, obwohl `ViewerProvider` sie als `parents` schon liefert.
- Vorschlag: `walkParents` löschen, `indexParents` bzw. `useViewer().parents` nutzen.

**N2. Doppelte `escapeRegExp`**
- Dateien: `frontend/src/components/common/Highlighted.tsx:27-29` und `frontend/src/lib/classify/extractors/material.ts:15-17`.
- Vorschlag: eine Funktion in `lib/` (z. B. `lib/text.ts`) und beide importieren.

**N3. Doppelte Wortlisten zwischen Klassifizierung und Prüfregeln**

| Begriffe | Stelle 1 | Stelle 2 |
| --- | --- | --- |
| stundenlohn, regiearbeit, regiestunde | `classify/positionsart.ts:24-34` (`PERSONAL`) | `check/rules/vob.ts:61` (`STUNDENLOHN_WORTE`) |
| vorhalten, vorhaltung | `classify/positionsart.ts:52-60` (`NEBENLEISTUNG`) | `classify/rulesets/nonBauteil.ts:51` |
| statische berechnung, gutachten, bestandsaufnahme u. a. | `classify/positionsart.ts:36-50` (`PLANUNG`) | `classify/rulesets/nonBauteil.ts:29-35` (`PLANUNGSARTEN`) |
| Gutachten, Anlage | `classify/extractors/verweise.ts:26,39` | `check/rules/vob.ts:176` (`EXTERNE_VERWEISE`) |
| Winterbau | `classify/keywords.ts:24` (Besonderheit) | `classify/extractors/fristen.ts:34` (Zeitbezug) |

- Folge: Eine Anpassung an einer Stelle wird an der anderen vergessen. Beim Winterbau erscheint derselbe Begriff in zwei Attributen (`keywords` und `fristen`). Das ist eine Doppelanzeige, die ein Kommentar in `keywords.ts` für Normen ausdrücklich vermeiden will.
- Bewertet als niedrig: Die Listen dienen verschiedenen Zwecken. Eine gemeinsame Quelle pro Begriffsgruppe wäre trotzdem wartungsärmer.
- Nicht doppelt (geprüft): `classify/keywords.ts` (Besonderheiten je Position) und `graph/keywords.ts` (ein Anzeigewort pro Bubble aus dem Kurztext) haben nichts gemeinsam außer dem Namen. Zur Klarheit sollte `graph/keywords.ts` umbenannt werden, z. B. `bubbleLabel.ts`.

**N4. Wortliste `bestand` trifft Teilwörter**
- Status: **behoben** in 8913ec1 (#90). "Bestandteil" ist ausgenommen, Komposita treffen weiter. Test in `tests/classify/keywords.test.ts`. Der Beleg unten zeigt den Stand vor dem Fix.
- Datei: `frontend/src/lib/classify/keywords.ts:25` (und die Suche über `text.all.includes`, Zeile 38).
- Problem: Der Treffer ist ein Teilstring-Vergleich. "Bestandteile" setzt die Besonderheit "Bestand".
- Beleg (gemessen): Eingabe "Alle Bestandteile der Anlage" ergibt `["Bestand"]`.
- Vorschlag: Wortgrenze oder Wortliste enger fassen ("bestandsbauteil", "im bestand", "bestandsgebäude"). Test ergänzen.

**N5. Teilen-Link verwirft Fehler still**
- Dateien: `frontend/src/lib/share/urlState.ts:143-173`, `frontend/src/components/common/useShareLink.ts:50-57`.
- Problem: Ungültige Teile des Links (falsche Ansicht, unbekannte Facette, kaputte Prozent-Kodierung) und eine OZ, die in der Datei fehlt, fallen ohne Hinweis weg. Das ist im Code ausdrücklich so gewollt (Kommentar). Der Nutzer sieht aber nur, dass der Filter nicht greift.
- Beleg (gemessen): `#q=%` und `#v=nope~f.gewerk=%E0%A4%A~m=5,1~p=%` liefern den leeren Standardzustand, ohne Fehler (0 ms). Ein Fragment mit 100.000 Teilen braucht 9 ms, also kein Absturz.
- Gut: keine Fachtexte außer Suche, Facettenwerte und OZ im Link; Eingaben werden gegen feste Listen geprüft.
- Vorschlag: Ein Hinweis "Ein Teil des Links passt nicht zu dieser Datei und wurde ignoriert."

**N6. Leere oder falsche Datei: technische englische Detailtexte**
- Dateien: `frontend/src/lib/gaeb/parser.ts:70-80`, `frontend/src/lib/pipeline/messages.ts:42-43`.
- Problem: Der Parser hängt den Systemtext des XML-Parsers an. Dazu entsteht ein doppelter Punkt.
- Beleg (gemessen): Leere Datei ergibt `x.x83 ist kein wohlgeformtes XML: 1:0: document must contain a root element.. Die Datei ist beschädigt oder kein GAEB-DA-XML.` Der Text kommt aus jsdom; die Browser-Texte weichen ab (nicht gemessen).
- Vorschlag:
  - Leere Datei vorab erkennen: "Die Datei ist leer."
  - Systemtext nicht anzeigen oder hinten abgesetzt zeigen.
  - Den Punkt am Satzende vereinheitlichen.

**N7. Mehrere gedroppte Dateien: nur die erste, ohne Hinweis**
- Datei: `frontend/src/components/upload/FileDropzone.tsx:127` (`event.dataTransfer.files[0]`).
- Problem: Weitere Dateien werden verworfen. Mehrere Dateien sind laut Scope ausgeschlossen, ein Hinweis fehlt trotzdem.
- Vorschlag: Bei mehr als einer Datei die Meldung "Es wird immer nur eine Datei gelesen. Gelesen wurde: <Name>."
- Zusatz: Beim Drop wird `accept` (Dateiendung) nicht geprüft. Eine falsche Endung endet in der Parser-Meldung aus N6. Das ist akzeptabel.

**N8. Worker-Ausfall ohne Rückmeldung und ohne Zeitlimit**
- Datei: `frontend/src/lib/pipeline/loadLv.ts:50-72`.
- Problem:
  - Bei `worker.onerror` rechnet der Code still auf dem Haupt-Thread weiter. Das ist ein gewollter Fallback, der UI blockieren kann, aber nicht meldet.
  - `onmessageerror` fehlt.
  - Ein Zeitlimit gibt es nicht.
- Beleg: Code gelesen. Ein Worker-Absturz wurde nicht ausgelöst, weil der Test in jsdom keinen Worker hat.
- Vorschlag: `onmessageerror` wie `onerror` behandeln. Optional: Status "Berechnung läuft länger als üblich".

**N9. CI-Workflow ohne eigene Rechte-Angabe, Actions nur per Versions-Tag**
- Dateien: `.github/workflows/ci.yml` (kein `permissions`-Block), alle Workflows nutzen `@v4`/`@v1` statt festem Commit.
- Beleg: Dateien gelesen. Der Standard der Token-Rechte hängt von der Repo-Einstellung ab.
- Vorschlag: In `ci.yml` oben `permissions: contents: read`. Für Actions mit Schreibrechten (`JamesIves/github-pages-deploy-action`, `rossjrw/pr-preview-action`) auf Commit-Hash festlegen. Laut CLAUDE.md nur nach Rückfrage ändern.

**N10. Tests für Fehlerpfade fehlen**
- Jede der drei Exceptions hat einen auslösenden Test:
  - `GAEBVersionError`: `tests/gaeb/parser.test.ts:173`, `tests/pipeline/runPipeline.test.ts:40`
  - `GAEBParseError`: `tests/gaeb/parser.test.ts:177`
  - `GAEBValidationError`: `tests/gaeb/parser.test.ts:190`
- Es gibt keinen Test für:
  - `loadLv`/`LVLoadError` über den Worker-Pfad (nur `loadDemoLv` ist getestet, `tests/pipeline/loadDemoLv.test.ts:59`)
  - die Fehleranzeige in `FileDropzone` beim Drop
  - fehlschlagenden Download
- Vorschlag: Je ein Test zu M3, M4, N6. Der Test zu M1 existiert seit 8913ec1.

## Geprüft ohne Befund

- **XXE:** Externe Entität (`file:///etc/passwd`) ergibt `GAEBParseError: undefined entity` (gemessen, jsdom). Der Browser-`DOMParser` lädt keine externen Entitäten (Browser-Verhalten nicht selbst gemessen).
- **Entity-Bombe (10^10):** In jsdom in 3 ms verarbeitet, kein Hänger. Browser-Verhalten nicht gemessen.
- **XSS:** Kein `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `document.write` in `src`. `Highlighted.tsx` baut React-Knoten, keine HTML-Strings. `ReportDialog` und `PrintView` geben Text über React aus.
- **CSV-Formel-Injection:** `export/positions.ts` entschärft `= + - @ Tab CR` mit führendem Apostroph. Zahlen bleiben Zahlen (Zeile 97-110). `lib/csv.ts` ist nur der Leser der Referenzdaten.
- **Netzwerk und Storage:** Einziger `fetch` ist `loadDemoLv.ts:67` auf das eigene Bundle. Kein `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `localStorage`, `sessionStorage`, Cookie in `src`. `window.open` nur für Changelog und Issue-Link, jeweils mit `noopener,noreferrer`.
- **`export/issueLink.ts`:** Der Link enthält nur App-Version, Ansicht, "Datei geladen ja/nein", Browser, Sprache, Fenstergröße und den vom Nutzer getippten Text. Er öffnet das Formular im neuen Tab, nichts wird automatisch gesendet. Der Nutzer kann dort selbst Fachdaten eintippen; der Dialog weist darauf nicht ausdrücklich hin.
- **Filterlogik:** `matchPos.ts` ist die einzige Entscheidung (`matchFacts`). `palette/match.ts` bewertet nur Befehlstexte der Palette, `table/columns.ts` verwaltet nur Spalten. Die Palette nutzt für Positionen `matchFacts` (`CommandPalette.tsx:106`). Keine Dopplung.
- **Aggregation:** `index/summary.ts`, `overview/model.ts`, `graph/quantities.ts`, `export/positions.ts` rechnen auf dem flachen Index mit Float64-Spalten und liefern je eigene Ergebnisse. `singleUnit` wird von Graph und Matrix gemeinsam genutzt. Kleine Wiederholung: `canonicalUnit`-Gruppierung in `overview/model.ts` und `PrintView`. Kein Handlungsbedarf.
- **Virtualisierung:** Tabelle und Baum virtualisieren (`DataTable.tsx`, `flattenVisible.ts`). Die Matrix ist auf 14 Werte je Achse begrenzt (`MAX_AXIS_VALUES`, `matrix/model.ts:33`). Der Druck zeichnet erst bei `beforeprint`.
- **Beziehungen nur im Worker:** `buildRelations` läuft in `classifyAndBuild` (`runPipeline.ts`), nicht im Render. Ab 500 Positionen im Worker, darunter synchron auf dem Haupt-Thread.
- **Mehr Hooks:** `useJumpToPosition`, `useJumpToSimilar`, `useJumpToCheck` teilen die Rechnung über `lib/navigate/jump.ts`. Keine Dopplung.
- **Fehlerbehandlung:** Parser-Exceptions werden in `toPipelineError`/`describeFailure` auf deutsche Texte mit Handlungshinweis abgebildet (gemessen für Version, Struktur, XML-Fehler). `FileDropzone` zeigt sie mit `role="alert"`. Zwei `ErrorBoundary` (App, Ansicht). Zwischenablage-Fehler werden im Dialog angezeigt (`ReportDialog.tsx:67-77`). Leere Filterergebnisse haben in Tabelle, Baum, Matrix, Ähnlichkeit, Überblick und Graph eine Meldung. Keine Promise ohne `catch` gefunden (`void`-Aufrufe liegen in Funktionen mit eigenem `try/catch`).
- **Workflows:** `deploy-pages.yml` läuft nur bei `main` und manuell. `pr-preview.yml` schließt Fork-PRs aus. Das Review darf laut `--allowedTools` nur lesen und kommentieren.

## Nicht gemessen oder offen

- Echte Browserzeiten (Parsen, Rendern, Ansichtswechsel < 200 ms, Graph mit 10.000 Positionen).
- Verhalten des Browser-XML-Parsers bei Entity-Bombe und sehr tiefer Verschachtelung.
- Speicherbedarf bei Dateien über 5,4 MB.
- Ob die Claude-Action beim Kommentar-Auslöser Schreibrechte verlangt (M5).
