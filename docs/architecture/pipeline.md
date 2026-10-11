# Architektur — Client-seitige Pipeline

> TypeScript, läuft vollständig im Browser. **Kein Server, keine DB.** Verbindliche
> Regeln stehen zusätzlich in [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md).

## Ablauf

```
Datei (Drag&Drop/Input)
    │  File.arrayBuffer()
    ▼
GaebParser         ← einzige Stelle mit GAEB-XML-Kenntnis
    │  → ParsedLV (TS)
    ▼
mapToLvDraft()
    │  → LVDraft (neutral, ohne GAEB-Vokabular)
    ▼
classify(draft)
    │  Positionsart → Extraktoren → Bauteiltyp → Ruleset
    │  → LVDraft mit befüllten position.attributes und _spans
    ▼
buildTree(draft)
    │  → LVNode-Baum
    ▼
summarize(buildPositionIndex(tree))
    │  → LVSummary (Facetten-Zähler, Wertebereiche) im LoadedLV
    ▼
buildRelations(index) · runChecks(index, summary, relations)
    │  → Cluster (Ähnlichkeit, Unterschiede, Ausreißer) und Hinweise im LoadedLV
    ▼
React State (Session-only)
    │  buildPositionIndex(tree) im Haupt-Thread
    ▼
PositionIndex (flache Rechenbasis für Filter, Summen, Beziehungen)
```

Es gibt keine Persistenzschicht. Jeder Schritt ist eine reine Funktion (oder eine
Klasse ohne Seiteneffekte außerhalb des eigenen Rückgabewerts); der gesamte Ablauf
läuft synchron oder — bei großen LVs — in einem Web Worker, damit die UI nicht
blockiert. Kein eigener Server: die Datei wird nirgendwohin geschickt. Statische
Fremd-Assets (Webfonts) sind davon unberührt — sie transportieren keine Nutzdaten.

### Wo der Worker ansetzt (und warum nicht früher)

`DOMParser` existiert laut HTML-Spezifikation nur im Window-Scope und ist in keinem
Browser im Worker verfügbar — der Parser-Schritt kann deshalb **nicht** in den Worker
wandern. Die Pipeline ist entsprechend geteilt (`frontend/src/lib/pipeline/`):

| Schritt | Läuft in | Warum |
|---|---|---|
| `parseToDraft` (Parser + `mapToLvDraft`) | Haupt-Thread | braucht `DOMParser`; nativer XML-Parser, entsprechend schnell |
| `classifyAndBuild` (Klassifizierung + `buildTree` + Aggregate + Beziehungen + Prüfregeln) | Web Worker ab ~500 Positionen | rechenintensiv: eine Regelauswertung je Position, danach je ein Durchlauf für Aggregate, Cluster und Hinweise |
| `buildPositionIndex` (flacher Positions-Index) | Haupt-Thread, nach dem Empfang | verweist auf die Baumknoten; Objektidentität überlebt `structuredClone` nicht |

`LVDraft` ist reines Datenmodell und damit `structuredClone`-fähig — der Übergang
über die Worker-Grenze braucht keine Serialisierungsschicht. Dasselbe gilt für die
Aggregate (`LVSummary`), die Cluster (`RelationResult`) und die Hinweise
(`CheckResult`): reine Zahlen, Namen und Knoten-IDs. Der Positions-Index geht bewusst
**nicht** über die Grenze, weil er Knotenverweise hält — siehe
[`decisions/0010`](../decisions/0010-positions-index-und-aggregate.md). Fehler werden auf einen
Code (`parse | validation | version | unknown`) abgebildet, weil Exception-Klassen
`structuredClone` nicht überleben. Ohne Worker (Tests, ältere Umgebungen) läuft
derselbe Code synchron weiter.

## GAEB-Parser-Grenze

```
GaebParser (Interface)
    └── XmlGaebParser        ← frontend/src/lib/gaeb/parser.ts  (einzige GAEB-XML-Kenntnis)
```

GAEB-XML-Elemente (`<GAEB>`, `<Award>`, `<BoQ>`, `<BoQBody>`, `<BoQCtgy>`, …) verlassen
die Adaptergrenze **nie**. Der Parser liefert ausschließlich eigene TS-Typen
(`ParsedLV` …). Fehler werden auf `GAEBParseError`, `GAEBValidationError`,
`GAEBVersionError` gemappt und von der UI angezeigt, nicht verschluckt.

Es gibt keine gleichwertige JS/TS-Bibliothek zu `pyGAEB` (die einzige spezialisierte
Alternative, AVACloud, ist ein Cloud-Dienst und schickt die Datei an einen fremden
Server — widerspricht dem "alles local"-Ziel). Der Parser wird deshalb selbst gebaut,
mit der Feldabdeckung des archivierten `PyGAEBAdapter` (`archive/backend-mvp`,
`app/adapters/gaeb_adapter.py`) als fachlicher Referenz, gegen die echten
GAEB-DA-XML-XSDs unter [`../GAEB-LV-Schema/`](../GAEB-LV-Schema/).

## Neutrales Zwischenmodell (`LVDraft`)

Direkt nach dem Parsen wird auf ein GAEB-freies Modell gemappt — falls je eine
weitere Quelle (Excel, manuelle Eingabe) hinzukommt, würde sie auf dasselbe Modell
mappen, ohne dass `buildTree`/`classify` sich ändern müssten (nicht Teil des MVP):

```ts
// frontend/src/types/lvDraft.ts
interface PositionDraft {
  oz: string;
  shortText: string;
  longText: string;
  unit: string | null;
  quantity: number | null;
  unitPrice: number | null;
  positionType: PositionType; // NORMAL | ALTERNATIV | BEDARF | ZULAGENPOSITION
  attributes: Record<string, unknown>; // aus classify() befüllt
}

interface SectionDraft {
  number: string;
  label: string | null;
  positions: PositionDraft[];
  sections: SectionDraft[]; // self-nestable
}

interface LotDraft {
  number: string;
  label: string | null;
  sections: SectionDraft[];
}

interface LVDraft {
  projectName: string | null;
  client: string | null;
  lots: LotDraft[];
}
```

**Regeln:**
- `buildTree(draft: LVDraft): LVNode` ist eine reine Funktion — kein Import aus
  `lib/gaeb/`.
- `mapToLvDraft()` lebt neben dem Parser und ist die einzige Stelle, die GAEB-Typen
  in `LVDraft` überführt.

## Klassifizierung

Die Klassifizierung liegt hinter einem stabilen TS-Interface, analog zur
GAEB-Adaptergrenze — austauschbar (regelbasiert heute, LLM potenziell später, aber
außerhalb dieses Repos, da ein LLM-Aufruf einen Server voraussetzt):

```ts
// frontend/src/lib/classify/types.ts
interface ClassificationResult {
  attributes: Record<string, unknown>;
  meta: ClassificationMeta; // classifier-id, ruleset-id, version, confidence
  spans: Span[];            // Fundstellen im Langtext (data-model.md#spans)
}

interface Classifier {
  classify(item: ClassifierInput): ClassificationResult; // synchron, deterministisch
}

interface ClassifierInput {
  oz: string;
  shortText: string;
  longText: string;
  unit: string | null;
}
```

- **Nur eine Implementierung im MVP:** `RuleBasedClassifier` (`src/lib/classify/ruleBased.ts`).
  Aufrufer importieren nur das `Classifier`-Interface/`getClassifier()`, nie die
  konkrete Klasse.
- **Läuft über `ClassifierInput`, nicht über die GAEB-Struktur** — entkoppelt vom
  Parser, damit später auch andere Quellen denselben Klassifizierer nutzen könnten.
- Ergebnis (`attributes` + `meta` + `spans`) landet in `PositionDraft.attributes`;
  Provenance- und Span-Konvention siehe [`data-model.md`](data-model.md).

### `RuleBasedClassifier` — Stufen hinter dem Interface

Nach außen bleibt `classify()` ein einziger Aufruf. Intern orchestriert er die
Stufen; ab Stufe 2 ist die eigentliche Eigenschafts-Extraktion **pluggable**, damit
neue Bauteiltypen und Materialien inkrementell hinzukommen, ohne den Klassifizierer selbst zu
ändern:

```
ClassifierInput
    │
    ▼
Stufe 0 — Positionsart       → attributes.positionsart (Stichworte/Einheit im Kurztext)
    │
    ▼
Extraktoren (WP-J)
    │   normen · masse · platzhalter · verweise · fristen
    │   → attributes + spans (Fundstellen im Langtext)
    │   Laufen **vor** jedem Ruleset; ein Ruleset darf ihre Werte überschreiben,
    │   aber keinen löschen.
    │
    ├── positionsart != "bauteil" ──► Nicht-Bauteil-Ruleset (per positionsart) ──► attributes
    │
    ▼ ("bauteil")
Stufe 1 — ObjectType         → attributes.bauteiltyp   ("Wand" | "Decke" | "Fundament" | …)
    │
    ▼
Stufe 2 — RulesetRegistry.resolveBauteil()
    │
    └── FallbackRuleset.extract(item) ──► genormte Kurzbezeichnungen (beton, expo, …)
```

**Die Extraktoren** (`src/lib/classify/extractors/`) liegen hinter demselben
Registry-Muster wie die Rulesets: ein Modul je Extraktor, eingetragen in
`extractors/index.ts`. Sie arbeiten auf dem **Rohtext** des Langtexts, weil ihre
Fundstellen Zeichen-Indizes darin sind; die normalisierte Fassung aus `text.ts`
dient nur dem Stichwortvergleich. Jeder liefert einen geschlossenen
Vokabularwert als Attribut und den Wortlaut als Span
([`data-model.md`](data-model.md#spans)).

**Kein Leistungsbereich** ([`decisions/0044`](../decisions/0044-leistungsbereich-entfernt.md)).
Bis 0.11 ordnete Stufe 0 jede Position über einen STLB-Katalog einem Leistungsbereich
(Gewerk) zu. Der Katalog hatte keine gepflegten Stichworte und lieferte fast nichts;
die Zuordnung ist entfernt. Materialwissen kommt künftig aus einer eigenen Tabelle je
Material.

**Identitäts- vs. Eigenschaftserkennung.** Positionsart (Fallback-Heuristik) und
Bauteiltyp werden ausschließlich aus dem **Kurztext** bestimmt. Deutsche LV-Langtexte
nennen regelmäßig Nachbarbauteile und Verweise („Ausführung mit geböschten Wänden" in
einer Erdarbeiten-Position, „Bodenklassen gemäß Gutachten"), die eine Erkennung über
den Langtext systematisch fehlleiten. **Eigenschaften** (Betongüte, Expositions-
klassen, Maße, Besonderheiten) stehen dagegen im Langtext und werden weiterhin dort
gesucht.

```ts
// frontend/src/lib/classify/rulesets/types.ts
interface PropertyRuleset {
  id: string; // landet als _meta.ruleset
  extract(context: RulesetContext): Record<string, unknown>;
}

interface NonBauteilRuleset extends PropertyRuleset {
  positionsart: Positionsart;
}
```

- **Registrierung ist additiv:** ein neues Nicht-Bauteil-Ruleset kommt als Modul +
  Eintrag in `createDefaultRegistry()` hinzu. Stufe 0–1 und das äußere
  `Classifier`-Interface bleiben unverändert.
- **Bauteile laufen über `FallbackRuleset`** (`resolveBauteil()`): genormte
  Kurzbezeichnungen, nichts Interpretierendes.
- **Nur `ruleBased.ts` kennt die Registry und einzelne Rulesets.** Aufrufer außerhalb
  des Pakets importieren weiterhin ausschließlich das `Classifier`-Interface.
- `meta.classifier = "rule"`, zusätzlich `meta.ruleset` (Ruleset-`id`, für Bauteile
  `"fallback"`), `meta.confidence = 1.0` (deterministisch).

**LLM (potenziell später, außerhalb dieses Repos):** ein LLM-Klassifizierer würde
denselben `Classifier`-Interface implementieren, benötigt aber einen Server für den
Modellaufruf — mit "kein Server im MVP" nicht vereinbar. Kein Platzhalter-Code dafür
in diesem Repo, solange das gilt.

## In-Memory-Baum (ersetzt die frühere Read-API)

`buildTree(draft: LVDraft): LVNode` ersetzt den früher geplanten `GET /tree`-Endpunkt
durch eine reine Funktion — ein Contract für linke Tree-Spalte **und** Bubble-Graph:

```ts
// frontend/src/types/lvNode.ts
interface LVNode {
  id: string;
  kind: "project" | "lot" | "section" | "position";
  code: string; // OZ bzw. Los-/Abschnittsnummer
  label: string | null;
  positionCount: number; // Aggregat für Größenmodus "Anzahl"
  totalPrice: number; // Aggregat für Größenmodus "Gesamtpreis"
  children: LVNode[];
  position: PositionSummary | null; // nur auf kind === "position"
}
```

Die Aggregate (`positionCount`, `totalPrice`) werden beim Baumaufbau bottom-up
berechnet, damit der Graph Bubble-Größen ohne erneutes Durchlaufen aller
Rohpositionen bestimmen kann (Skalierung Richtung ~10k Positionen).

## Fehlerbehandlung

`GAEBParseError`/`GAEBValidationError`/`GAEBVersionError` werden in der
Upload-Komponente gefangen und als Fehlermeldung angezeigt (z. B. Version nicht
unterstützt). Keine `console.log`-Debugging-Ausgaben im produktiven Pfad.

Regeln für die Meldungen (`lib/pipeline/messages.ts`):

- **Immer Deutsch, nie Systemtext.** Der Text eines `<parsererror>` oder eines
  unerwarteten Fehlers („Maximum call stack size exceeded") steht nicht in der Meldung;
  bei unerwarteten Fehlern erscheint immer `UNEXPECTED_FAILURE`.
- **Fertiger Satz = `complete`.** Ein Fehler mit `complete: true` trägt schon seinen
  nächsten Schritt („Die Datei x.x83 ist leer.") und bleibt unverändert. Die
  Kennzeichnung steht im Fehler, nicht im letzten Zeichen des Texts. Alle anderen sind
  Bruchstücke und bekommen von `describeFailure` den Hinweis zu ihrer Fehlerart.
- **Die Ursache geht nicht verloren.** Bei unerwarteten Fehlern steht sie als Text in
  `PipelineFailure.detail` (übersteht die Worker-Grenze), hängt als `cause` am
  `LVLoadError` und geht mit `console.error` in die Konsole, wie bei einem Absturz
  (`ErrorBoundary`). In der Meldung steht sie nicht.
- **Vor dem Parsen geprüft** (`LVLoadError` aus `loadLv`): Dateityp (Endung `.x81`–`.x86`
  oder `.xml`) und Größe (`MAX_FILE_BYTES`), jeweils bevor die Datei gelesen wird.

**Hinweise** sind keine Fehler: das LV ist geladen, aber etwas lief anders als erwartet
(zweite Datei beim Drop ignoriert, Teile eines Teilen-Links passten nicht, Worker
ausgefallen und direkt weitergerechnet). Sie stehen in `ViewerState.notices` und
erscheinen in der schließbaren Hinweisleiste unter den Filtern (`NoticeBar`); ein neuer
Import oder „LV schließen" verwirft sie.

## Bewusst nicht im MVP

Zuständigkeit/Bearbeiter-Zuweisung — ohne Server/Persistenz kein sinnvoller Mehrwert
über einen Reload hinaus. LLM-Klassifizierung — setzt einen Server voraus. Jede Form
von Server-Volltext — Suche/Filter sind immer clientseitig. Details:
[`scope.md`](../scope.md#out-of-scope).
