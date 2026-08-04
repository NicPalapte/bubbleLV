# Architektur — Client-seitige Pipeline

> TypeScript, läuft vollständig im Browser. **Kein Server, keine DB.** Verbindliche
> Regeln stehen zusätzlich in [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md).

## Ablauf

```
Datei (Drag&Drop/Input)
    │  FileReader
    ▼
GaebParser         ← einzige Stelle mit GAEB-XML-Kenntnis
    │  → ParsedLV (TS)
    ▼
mapToLvDraft()
    │  → LVDraft (neutral, ohne GAEB-Vokabular)
    ▼
classify(draft)
    │  → LVDraft mit befüllten position.attributes
    ▼
buildTree(draft)
    │  → LVNode-Baum
    ▼
React State (Session-only)
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
| `classifyAndBuild` (Klassifizierung + `buildTree`) | Web Worker ab ~500 Positionen | rechenintensiv: eine Regelauswertung je Position |

`LVDraft` ist reines Datenmodell und damit `structuredClone`-fähig — der Übergang
über die Worker-Grenze braucht keine Serialisierungsschicht. Fehler werden auf einen
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
- Ergebnis (`attributes` + `meta`) landet in `PositionDraft.attributes`; Provenance-
  Konvention siehe [`data-model.md`](data-model.md).

### `RuleBasedClassifier` — dreistufige Pipeline hinter dem Interface

Nach außen bleibt `classify()` ein einziger Aufruf. Intern orchestriert er drei
Stufen; ab Stufe 2 ist die eigentliche Eigenschafts-Extraktion **pluggable**, damit
neue Bauteiltypen/Gewerke inkrementell hinzukommen, ohne den Klassifizierer selbst zu
ändern:

```
ClassifierInput
    │
    ▼
Stufe 0 — StlbMatch          → attributes.gewerk_lb    (LB-Nummer, z. B. "012")
    │                          attributes.gewerk        (LB-Bezeichnung, Katalog-Anzeigewert)
    │                          attributes.positionsart   (aus LB-Katalog: positionsart_default,
    │                                                     falls der LB eindeutig nicht-physisch ist,
    │                                                     sonst vorläufig "bauteil")
    │
    ├── kein LB-Treffer ──► Fallback: heuristische Positionsart-Erkennung (Stichworte/
    │                       Einheit) ──► attributes.positionsart, gewerk*=null
    │
    ├── positionsart != "bauteil" ──► Nicht-Bauteil-Ruleset (per positionsart) ──► attributes
    │
    ▼ ("bauteil")
Stufe 1 — ObjectType         → attributes.bauteiltyp   ("Wand" | "Decke" | "Fundament" | …)
    │
    ▼
Stufe 2 — RulesetRegistry.resolve(bauteiltyp, gewerk_lb)
    │
    ├── Ruleset gefunden ──► Ruleset.extract(item)   ──► spezifische Attribute (z. B. beton, expo, tragend)
    └── kein Ruleset       ──► FallbackRuleset.extract(item) ──► Basis-Attribute (Maße, Stichworte)
```

**Stufe 0 (`StlbMatch`)** matcht `shortText`/`longText` gegen die vom Maintainer
gepflegte Referenztabelle
[`domain/reference/stlb-bau-leistungsbereiche.csv`](../domain/reference/stlb-bau-leistungsbereiche.csv)
(Spalten: `lb_nummer`, `lb_bezeichnung`, `positionsart_default`, `keywords`,
`quelle_version` — Format/Herkunft siehe
[`domain/README.md`](../domain/README.md#stlb-bau-leistungsbereiche-als-primäre-klassifizierungsquelle-wp-2)).
Die Datei wird als Build-Time-Asset eingebunden (`?raw`-Import, kein `fetch` — die App
löst zur Laufzeit keine Netzwerk-Requests aus), nicht in TS hartkodiert. Solange die
CSV keine echten Zeilen enthält, matcht Stufe 0 nie und **jede** Position läuft über
den Fallback-Pfad — kein Fehler, keine erfundenen LB-Nummern. Zur aktuell leeren
`keywords`-Spalte und der daraus abgeleiteten Notlösung siehe
[`domain/README.md`](../domain/README.md#stlb-bau-leistungsbereiche-als-primäre-klassifizierungsquelle-wp-2).

**Identitäts- vs. Eigenschaftserkennung.** Positionsart (Fallback-Heuristik) und
Bauteiltyp werden ausschließlich aus dem **Kurztext** bestimmt. Deutsche LV-Langtexte
nennen regelmäßig Nachbarbauteile und Verweise („Ausführung mit geböschten Wänden" in
einer Erdarbeiten-Position, „Bodenklassen gemäß Gutachten"), die eine Erkennung über
den Langtext systematisch fehlleiten. **Eigenschaften** (Betongüte, Expositions-
klassen, Maße, Besonderheiten) stehen dagegen im Langtext und werden weiterhin dort
gesucht.

```ts
// frontend/src/lib/classify/rulesets/types.ts
interface RulesetKey {
  bauteiltyp: string;
  gewerkLb: string; // STLB-Bau-LB-Nummer, nicht die Freitext-Bezeichnung
}

interface PropertyRuleset {
  key: RulesetKey;
  extract(item: ClassifierInput): Record<string, unknown>;
}

class RulesetRegistry {
  register(ruleset: PropertyRuleset): void {}
  resolve(bauteiltyp: string, gewerkLb: string): PropertyRuleset {
    // exakter Treffer, sonst FallbackRuleset
    throw new Error("not implemented");
  }
}
```

- **Registrierung ist additiv:** ein neuer LB kommt als neue Zeile in der
  Referenz-CSV + neues `PropertyRuleset`-Modul + `registry.register(...)` hinzu.
  Bestehende Rulesets, Stufe 0–1 und das äußere `Classifier`-Interface bleiben
  unverändert.
- **Ruleset-Key ist die LB-Nummer, nicht die LB-Bezeichnung** — Bezeichnungen können
  sich zwischen Katalogversionen ändern, die Nummer bleibt stabil.
- **Kein Fehler bei fehlendem Ruleset:** `resolve()` fällt auf `FallbackRuleset`
  zurück (nur Maße/Stichworte).
- **Nur `ruleBased.ts` kennt die Registry und einzelne Rulesets.** Aufrufer außerhalb
  des Pakets importieren weiterhin ausschließlich das `Classifier`-Interface.
- `meta.classifier = "rule"`, zusätzlich `meta.ruleset` (aufgelöster Ruleset-Key oder
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

## Bewusst nicht im MVP

Zuständigkeit/Bearbeiter-Zuweisung — ohne Server/Persistenz kein sinnvoller Mehrwert
über einen Reload hinaus. LLM-Klassifizierung — setzt einen Server voraus. Jede Form
von Server-Volltext — Suche/Filter sind immer clientseitig. Details:
[`mvp-scope.md`](../mvp-scope.md#out-of-scope).
