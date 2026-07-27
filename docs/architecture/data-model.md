# Architektur — Datenmodell

> Wie die LV-Struktur gespeichert wird — **unabhängig** davon, woher sie kommt.
> Das ist der Sinn hinter „source-agnostic": ein Schema, viele mögliche Quellen.

## Überblick

```
LV ──1:n── Lot ──1:n── Section ──(self 1:n via parent_id)── Section
 │                          │
 │                          └──1:n── Position    [Note im MVP ungenutzt]
 └──1:n── Position                               [AuditLog im MVP ungenutzt]
```

Die Hierarchie (Los → Abschnitt → Position, Abschnitt selbst-verschachtelbar) ist
generisch. Nichts daran ist GAEB-spezifisch — GAEB ist nur eine von mehreren möglichen
Quellen, die diese Struktur befüllen.

`Note`/`AuditLog` hängen konzeptionell **nicht** an `Position`, sondern ab Schritt 2
der Roadmap ([`vision.md`](../vision.md)) am `WBSNode` — siehe
[Attach-Point](#wbsnode--universelle-work-breakdown-spine) weiter unten.

## Quellen-agnostische Felder (WP-1)

**`LV`** bekommt eine Herkunfts-Markierung, statt GAEB-Details als First-Class-Spalten:

```python
class SourceType(enum.StrEnum):
    GAEB = "GAEB"
    MANUAL = "MANUAL"
    EXCEL = "EXCEL"

# neu auf LV:
source_type:     Mapped[SourceType]                    # Pflicht
source_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)  # z. B. {"gaeb_version": "3.3"}
```

`gaeb_version` wandert von der Spalte in `source_metadata` — die Kern-Tabelle bleibt
frei von quellenspezifischem Ballast.

**`Position`** bekommt ein flexibles Merkmalsfeld für die Klassifizierung:

```python
# neu auf Position:
attributes: Mapped[dict] = mapped_column(JSONB, default=dict)
```

`assignee_id` (Zuständigkeit) und `status` existieren bereits. `status` bleibt im MVP
Default `OPEN` (aus Import) und ist nur Filter-Facette, nicht editierbar.

## `attributes` — Schema der Klassifizierung

Frei erweiterbar, aber mit vereinbarten Schlüsseln, damit die Facetten stabil sind.
Die Klassifizierung ist **mehrstufig** (siehe
[`architecture/backend.md`](backend.md#klassifizierung-wp-2--austauschbar-regel--llm-mehrstufig-erweiterbar));
welche Keys neben `positionsart` befüllt werden, hängt vom Ergebnis der vorherigen Stufe ab.

**Stufe 0 — für jede Position gesetzt:**

| Key | Typ | Beispiel | Facette |
|---|---|---|---|
| `positionsart` | `str` | `"bauteil"` | Positionsart (`bauteil \| personal \| planung \| baustelleneinrichtung \| nebenleistung \| sonstige`) |

**Nur wenn `positionsart == "bauteil"`:**

| Key | Typ | Beispiel | Facette | Gilt für |
|---|---|---|---|---|
| `bauteiltyp` | `str \| null` | `"Wand"` | Bauteiltyp | alle Bauteil-Positionen |
| `gewerk` | `str \| null` | `"Ortbeton"` | Gewerk/Material | alle Bauteil-Positionen |
| `beton` | `str \| null` | `"C30/37"` | Betongüte | Gewerk `Ortbeton`/`Fertigteil` |
| `expo` | `list[str]` | `["XC2","XD1"]` | Expositionsklasse | Gewerk `Ortbeton`/`Fertigteil` |
| `tragend` | `bool \| null` | `true` | tragend/nichttragend | tragfähige Bauteiltypen |
| `dicke` | `str \| null` | `"30 cm"` | (Anzeige) | Ruleset-abhängig |
| `hoehe` | `str \| null` | `"3–4 m"` | (Anzeige) | Ruleset-abhängig |

**Nur wenn `positionsart != "bauteil"`** — eigenes, kleineres Schema, **kein**
`bauteiltyp`/`gewerk`/`beton`/`tragend`; Keys kommen aus dem jeweiligen
Nicht-Bauteil-Ruleset (z. B. `PersonalRuleset`, `PlanungRuleset`), initial minimal
und inkrementell erweiterbar — nicht als vollständiges Schema vorab festgelegt.

**Für alle Positionen:**

| Key | Typ | Beispiel | Facette |
|---|---|---|---|
| `keywords` | `list[str]` | `["WA-Beton","CEM III/A"]` | Besonderheiten |

Welches `PropertyRuleset` (Bauteil-Positionen) bzw. Nicht-Bauteil-Ruleset zuständig ist,
entscheidet die `RulesetRegistry` im Klassifizierer — fehlt eine Zuordnung, liefert ein
Fallback-Extraktor Basis-Attribute statt eines Fehlers (siehe
[`architecture/backend.md`](backend.md)).

Facetten-Filter im Frontend werden **dynamisch aus den vorkommenden Werten** erzeugt
(wie im Design). Neue Klassifizierungs-Keys erscheinen automatisch, sobald ein
(neues) Ruleset sie liefert — ohne Schema-Migration.

### Provenance (vorbereitet für LLM)

Damit später Regel- und LLM-Klassifizierung nachvollziehbar nebeneinander existieren
können, trägt `attributes` einen reservierten Meta-Block. Die Facetten-Keys bleiben flach,
`_meta` wird vom Frontend ignoriert:

```jsonc
{
  "positionsart": "bauteil",
  "bauteiltyp": "Wand",
  "gewerk": "Ortbeton",
  "beton": "C30/37",
  "expo": ["XC2", "XD1"],
  "tragend": true,
  "_meta": {
    "classifier": "rule",
    "ruleset": "ortbeton_wand",
    "version": 1,
    "confidence": 1.0,
    "at": "2026-…"
  }
}
```

`_meta.ruleset` hält fest, welches konkrete `PropertyRuleset` (oder `"fallback"`) die
Attribute geliefert hat — wichtig, um später nachzuvollziehen, welche
Bauteiltyp/Gewerk-Kombinationen noch keinen eigenen Ruleset haben.

Das kostet **keine** zusätzliche Migration im MVP (steckt im vorhandenen `attributes`-JSONB).
Sollte später feinere Abfragbarkeit nötig werden, können `classified_by` / `classified_at`
als eigene Spalten nachgezogen werden — bewusst erst dann.

### Re-Klassifizierung ohne Neu-Import

Klassifizierung ist von Import **entkoppelt**: sie läuft über `ClassifierInput`
(Kurz-/Langtext), nicht über GAEB. Ein Wechsel des Klassifizierers (z. B. Regel → LLM)
aktualisiert nur `Position.attributes` über einen Re-Klassifizierungslauf — die persistierte
LV-Struktur und alle Zuständigkeiten bleiben unangetastet.

## Idempotenz & Re-Import

- Natürlicher Schlüssel: `UniqueConstraint("lv_id", "oz")` (`uq_position_lv_oz`).
- `persist_lv` nutzt `on_conflict_do_update`: fachliche Felder (Texte, Menge, EP,
  `attributes`, Zuordnung zum Abschnitt) werden aktualisiert.
- **Nicht** überschrieben beim Re-Import: `assignee_id` und (falls je genutzt) `status`.
- `LV` ist über `project_id` eindeutig; Re-Import derselben `project_id` aktualisiert
  denselben Datensatz.

## Warum das für den Viewer zählt

- Der `/tree`-Endpunkt liefert einen **rekursiven `LVNode`-Baum**, den sowohl die linke
  Tree-Spalte als auch der Bubble-Graph konsumieren — ein Contract, zwei Ansichten.
- Bubble-Größen kommen aus Knoten-Aggregaten (`position_count`, `total_price`), nicht aus
  dem Nachladen aller Rohpositionen → skaliert Richtung ~10k Positionen.
- Weil Klassifizierung in `attributes` liegt und quellenunabhängig befüllt wird,
  funktionieren Filter und Hervorhebung identisch, egal ob die LV aus GAEB, Excel oder
  manueller Eingabe stammt.

## Migration (Alembic)

Eine Migration für: `LV.source_type`, `LV.source_metadata`, `Position.attributes`, und das
Entfernen/Umziehen von `LV.gaeb_version` nach `source_metadata`. Bestehende Datensätze
(falls vorhanden) auf `source_type='GAEB'` backfillen.

---

## WBSNode — universelle Work-Breakdown-Spine

> **Spec, kein DDL/ORM.** Die WBSNode-Implementierung (Modell, Migration, Umstellung
> der Domänen-Entitäten) ist ein eigenes, späteres Arbeitspaket:
> [`.claude/commands/wp-wbs.md`](../../.claude/commands/wp-wbs.md). Hier wird nur das
> Konzept festgehalten, gegen das schon jetzt entworfen wird.

### Konzept

`WBSNode` ist eine eigenständige Entität mit eigener Identität — ein self-referenzieller
Baum, unabhängig von der LV-Tabelle:

| Feld | Typ | Zweck |
|---|---|---|
| `id` | UUID | eigene Identität |
| `parent_id` | UUID, nullable | self-ref Baum |
| `kind` | Enum (`project \| lot \| section \| position \| …`) | Knotentyp |
| `code` | `str` | Kurzkennung (z. B. OZ, Los-/Abschnittsnummer) |
| `label` | `str \| null` | Anzeigename |
| `sort_order` | `int` | Geschwister-Reihenfolge |
| `project_id` | FK | Projekt-Scope |
| `din276_kostengruppe` | `str \| null` | vorgesehener Attribut-Slot, **im MVP ungenutzt** |

### MVP-Mapping: LV ist eine Projektion auf die WBS

Im MVP erzeugt der Import pro LV-Struktur-/Positionsknoten **genau einen** WBSNode
(1:1) — jedes Los, jeder Abschnitt, jede Position bekommt einen korrespondierenden
`WBSNode`. Die LV-Position behält ihre eigene Abrechnungs-Identität (OZ, Menge, EP,
`attributes`) und verweist per FK auf ihren `WBSNode`. Damit ist das LV **eine
Projektion** auf die WBS, nicht umgekehrt: die WBS ist das Rückgrat, das LV eine von
mehreren möglichen Sichten darauf.

**Attach-Point für Domänen-Entitäten ist `wbs_node_id`, nicht `position_id`.** Notiz,
Aufgabe, später Termin, Vergabepaket usw. hängen am WBSNode — das gilt auch dann, wenn
der Knoten (im MVP) 1:1 einer LV-Position entspricht.

### WBS ≠ LV

- **LV** ist die Abrechnungs-/Preisstruktur: OZ, Menge, Einheitspreis, Vertragslogik.
- **WBS** ist die Leistungs-/Ergebnisstruktur: was geleistet werden muss, unabhängig
  davon, wie es abgerechnet wird.

Im MVP fallen beide 1:1 zusammen, das ist aber ein Spezialfall. Später ist eine
n:m-Zuordnung vorgesehen (ein WBSNode ↔ mehrere LV-Positionen, oder eine Position →
mehrere Arbeitspaket-Knoten), z. B. über eine Mapping-Tabelle `wbs_node_position`.
Dieser Pfad bleibt offen, wird aber **jetzt nicht gebaut**.

### Erweiterungsregel (Invariante)

> **Am Bau existieren mehrere legitime Zerlegungen gleichzeitig, n:m zueinander:**
> LV/OZ · WBS/Arbeitspakete · DIN-276-Kosten · Ort/Bauteil/Geschoss · Gewerk/STLB ·
> Organisation/Firma · IFC-Objekt · Zeit/Vorgang.
>
> Es gibt daher bewusst **keinen einzigen Baum, der alle Informationen enthält.**
> Die WBS ist ein **privilegierter Anker**, kein Universalbehälter.
>
> Neue Informationsarten werden **entweder**
> - als Attribut/Kante an einen bestehenden Knoten gehängt, **oder**
> - als neuer Knotentyp mit typisierter Kante zur WBS eingeführt.
>
> Das Rückgrat wird **nie umgebaut, um neue Information aufzunehmen** — Erweiterung
> erfolgt durch Beziehung, nicht durch Strukturänderung. Ziel ist eine
> **erweiterbare**, keine **vollständige** Struktur.

Diese Regel gilt für jede künftige Entität (Notiz, Aufgabe, Termin, Vergabepaket, …):
Pflicht-FK auf `WBSNode`, siehe [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md#architektur-nicht-verhandelbar).
Kein Domänen-Objekt bleibt ohne diesen Anker.
