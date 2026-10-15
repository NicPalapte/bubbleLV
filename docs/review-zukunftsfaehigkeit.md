# Review: Zukunftsfähigkeit des LV Viewers (Bubble)

Stand: 2026-10-14, Commit `037b4d3` (main, v0.15.1). Rein lesendes Review; geändert wurde
nur diese Datei.

**Ausgeführt:**

| Prüfung | Ergebnis |
|---|---|
| `npm ci` | ok |
| `npm test` (Vitest) | 76 Testdateien, 718 Tests, alle grün (68 s) |
| `npm run lint` | 0 Fehler, 4 Warnungen (`react-hooks/exhaustive-deps`, `react-refresh`) |
| `npm run typecheck` | ok |
| `npm run format:check` | ok |
| `npm run build` | ok, Haupt-Bundle 430 kB (136 kB gzip), Worker 37 kB |
| `npm audit` | 7 Meldungen (5 hoch, 2 mittel), **alle nur in Entwicklungs-Abhängigkeiten** (`braces`, `postcss-selector-parser` über Tailwind 3); `npm audit --omit=dev`: 0 |
| Testabdeckung | nicht messbar: `@vitest/coverage-v8` ist nicht installiert |

**Lesehilfe:** „Annahme" heißt: nicht im Code belegt, sondern aus Erfahrung geschlossen.
Pfade relativ zum Repo; `src/…` meint `frontend/src/…`.

---

## Überblick

- **Stack:** Vite 8 · React 19 · TypeScript 6 · Tailwind 3, alles in `frontend/`
  (`frontend/package.json`). Laufzeit-Abhängigkeiten nur React und zwei Schriften.
- **Architektur:** reine Browser-App, kein Server, keine Datenbank, kein Login
  (`.claude/CLAUDE.md`, `docs/architecture/pipeline.md`). ~19.500 Zeilen in `src`,
  ~10.800 in `tests`.
- **Datenfluss:** Datei per Dialog/Drag & Drop → Größen- und Typprüfung
  (`src/lib/pipeline/loadLv.ts`, `MAX_FILE_BYTES` = 50 MB) → `GaebParser` mit `DOMParser`
  im Haupt-Thread (`src/lib/gaeb/parser.ts`) → neutrales `LVDraft`
  (`src/lib/gaeb/mapToLvDraft.ts`) → im Web Worker ab 500 Positionen: Klassifizierung,
  `buildTree`, Index, Aggregate, Beziehungen, Prüfregeln
  (`src/lib/pipeline/runPipeline.ts`, `classifyAndBuild`) → React-State
  (`src/state/ViewerProvider.tsx`) → Graph, Seitenfenster, Positionskarte, Tabelle.
- **GAEB-Parser:** `src/lib/gaeb/` (einzige Stelle mit GAEB-Wissen).
- **Speicherung:** nur IndexedDB im Browser: zuletzt geöffnete eigene Datei als
  Original-Bytes plus Markierungen/Kommentare (`src/lib/persist/lastLv.ts`,
  Entscheidungen 0046/0047). Sonst nichts, keine Requests mit Fachdaten.
- **Deploy:** GitHub Actions baut `main` und schreibt in den Branch `gh-pages`
  (`.github/workflows/deploy-pages.yml`); Ausspielung über GitHub Pages
  (`https://nicpalapte.github.io/bubbleLV/` laut `docs/setup/ci-und-agenten.md`).
  PR-Vorschauen auf Zuruf (`pr-preview.yml`), CI bei jedem PR (`ci.yml`).

---

## Prüfergebnisse A–H

### A. Launch-Reife

| Prüfpunkt | Status | Beleg | Begründung |
|---|---|---|---|
| Verarbeitung im Browser ohne Upload | erfüllt | `src/lib/pipeline/loadLv.ts` (Kopfkommentar „Kein Netzwerk-Request"); einziges `fetch` in `src/lib/pipeline/loadDemoLv.ts:67` lädt nur die gebündelte Demo-Datei | Kein XHR, `sendBeacon`, WebSocket gefunden. Schriften selbst gehostet (`src/main.tsx`). |
| Impressum / Datenschutz | **fehlt** | `src/components/layout/AboutMenu.tsx:223-224` (`wert="folgt"`), Kommentar Z. 218 verweist auf Issues #75/#76 | Für ein öffentliches Angebot in Deutschland nötig (Annahme zur Rechtslage, keine Rechtsberatung). |
| Datensparsame Analytics | fehlt (bewusst) | `docs/decisions/0017-keine-nutzungsmessung.md`; kein Analytics-Code gefunden | Bewusste Entscheidung. Steht aber gegen das Launch-Ziel „Bedarf testen". |
| Messbare Kennzahlen (wiederkehrende Nutzer, geöffnete Dateien, Funktionen) | **fehlt** | wie oben | Ohne Messung ist der Bedarfstest nur über Rückmeldungen möglich. GitHub Pages liefert keine Zugriffsstatistik (Annahme). |
| Feedback-Möglichkeit | erfüllt | `src/components/report/ReportDialog.tsx` (Kopieren, `mailto:`, GitHub-Issue), Inhalt aus `src/lib/export/issueLink.ts` (`umgebung()`: Version, Ansicht, Browser – keine Dateiinhalte) | Gut gelöst. Abweichung: Entscheidung 0024 sagt „mailto ohne Empfänger", der Code setzt inzwischen eine Kontaktadresse (`meldeMail()` in `issueLink.ts`). Doku veraltet. |
| Verständliche Fehlermeldungen bei defekten Dateien | erfüllt | `src/lib/pipeline/messages.ts` (`describeFailure`), `src/lib/gaeb/parser.ts` (leere Datei, kein XML, falsche Version mit Liste der unterstützten), Dateityp/Größe vorab in `loadLv.ts` | Deutsch, mit nächstem Schritt. Kleine Schwäche: einige Texte nennen XML-Tags („`<BoQ>` fehlt"). |
| Absturzverhalten | erfüllt | `src/components/common/ErrorBoundary.tsx`, eingebunden in `src/App.tsx` und `src/pages/ViewerPage.tsx` (Entscheidung 0026) | Geladenes LV überlebt einen Absturz der Ansicht. |
| Echte Projekt-/Firmendaten im Repo und in der Historie | erfüllt (mit Hinweis) | GAEB-Dateien: `src/assets/demo/*.x83/.x84`, `frontend/tests/fixtures/*.x83`; Historie per `git log --all --diff-filter=A` geprüft, keine gelöschten Datendateien | BVBS-Musterdatei (öffentlich) und synthetische Dateien („Muster AG", „Stadt Musterhausen"). Die BVBS-Datei enthält Telefonnummer und E-Mail **des Verbands** (keine Privatperson). Kein echtes Projekt erkennbar. |

### B. Sicherheit und Robustheit

| Prüfpunkt | Status | Beleg | Begründung |
|---|---|---|---|
| XML: externe Entitäten (XXE) | erfüllt | `src/lib/gaeb/parser.ts:66` (`DOMParser`, `application/xml`); `docs/reviews/2026-10-02-code-review.md` | Browser-`DOMParser` lädt keine externen Entitäten (Annahme auf Basis des Browser-Verhaltens, im Repo nicht getestet). |
| XML: Entitäts-Bombe („Billion Laughs") | nicht beurteilbar | kein Test in `frontend/tests/gaeb/` gefunden | Schutz hängt vom Browser ab. Fehlt: ein Test im echten Browser (Chrome, Firefox, Safari). |
| XML: riesige / tief verschachtelte Dateien | teilweise | `MAX_FILE_BYTES` 50 MB (`loadLv.ts:46`), `MAX_SECTION_DEPTH = 100` (`parser.ts:209`) | Grenzen vorhanden. Aber: Parsen läuft im Haupt-Thread, eine 50-MB-Datei blockiert die Oberfläche; kein Timeout für den Worker (`classifyInWorker` in `loadLv.ts`). |
| Sichere Darstellung (XSS) | erfüllt | kein `dangerouslySetInnerHTML`/`innerHTML`/`eval` in `src`; Texte als React-Textknoten (`src/components/common/Highlighted.tsx`); Zweitfenster per `createElement`/`textContent` (`src/components/common/externalWindowHost.ts`) | Langtext wird zu reinem Text reduziert (`src/lib/gaeb/text.ts`), es gelangt kein HTML aus der Datei in die Seite. |
| CSV-Export: Formel-Injection | erfüllt | `src/lib/export/positions.ts` (`FORMELSTART`, `entschaerfen()`) | Zellen mit `= + - @` werden entschärft. |
| Größen- und Performance-Grenzen | teilweise | `frontend/tests/perf/filter.test.ts` (10.000 synthetische Positionen, Filter < 100 ms) | Index und Filter gemessen. Nicht gemessen: XML-Parsen, Rendern, Graph mit 10k im echten Browser (auch im Review vom 02.10. als offen genannt). |
| Abhängigkeiten | teilweise | `npm audit`: 7 Meldungen nur in Dev-Abhängigkeiten, Laufzeit 0 | Kein Risiko für Nutzer, aber kein automatischer Audit in der CI, kein Dependabot (bewusst, Entscheidung 0041). |
| Lizenzen der Abhängigkeiten | erfüllt | Laufzeit: React/Scheduler MIT, Schriften OFL-1.1 (aus `package-lock.json`); `frontend/build/thirdPartyLicenses.ts` erzeugt `lizenzen.txt` | Sauber gelöst. |
| Geheimnisse im Code / in der Historie | erfüllt | kein Treffer für Schlüssel/Passwörter; einziges Workflow-Secret ist ein OAuth-Token für den Review-Agenten in `.github/workflows/claude-review.yml` (als Secret referenziert, nicht im Klartext) | `.env` steht in `.gitignore`. |
| Sicherheits-Header / CSP | **fehlt** | `frontend/index.html` ohne CSP-Meta; GitHub Pages erlaubt keine eigenen Header (Annahme zum Hosting) | Eine CSP per `<meta>` wäre möglich und billig (eigene Herkunft, keine Fremdskripte). |

### C. GAEB und Datenmodell

| Prüfpunkt | Status | Beleg | Begründung |
|---|---|---|---|
| Unterstützte Varianten und Phasen | teilweise | Versionen 3.0–3.3 (`parser.ts:25`, `SUPPORTED_VERSIONS`); Endungen x81–x86 und .xml (`src/lib/gaeb/extensions.ts`); Phase `DP` wird gelesen, aber nicht geprüft und in `mapToLvDraft` verworfen | GAEB 90 / 2000 und DA XML 2.x nicht unterstützt (bewusst, Issue #27). X31/X89 nicht vorgesehen. |
| Hierarchie Lose/Titel/Positionen | erfüllt | `parseCategory` (rekursiv), `hasLotLevel` in `parser.ts` | Lose, beliebig tiefe Bereiche, Positionen. |
| Unterpositionen | teilweise | `collectLongText` in `parser.ts` | `SubDescr` wird nur an den Langtext angehängt, nicht als eigenes Objekt. |
| Bedarfs-/Alternativ-/Pauschal-/Zuschlagspositionen | teilweise | `detectItemType` in `parser.ts`; Abbildung in `mapToLvDraft.ts` (`POSITION_TYPE_BY_ITEM_TYPE`) | Pauschal und Index werden zu `NORMAL` (Unterschied geht verloren). Bedarfs- und Wahlposition nicht getrennt. Zuordnung Grund-/Alternativposition (`ALNGroupNo`) geht verloren. |
| Hinweistexte, Vorbemerkungen, Ausführungsbeschreibungen | **fehlt** | kein Treffer für `Remark`, `PerfDescr`, `AddText`, `BoQPreamble` in `src/lib/gaeb/` | Werden still ignoriert. Für „jede Information zeigen" eine Lücke. |
| Stabile eindeutige Positions-IDs über Dateiversionen | teilweise | `IdFactory` in `src/lib/tree/buildTree.ts` (`position:<OZ>`, bei Dopplung `#2`); GAEB-Attribut `Item/@ID` wird nicht gelesen | Stabil, solange die OZ gleich bleibt. Bricht bei Umnummerierung, doppelter OZ (Reihenfolge entscheidet), leerer OZ (Index). Die GAEB-`ID` ist je Export meist neu (Annahme), also auch kein Ersatz. |
| Deep Links auf Positionen | teilweise | `src/lib/share/urlState.ts` (`p=<OZ>`), Auflösung `src/components/common/useShareLink.ts:57` (`find` erste passende OZ) | Funktioniert nur mit derselben Datei beim Empfänger; bei doppelter OZ trifft der Link immer die erste. |
| Mengen, Einheiten, Preise, Rundung | teilweise | `decimalByLocal` (`src/lib/gaeb/xml.ts`), `lineTotal` in `buildTree.ts` (Menge × EP neu gerechnet, fehlend = 0), `formatEuro` (`src/lib/format.ts`) | Gleitkomma statt Dezimalzahl; GP und Summen werden nicht aus der Datei (`IT`) übernommen, sondern neu gerechnet und erst bei der Anzeige gerundet. Währung fest „€" (`Cur` nicht gelesen). Für Ansicht ok, für Abrechnung nicht. |
| Langtexte und Formatierung | teilweise | `src/lib/gaeb/text.ts` | Absätze bleiben; Fett/Kursiv, Tabellen, Bilder und Textergänzungs-Kennungen gehen verloren. |
| LV-Stände und Änderungen (Nachträge) | **fehlt** | kein Versions- oder Diff-Konzept in `src`; `docs/architecture/data-model.md` „Re-Import in derselben Session" | Bewusst außerhalb des Scopes (`docs/scope.md`: keine mehreren Dateien). |
| Trennung Datenmodell / Darstellung | erfüllt | `src/lib` importiert kein React (grep); einzige Kopplung: `src/lib/navigate/jump.ts:8` (Typ aus `state/viewer`) | Parser → `LVDraft` → `LVNode` sauber getrennt. Kleinere DOM-Zugriffe in `lib/theme.ts`, `lib/export/download.ts`. |

### D. Erweiterbarkeit für Notizen, Markierungen, Anhänge, Aufgaben

| Prüfpunkt | Status | Beleg | Begründung |
|---|---|---|---|
| Anhängbarkeit an Positionen ohne Kernumbau | teilweise | `src/lib/annotations.ts` (`marked: Set<string>`, `notes: Map<string,string>`, Schlüssel = Knoten-ID) | Markierung und Kommentar hängen getrennt vom Kern an der ID – gutes Muster. Aber: nur ein Text je Position, keine Liste von Objekten, Schlüssel ist die instabile OZ-ID (siehe C). |
| Speicherkonzept und Datenverlust-Risiko | **teilweise / hohes Risiko** | `src/lib/persist/lastLv.ts`: genau ein Projekt; `saveLastLv` löscht die Notizen beim Öffnen einer anderen Datei (`store.delete(KEY_NOTES)`, Z. 167); Fehler werden geschluckt | Öffnet ein Nutzer eine zweite Datei, sind die Kommentare der ersten weg. Browser-Daten können vom Browser gelöscht werden (Annahme: ohne `navigator.storage.persist()`, kein Aufruf gefunden). Kein JSON-Export/-Import der Notizen. |
| Benutzer, Rollen, Rechte, Mehrbenutzer | fehlt | `docs/scope.md` (kein Login, nie Multi-Tenant) | Bewusst. Für Aufgabenzuweisung zwingend nötig. |
| Herkunft und Zeitstempel von Änderungen | fehlt | `toStored`/`fromStored` in `annotations.ts`: kein Autor, keine Zeit je Notiz; nur `meta.savedAt` je Datei | Für Nachweiskette und Nachträge zwingend. |
| Schema-Version / Migration der Speicherung | teilweise | IndexedDB-Version 1, `LEGACY_ID` in `lastLv.ts`, tolerante Prüfung in `fromStored` | Kein explizites Versionsfeld im gespeicherten Format. |
| Exporte | teilweise | CSV mit Markiert/Kommentar (`src/lib/export/positions.ts`), Markdown-Prüfbericht (`checkReport.ts`), Druck (`components/print/PrintView.tsx`) | Kein JSON, kein Excel; CSV enthält nur OZ, nicht die interne ID. |

### E. Weitere Domänen (Termine, Nachweiskette)

| Prüfpunkt | Status | Beleg | Begründung |
|---|---|---|---|
| Verknüpfungen als n:m | fehlt | `src/lib/relate/types.ts`: nur Cluster mit 1:1-Zuordnung (`clusterByPosition`); `docs/architecture/data-model.md` „WBSNode – zurückgestellt" | Konzept (WBSNode, typisierte Kanten) ist dokumentiert, aber nicht gebaut und an einen Server geknüpft. |
| Adapter-/Importer-Prinzip | teilweise | `GaebParser`-Interface und `getGaebParser()` (`src/lib/gaeb/`), neutrales `LVDraft` | Das Prinzip existiert für LV-Quellen. Es gibt aber keine allgemeine Importer-Schnittstelle für andere Datenarten (Termine, Fotos, Maschinendaten). |
| Speicherplan für Anhänge und große Datenmengen | fehlt | nur `lastLv.ts` | Kein Konzept für Dateien/Binärdaten. |
| Versionierung der Zuordnungen | fehlt | – | Keine Historie, kein Zeitstempel (siehe D). |

### F. Offener Kern und Codequalität

| Prüfpunkt | Status | Beleg | Begründung |
|---|---|---|---|
| Parser und Datenmodell als eigenständige Bibliothek | teilweise | `src/lib/gaeb/`, `src/types/lvDraft.ts`, `src/lib/tree/` ohne React | Fachlich getrennt, aber kein eigenes Paket, kein eigenes `package.json`, keine stabile API. Parser braucht `DOMParser` (läuft in Node nur mit jsdom o. ä.). |
| Tests mit synthetischen Dateien | erfüllt | 5 Fixtures in `frontend/tests/fixtures/`, Generator `frontend/tests/support/syntheticLv.ts`, 718 Tests grün | Gute Basis. |
| Testabdeckung | nicht beurteilbar | kein Coverage-Werkzeug installiert | Fehlt: `@vitest/coverage-v8` und ein Coverage-Lauf. Keine Ende-zu-Ende-Tests im echten Browser. |
| Struktur, README, Architekturdoku | erfüllt | `README.md`, `docs/architecture/*`, 46 Entscheidungen in `docs/decisions/` | Sehr gut dokumentiert. Kleine Altlasten: README-Projektbaum nennt `frontend/` „wird in WP-D angelegt"; Entscheidung 0024 veraltet (siehe A). |
| Lizenz im Hinblick auf Open Core | **fehlt** | `LICENSE` „Alle Rechte vorbehalten", `package.json` `"license": "UNLICENSED"` (Entscheidung 0036) | Ein offener Kern braucht eine offene Lizenz für den Kern. Abhängigkeiten (MIT, OFL, ISC) stehen dem nicht im Weg. |
| Reproduzierbarer Build | teilweise | `package-lock.json` + `npm ci` in allen Workflows; Node 22 nur in CI und Devcontainer, kein `engines`/`.nvmrc` | Bau-Zeitstempel in `vite.config.ts` macht den Build nicht bit-gleich (unkritisch). |
| CI | erfüllt | `.github/workflows/ci.yml`: Lint, Format, Typecheck, Test, Build | Deploy (`deploy-pages.yml`) testet, aber lintet/typcheckt nicht selbst (abgesichert über PR-CI). Fremd-Actions per SHA gepinnt. |
| Trennung Konfiguration / Code | erfüllt | nur `import.meta.env.BASE_URL/DEV/MODE`; Base-URL per `--base` im Workflow | Für eine Browser-App ausreichend. |

### G. Baustellentauglichkeit

| Prüfpunkt | Status | Beleg | Begründung |
|---|---|---|---|
| Tablet und Smartphone | **fehlt** | eine Layout-Media-Query (`src/index.css:801`, nur Startseite), 5 Tailwind-Breakpoints; Graph nur mit `onMouseDown`/Wheel (`src/components/graph/BubbleGraph.tsx`), keine Pointer-/Touch-Handler | Auf Touch-Geräten lässt sich der Graph nicht verschieben/zoomen. |
| Offline / schlechte Verbindung (PWA) | fehlt | kein Manifest, kein Service Worker (`frontend/index.html`, `vite.config.ts`) | Nach dem ersten Laden läuft die Verarbeitung lokal, ein erneuter Aufruf ohne Netz scheitert aber (Annahme: Browser-Cache allein reicht nicht zuverlässig). |
| Performance bei großen Dateien | teilweise | Worker ab 500 Positionen, flacher Index (`src/lib/index/positionIndex.ts`), Perf-Test 10k | Kern gemessen; XML-Parsen im Haupt-Thread und Rendern ungemessen. Auf schwachen Tablets nicht beurteilbar (fehlt: Messung auf Gerät). |
| Barrierefreiheit und Tastatur | teilweise | 126 `aria-*`-Attribute; Graph fokussierbar mit `aria-live` (`BubbleGraph.tsx`); Tastenkürzel (`src/components/layout/ShortcutsDialog.tsx`) | Gute Grundlage. Fehlt: `aria-modal`, Fokusfalle und Fokus-Rückgabe in Fenstern. Kein Audit mit Screenreader (nicht beurteilbar). |

### H. Betrieb und Kosten

| Prüfpunkt | Status | Beleg | Begründung |
|---|---|---|---|
| Hosting und laufende Kosten | erfüllt | GitHub Pages (`deploy-pages.yml`) | Statische Seite, 0 € bei wachsender Nutzung (Annahme: innerhalb der GitHub-Pages-Grenzen für Bandbreite). Abhängigkeit: Repo muss öffentlich bleiben (Entscheidung 0036). Keine eigene Domain (`CNAME` nicht gefunden). |
| Fehlerüberwachung | fehlt (bewusst) | Entscheidung 0017/0026; nichts wird automatisch gesendet | Fehler werden nur bekannt, wenn Nutzer sie melden. |
| Backups | nicht zutreffend / Risiko beim Nutzer | Daten nur in IndexedDB des Nutzers | Kein Server, also kein Backup nötig – aber Nutzer können ihre Notizen nicht sichern (siehe D). |
| Löschung von Daten, DSGVO-Support | teilweise | Löschen der letzten Datei auf der Startseite (`lastLv.ts`, Entscheidung 0046) | Technisch gut (keine Daten beim Betreiber). Fehlt: Datenschutzerklärung, die das erklärt; Umgang mit Meldungen per E-Mail/GitHub (enthalten Browserdaten) nicht beschrieben. |

---

## Top 10 Risiken und Lücken

Aufwand: **S** = Stunden bis 1 Tag · **M** = einige Tage · **L** = Wochen.

### Blocker vor dem Launch

1. **Impressum und Datenschutzerklärung fehlen** (`AboutMenu.tsx:223`). — **S**
   Betreiberangaben eintragen, eine kurze Datenschutzseite als statische Seite im Bundle:
   „Datei bleibt im Browser, IndexedDB speichert die letzte Datei, Meldungen per E-Mail/
   GitHub enthalten Browser-Angaben". Texte rechtlich prüfen lassen.
2. **Keine Kennzahlen für den Bedarfstest** (Entscheidung 0017). — **S–M**
   Entscheidung 0017 neu bewerten: cookieloses, selbst gehostetes oder EU-gehostetes
   Zählen (z. B. Seitenaufrufe + Ereignis „Datei geöffnet", „Funktion X genutzt", ohne
   Inhalte). Ohne das bleibt nur „Wie viele melden sich?". Alternative ohne Tracking:
   kurze freiwillige Umfrage im Logo-Menü.
3. **Datenverlust bei Notizen** (`lastLv.ts:167` löscht Notizen beim Öffnen einer
   anderen Datei; kein Export). — **S**
   Vor dem Überschreiben warnen, wenn Notizen existieren; Notizen als JSON exportieren/
   importieren (mit OZ, Kurztext, Datei-Prüfsumme); `navigator.storage.persist()`
   anfragen.

### Vor der Erweiterung nötig

4. **Positions-ID ist nur OZ + Reihenfolge** (`buildTree.ts`, `IdFactory`). — **M**
   Zweistufig: (a) inhaltliche ID pro Datei = OZ + Positionsart + Prüfsumme Kurztext,
   doppelte OZ als Prüfhinweis zeigen; (b) eine dauerhafte „Anker-ID" je Position, die
   beim Import einer neuen Fassung per Abgleich (OZ gleich → gleiche ID; sonst Kurztext/
   Einheit ähnlich → Vorschlag) übernommen wird. Alles, was anhängt, zeigt auf die
   Anker-ID, nie direkt auf die OZ.
5. **Kein Verknüpfungsmodell** (nur `annotations.ts` mit Map je Position). — **M**
   Ein allgemeines Kantenmodell `Link {id, von, nach, art, erstelltVon, erstelltAm,
   gültigAb/bis}` und Objekte `Notiz`, `Anhang`, `Aufgabe`, `Vorgang` als eigene
   Einträge. Markierung und Kommentar darauf umstellen.
6. **Keine Herkunft und keine Zeitstempel** (`annotations.ts`). — **S**
   Jedes Objekt bekommt `erstelltAm`, `geändertAm`, `quelle` (Datei/Import/Hand),
   später `autor`. Ohne das gibt es keine Nachweiskette.
7. **Lizenz „Alle Rechte vorbehalten" vs. offener Kern** (`LICENSE`, Entscheidung 0036). — **S**
   Vor dem Launch festlegen, welcher Teil offen wird (Vorschlag: Parser + Datenmodell
   unter MIT oder Apache-2.0, App bleibt geschützt). Später umzustellen ist möglich,
   aber Beiträge Dritter vorher verkomplizieren das.
8. **Parser verliert Informationen** (Hinweistexte/Vorbemerkungen, `ALNGroupNo`,
   Pauschal vs. Normal, `IT`, `Cur`, Formatierung; `parser.ts`, `mapToLvDraft.ts`). — **M**
   `LVDraft` um Textblöcke (Vorbemerkung, Hinweis), Gruppenzuordnung Alternative,
   Pauschal-Kennzeichen, Währung und Gesamtbeträge der Datei erweitern; GP aus Datei
   gegen Neuberechnung prüfen. Für Abrechnung Beträge als Dezimal (Cent-Ganzzahl).

### Später

9. **Keine Bedienung auf Tablet/Smartphone, kein Offline** (`BubbleGraph.tsx`,
   kein Service Worker). — **M–L**
   Pointer-Events + Pinch-Zoom im Graphen, Seitenfenster als Vollbild-Blatt auf kleinen
   Bildschirmen, PWA mit Service Worker für Offline-Start.
10. **Sicherheit/Robustheit im Browser nicht gemessen** (CSP fehlt, Entitäts-Bombe
    ungetestet, kein Worker-Timeout, Parsen im Haupt-Thread). — **S–M**
    CSP per `<meta>` (`default-src 'self'`), Browser-Tests (Playwright) mit Entitäts-Bombe
    und 50-MB-Datei, Abbruch-Knopf/Timeout für den Worker, Coverage-Lauf in der CI.

---

## Zielbild und Migrationsschritte

### Zielarchitektur in Worten

- **Kern-Bibliothek (offen):** `bubble-core` als eigenes Paket im selben Repo
  (Monorepo-Ordner `packages/core`). Inhalt: neutrales Datenmodell (`LVDraft`, Projekt,
  Los, Abschnitt, Position, Textblock), Importer-Schnittstelle, GAEB-Importer,
  Anker-ID-Abgleich, Verknüpfungsmodell, Serialisierung als JSON mit Schema-Version.
  Kein React, kein DOM außer einem austauschbaren XML-Leser.
- **Positions-IDs:** zwei Ebenen.
  - *Fundstelle* je Datei: `dateiPrüfsumme + OZ (+ #n)`. Belegt, woher etwas kommt.
  - *Anker-ID* (UUID) je fachlicher Position, über Dateifassungen hinweg. Abgleich beim
    Import einer neuen Fassung; unsichere Zuordnungen fragt die App nach.
- **Verknüpfungsmodell:** alles ist ein Objekt mit eigener ID (Position, Notiz, Anhang,
  Aufgabe, Vorgang, Foto, Messreihe). Beziehungen sind eigene Einträge (Kanten) mit Art,
  Herkunft, Zeitstempel und Gültigkeit – damit n:m und versionierbar. Das LV liefert das
  Ordnungsgerüst; Termine und Maschinendaten hängen per Kante daran. Das entspricht
  dem zurückgestellten `WBSNode`-Konzept (`docs/architecture/data-model.md`), aber
  zunächst ohne Server.
- **Speicherung:** Schicht `Store` mit einer Schnittstelle, zwei Umsetzungen:
  1. lokal (IndexedDB, mehrere Projekte, Export/Import als Projektdatei `.bubble.json`
     bzw. ZIP mit Anhängen),
  2. später Server/Sync (für Mehrbenutzer, Rechte, Aufgabenzuweisung, große Anhänge).
  Die Oberfläche spricht nur mit der Schnittstelle.
- **Importer für weitere Quellen:** gleiche Form wie `GaebParser`: `Importer.lies(datei)
  → neutrales Teilmodell + Fundstellen`. Beispiele: Terminplan (MS Project XML/CSV),
  Fotos (EXIF-Zeit/-Ort), Maschinendaten (CSV). Zuordnung zu Positionen als Vorschlag,
  bestätigt vom Nutzer, gespeichert als Kante.
- **Oberfläche:** bleibt wie heute ein Verbraucher von Kern + Store.

### Kleinste sinnvolle Abfolge

1. **Launch-Paket** (Blocker 1–3): Impressum/Datenschutz, Kennzahlen-Entscheidung,
   Notiz-Export und Warnung vor Überschreiben.
2. **Lizenz-Schnitt festlegen** (Punkt 7) – reine Entscheidung, kein Code.
3. **Projektdatei-Format** einführen: JSON mit Schema-Version, Datei-Prüfsumme,
   Notizen mit Zeitstempel. Dient zugleich als Export und Backup.
4. **Anker-ID** neben der heutigen Knoten-ID einführen; Notizen/Markierungen auf
   Anker-ID umziehen (Migration aus dem heutigen Speicherformat).
5. **Kantenmodell** im Kern: Markierung, Kommentar als erste Objektarten; danach
   Anhang (lokal als Blob in IndexedDB) und Aufgabe (ohne Zuweisung).
6. **Zweite Dateifassung desselben LV** laden und per Anker-ID abgleichen
   (Grundlage für Nachträge). Erfordert Scope-Änderung („mehrere Dateien").
7. **Kern als Paket herauslösen** (`packages/core`), offene Lizenz, eigene Tests.
8. **Terminplan-Importer** + Kante Position ↔ Vorgang.
9. **Server/Sync** erst, wenn Mehrbenutzer, Zuweisung oder große Anhänge gebraucht
   werden. Ab hier: Konten, Rechte, Backups, Fehlerüberwachung, DSGVO-Prozesse.

---

## Offene Fragen

1. **Messen oder nicht?** Ist ein cookieloses, inhaltsfreies Zählen für den Bedarfstest
   akzeptabel (dann Entscheidung 0017 ersetzen), oder soll der Test nur über Rückmeldungen
   laufen?
2. **Wer betreibt den öffentlichen Dienst?** Privatperson oder Firma – bestimmt
   Impressum, Haftung und ob eine eigene Domain nötig ist.
3. **Welcher Teil wird „offener Kern"** und unter welcher Lizenz? Bleibt die App selbst
   „alle Rechte vorbehalten"?
4. **Wie verlässlich ist die OZ in eurer Praxis?** Werden Positionen in Nachtrags-LVs
   umnummeriert, oder bleibt die OZ stabil und neue Positionen bekommen neue OZ? Davon
   hängt ab, wie aufwendig der Anker-ID-Abgleich sein muss.
5. **Ab wann Mehrbenutzer?** Ist Aufgabenzuweisung (Ziel 1) nur innerhalb einer Person
   gedacht, oder an Kollegen/NU? Letzteres setzt einen Server voraus.
6. **Welche Nachweiskette zuerst?** Welche Domäne (z. B. Erdbau, Beton) und welche
   Maschinendaten in welchem Format? Nötig, um Importer und Datenvolumen zu bewerten.
7. **Welche Terminplan-Quelle?** MS Project, Asta Powerproject, Excel, iTwo?
8. **Geräte auf der Baustelle:** Sollen Tablets nur lesen oder auch erfassen (Fotos,
   Notizen)? Bestimmt, wie früh Touch-Bedienung und Offline nötig sind.
9. **Müssen Hinweistexte/Vorbemerkungen** im Viewer erscheinen? Sie werden heute still
   verworfen.
10. **Wie lange müssen Notizen halten?** Reicht „im Browser, mit Export", oder ist ein
    Verlust beim Löschen der Browserdaten nicht hinnehmbar?
