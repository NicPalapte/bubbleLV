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
| `beton` | `string \| null` | `"C30/37"` | Betongüte | LB `Beton-/Stahlbetonarbeiten` |
| `expo` | `string[]` | `["XC2","XD1"]` | Expositionsklasse | LB `Beton-/Stahlbetonarbeiten` |
| `tragend` | `boolean \| null` | `true` | tragend/nichttragend | tragfähige Bauteiltypen |
| `dicke` | `string \| null` | `"30 cm"` | (Anzeige) | Ruleset-abhängig |
| `hoehe` | `string \| null` | `"3–4 m"` | (Anzeige) | Ruleset-abhängig |

**Nur wenn `positionsart !== "bauteil"`** — eigenes, kleineres Schema, **kein**
`bauteiltyp`/`gewerk`/`beton`/`tragend`; Keys kommen aus dem jeweiligen
Nicht-Bauteil-Ruleset (z. B. `PersonalRuleset`, `PlanungRuleset`), initial minimal
und inkrementell erweiterbar — nicht als vollständiges Schema vorab festgelegt.

**Für alle Positionen:**

| Key | Typ | Beispiel | Facette |
|---|---|---|---|
| `keywords` | `string[]` | `["WA-Beton","CEM III/A"]` | Besonderheiten |

Welches `PropertyRuleset` (Bauteil-Positionen) bzw. Nicht-Bauteil-Ruleset zuständig ist,
entscheidet die `RulesetRegistry` im Klassifizierer — fehlt eine Zuordnung, liefert ein
Fallback-Extraktor Basis-Attribute statt eines Fehlers (siehe [`pipeline.md`](pipeline.md)).

Facetten-Filter im Frontend werden **dynamisch aus den vorkommenden Werten** erzeugt
(wie im Design). Neue Klassifizierungs-Keys erscheinen automatisch, sobald ein
(neues) Ruleset sie liefert.

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
