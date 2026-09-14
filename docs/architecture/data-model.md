# Architektur — Datenmodell

> Wie die LV-Struktur im Browser gehalten wird — **unabhängig** davon, woher sie
> kommt. Das ist der Sinn hinter „quellen-agnostisch": ein Modell, potenziell mehrere
> Quellen (im MVP nur GAEB). **Keine Persistenz** — das Modell lebt ausschließlich im
> React-State einer Session.

## Überblick

```
LVDraft ──1:n── LotDraft ──1:n── SectionDraft ──(self 1:n)── SectionDraft
                                       │
                                       └──1:n── PositionDraft
```

Die Hierarchie (Los → Abschnitt → Position, Abschnitt selbst-verschachtelbar) ist
generisch. Nichts daran ist GAEB-spezifisch — GAEB ist im MVP die einzige Quelle,
aber das Modell erzwingt das nicht.

## Neutrales Zwischenmodell (`LVDraft`)

```ts
interface PositionDraft {
  oz: string;
  shortText: string;
  longText: string;
  unit: string | null;
  quantity: number | null;
  unitPrice: number | null;
  positionType: PositionType; // NORMAL | ALTERNATIV | BEDARF | ZULAGENPOSITION
  attributes: Record<string, unknown>; // aus classify() befüllt, siehe unten
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

Details zur Pipeline, die `LVDraft` erzeugt und klassifiziert, siehe
[`pipeline.md`](pipeline.md).

## `attributes` — Schema der Klassifizierung

Frei erweiterbar, aber mit vereinbarten Schlüsseln, damit die Facetten stabil sind.
Die Klassifizierung ist **mehrstufig** (siehe
[`pipeline.md`](pipeline.md#klassifizierung)); welche Keys neben `positionsart`
befüllt werden, hängt vom Ergebnis der vorherigen Stufe ab.

**Stufe 0 — für jede Position gesetzt:**

| Key | Typ | Beispiel | Facette |
|---|---|---|---|
| `positionsart` | `string` | `"bauteil"` | Positionsart (`bauteil \| personal \| planung \| baustelleneinrichtung \| nebenleistung \| sonstige`) |

**Für jede Position, sobald ein STLB-Bau-Leistungsbereich (LB) erkannt wurde** (Stufe 0,
siehe [`pipeline.md`](pipeline.md#klassifizierung)) —
unabhängig von `positionsart`, da z. B. auch `baustelleneinrichtung` ein eigener LB ist:

| Key | Typ | Beispiel | Facette |
|---|---|---|---|
| `gewerkLb` | `string \| null` | `"012"` | STLB-Bau-LB-Nummer (Ruleset-Key, normbasiert) |
| `gewerk` | `string \| null` | `"Beton- und Stahlbetonarbeiten"` | Gewerk (LB-Bezeichnung, Anzeigewert) |

Kein LB-Treffer (Referenzkatalog noch leer oder Text passt zu keinem LB) ⇒ beide Keys
`null`, `positionsart` kommt dann aus dem heuristischen Fallback statt aus dem LB.

**Nur wenn `positionsart === "bauteil"`:**

| Key | Typ | Beispiel | Facette | Gilt für |
|---|---|---|---|---|
| `bauteiltyp` | `string \| null` | `"Wand"` | Bauteiltyp | alle Bauteil-Positionen |
| `beton` | `string \| null` | `"C30/37"` | Betongüte | LB `Beton-/Stahlbetonarbeiten`; genormte Schreibweise auch im Fallback (s. u.) |
| `expo` | `string[]` | `["XC2","XD1"]` | Expositionsklasse | wie `beton` |
| `tragend` | `boolean \| null` | `true` | tragend/nichttragend | tragfähige Bauteiltypen |

Maße (`dicke`, `hoehe`, `laenge`, `gewicht`) standen bis WP-J hier; sie kommen
jetzt aus dem gewerkeunabhängigen Extraktor (s. u.) und gelten für jede Position.

**Nur wenn `positionsart !== "bauteil"`** — eigenes, kleineres Schema, **kein**
`bauteiltyp`/`gewerk`/`beton`/`tragend`; Keys kommen aus dem jeweiligen
Nicht-Bauteil-Ruleset (z. B. `PersonalRuleset`, `PlanungRuleset`), initial minimal
und inkrementell erweiterbar — nicht als vollständiges Schema vorab festgelegt.

**Für alle Positionen — gewerkeunabhängige Extraktoren** (`lib/classify/extractors/`,
laufen **vor** den Rulesets und werden von ihnen nur überschrieben, nie gelöscht):

| Key | Typ | Beispiel | Facette |
|---|---|---|---|
| `keywords` | `string[]` | `["WU-Beton","CEM III/A"]` | Besonderheiten |
| `normen` | `string[]` | `["DIN EN 206","VOB/C"]` | Normen |
| `material` | `string[]` | `["Stahlbeton"]` | Material |
| `fristen` | `string[]` | `["Winterbau","Termin"]` | Zeitbezug |
| `platzhalter` | `string[]` | `["Textergänzung"]` | Offene Stellen |
| `platzhalterAnzahl` | `number` | `2` | (Anzeige) |
| `verweise` | `string[]` | `["Positionsverweis","Anlage"]` | (Anzeige) |
| `dicke` · `hoehe` · `laenge` · `gewicht` | `string` | `"30 cm"` | (Anzeige) |

Zwei Regeln gelten für alle Extraktoren:

- **Geschlossenes Vokabular als Wert, Fundstelle als Beleg.** `fristen` enthält
  `"Winterbau"`, nicht den Satz, in dem es steht — sonst wäre jeder Wortlaut ein
  eigener Filterwert. Der Wortlaut steht im zugehörigen `Span`.
- **Kein Treffer ⇒ kein Key.** Ein leeres Array würde im Panel als Merkmal
  erscheinen, das es nicht gibt.

`material` wird **ausschließlich** aus der `keywords`-Spalte des
STLB-Bau-Katalogs gespeist. Solange die Spalte leer ist, liefert der Extraktor
nichts — der dokumentierte Zustand „Referenzdaten fehlen ⇒ Regel inaktiv, kein
Fehler". Eine hier erfundene Baustoffliste wäre eine ungeprüfte Aussage über die
Domäne.

Normverweise standen bis WP-J unter `keywords`; sie liegen jetzt in `normen`,
damit „DIN EN 206" nicht zweimal im Eigenschaften-Panel steht.

Welches `PropertyRuleset` (Bauteil-Positionen) bzw. Nicht-Bauteil-Ruleset zuständig ist,
entscheidet die `RulesetRegistry` im Klassifizierer — fehlt eine Zuordnung, liefert ein
Fallback-Extraktor Basis-Attribute statt eines Fehlers (siehe [`pipeline.md`](pipeline.md)).

**Basis-Attribute des Fallbacks** sind die genormten Kurzbezeichnungen nach
DIN EN 206 / DIN 1045-2 (`beton`, `expo`, `feuchtigkeitsklasse`). Letztere stehen wörtlich im Text und bedeuten in jedem Gewerk
dasselbe — sie ohne LB-Treffer zu verwerfen, würde die Facetten „Druckfestigkeit" und
„Exposition" für reale Dateien leer lassen. Alles **Interpretierende** — allen voran
`tragend` — bleibt dem gewerkespezifischen Ruleset vorbehalten und fehlt im Fallback
ganz (der Key wird nicht gesetzt, statt auf `null` zu stehen).

### `spans` — Textstellen zu jedem Merkmal

Zu jedem gefundenen Merkmal kommt die Fundstelle im Langtext:

```ts
interface Span {
  key: string;     // z. B. "beton", "normen"
  start: number;   // Zeichen-Index im Langtext
  end: number;
  label: string;   // Anzeigetext, z. B. "DIN EN 206"
}
```

Abgelegt unter `attributes._spans`. Wie `_meta` ist der Key **reserviert** und
taucht nie als Facette oder als Zeile im Eigenschaften-Panel auf. Ohne
Fundstelle fehlt der Key ganz.

**Die Indizes zeigen auf den Rohtext**, nicht auf die normalisierte Fassung aus
`lib/classify/text.ts`: die zieht Leerraum zusammen und verschiebt damit jeden
Index. Die Extraktoren arbeiten deshalb direkt auf `longText`, mit
groß-/kleinschreibungsunabhängigen Mustern.

Spans sind **überschneidungsfrei** (`extractors/spans.ts#mergeSpans`) — beim
Zeichnen darf jedes Zeichen nur einmal markiert werden. Ein Merkmal, das nur im
Kurztext steht, liefert seinen Wert, aber keinen Span.

### Einheiten im Filter

GAEB liefert die Einheit als freien Text (`<QU>`). Ein LV aus mehreren Teil-LVs
schreibt dieselbe Einheit deshalb oft verschieden. Der Filter führt zusammen,
was nur anders **geschrieben** ist — Groß-/Kleinschreibung, Leerraum,
hochgestellte Ziffern (`lib/units.ts`): `PSCH` = `psch`, `m³` = `m3`.

Inhaltliche Gruppen bleiben getrennt, bis sie jemand gepflegt hat: `Stk` und
`Stück`, `to` und `t`, `h` und `Std` sind Fachaussagen, keine Schreibweisen —
sie kommen mit WP-K aus einer Referenzliste. `lfm` und `m` bleiben dauerhaft
getrennt: das ist eine Abrechnungsart, keine Schreibweise.

**Nur der Filter führt zusammen.** Tabelle und Eigenschaften-Panel zeigen
weiter den Wortlaut aus der Datei.

Die **Werte** eines Facetten-Filters entstehen dynamisch aus dem geladenen LV
(wie im Design) — einen neuen Wert muss niemand eintragen. Welche Keys überhaupt
als Facette erscheinen, steht dagegen in `frontend/src/lib/facets.ts`: ein neuer
Key braucht dort eine Zeile, sonst bleibt er reine Anzeige im
Eigenschaften-Panel.

### Provenance

Damit nachvollziehbar bleibt, welcher Klassifizierer welches Ergebnis geliefert hat,
trägt `attributes` einen reservierten Meta-Block. Die Facetten-Keys bleiben flach,
`_meta` wird vom Frontend ignoriert:

```jsonc
{
  "positionsart": "bauteil",
  "gewerkLb": "012",
  "gewerk": "Beton- und Stahlbetonarbeiten",
  "bauteiltyp": "Wand",
  "beton": "C30/37",
  "expo": ["XC2", "XD1"],
  "tragend": true,
  "_meta": {
    "classifier": "rule",
    "ruleset": "012_wand",
    "version": 1,
    "confidence": 1.0
  }
}
```

`_meta.ruleset` hält fest, welches konkrete `PropertyRuleset` (oder `"fallback"`) die
Attribute geliefert hat — wichtig, um nachzuvollziehen, welche
Bauteiltyp/LB-Kombinationen noch keinen eigenen Ruleset haben.

## Re-Import in derselben Session

Ein erneutes Laden einer Datei ersetzt den kompletten Session-Zustand — es gibt keine
Idempotenz-Garantie über einen natürlichen Schlüssel (OZ) hinweg, weil nichts
persistiert wird, das erhalten bleiben müsste. Der Baum wird einfach neu aufgebaut.

## Warum das für den Viewer zählt

- `buildTree()` liefert einen **rekursiven `LVNode`-Baum**, den sowohl die linke
  Tree-Spalte als auch der Bubble-Graph konsumieren — ein Contract, zwei Ansichten,
  ohne Netzwerk-Roundtrip.
- Bubble-Größen kommen aus Knoten-Aggregaten (`positionCount`, `totalPrice`), einmal
  beim Baumaufbau berechnet → skaliert Richtung ~10k Positionen, ohne bei jedem
  Render alle Rohpositionen erneut zu traversieren.
- Weil Klassifizierung in `attributes` liegt und quellenunabhängig befüllt wird,
  funktionieren Filter und Hervorhebung identisch, unabhängig von der Quelle.

---

## WBSNode — zurückgestellt (setzt einen Server voraus)

> **Post-MVP, nicht Bestandteil des frontend-only MVP.** Das folgende Konzept stammt
> aus der ursprünglichen Backend-Planung (archiviert auf `archive/backend-mvp`) und
> beschreibt eine **serverseitige** Work-Breakdown-Spine für spätere Domänen-Daten
> (Notizen, Aufgaben, Termine, Vergabepakete, …). Es ist hier nur als Referenz
> dokumentiert, falls das Produkt später wieder um eine Server-Komponente erweitert
> wird — für das aktuelle Frontend-only-MVP ist es **nicht anwendbar**, da es
> Persistenz voraussetzt.

### Konzept (zurückgestellt)

`WBSNode` wäre eine eigenständige Server-Entität mit eigener Identität — ein
self-referenzieller Baum, unabhängig von der LV-Struktur:

| Feld | Typ | Zweck |
|---|---|---|
| `id` | UUID | eigene Identität |
| `parentId` | UUID, nullable | self-ref Baum |
| `kind` | Enum (`project \| lot \| section \| position \| …`) | Knotentyp |
| `code` | `string` | Kurzkennung (z. B. OZ, Los-/Abschnittsnummer) |
| `label` | `string \| null` | Anzeigename |
| `sortOrder` | `number` | Geschwister-Reihenfolge |
| `din276Kostengruppe` | `string \| null` | vorgesehener Attribut-Slot |

**Warum das einen Server braucht:** Notiz, Aufgabe, Termin, Vergabepaket usw. sollen
an einem stabilen Knoten hängen, der eine Session überlebt — das setzt Persistenz
voraus, die das aktuelle MVP bewusst nicht hat. Details zur langfristigen Vision:
[`vision.md`](../vision.md).

---

## Geplante Erweiterungen (Release 2 — „LV verstehen")

> Noch **nicht umgesetzt**. Hier steht, wohin das Modell wächst, damit neue Arbeit nicht
> daneben baut. Umsetzung: [`../implementation-plan.md`](../implementation-plan.md)
> (WP-K, WP-M) · Scope: [`../scope.md`](../scope.md). Umgesetzt und darum oben
> beschrieben: `PositionIndex` (WP-I) und `spans` (WP-J).

### `Flag` — Hinweise aus Prüfregeln (WP-K)

Prüf-Ergebnisse gehören **nicht** in `attributes` — sie sind keine Eigenschaft der
Position, sondern eine Bewertung. Eigene Liste, je Eintrag ein Verweis auf die Position:

```ts
interface Flag {
  id: string;                                        // Regel-ID, z. B. "V1"
  category: 'geld' | 'risiko' | 'norm' | 'frist' | 'vob';
  severity: 'hinweis' | 'beachten';
  ruleRef: string;                                   // z. B. "VOB/A § 7 Abs. 1 Nr. 4"
  positionId: string;
  span?: Span;
}
```

### `Cluster` — Beziehungen (WP-M)

```ts
interface Cluster {
  id: string;
  positionIds: string[];
  gemeinsameMerkmale: Record<string, unknown>;
  unterscheidendeMerkmale: string[];  // Keys, in denen sich die Mitglieder unterscheiden
  ausreisser: string[];               // positionIds mit auffälligem EP oder auffälliger Menge
}
```

Einmal beim Laden im Worker berechnet, danach unverändert im State — nicht im Render.
