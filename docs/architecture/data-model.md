# Architektur — Datenmodell

> Wie die LV-Struktur gespeichert wird — **unabhängig** davon, woher sie kommt.
> Das ist der Sinn hinter „source-agnostic": ein Schema, viele mögliche Quellen.

## Überblick

```
LV ──1:n── Lot ──1:n── Section ──(self 1:n via parent_id)── Section
 │                          │
 │                          └──1:n── Position ──1:n── (Note)        [Note im MVP ungenutzt]
 └──1:n── Position                         │
                                           └──1:n── (AuditLog)      [im MVP ungenutzt]
```

Die Hierarchie (Los → Abschnitt → Position, Abschnitt selbst-verschachtelbar) ist
generisch. Nichts daran ist GAEB-spezifisch — GAEB ist nur eine von mehreren möglichen
Quellen, die diese Struktur befüllen.

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

Frei erweiterbar, aber mit vereinbarten Schlüsseln, damit die Facetten stabil sind:

| Key | Typ | Beispiel | Facette |
|---|---|---|---|
| `beton` | `str \| null` | `"C30/37"` | Betongüte |
| `expo` | `list[str]` | `["XC2","XD1"]` | Expositionsklasse |
| `tragend` | `bool \| null` | `true` | tragend/nichttragend |
| `dicke` | `str \| null` | `"30 cm"` | (Anzeige) |
| `hoehe` | `str \| null` | `"3–4 m"` | (Anzeige) |
| `keywords` | `list[str]` | `["WA-Beton","CEM III/A"]` | Besonderheiten |

Facetten-Filter im Frontend werden **dynamisch aus den vorkommenden Werten** erzeugt
(wie im Design). Neue Klassifizierungs-Keys erscheinen automatisch, sobald der Extraktor
sie liefert — ohne Schema-Migration.

### Provenance (vorbereitet für LLM)

Damit später Regel- und LLM-Klassifizierung nachvollziehbar nebeneinander existieren
können, trägt `attributes` einen reservierten Meta-Block. Die Facetten-Keys bleiben flach,
`_meta` wird vom Frontend ignoriert:

```jsonc
{
  "beton": "C30/37",
  "expo": ["XC2", "XD1"],
  "tragend": true,
  "_meta": { "classifier": "rule", "version": 1, "confidence": 1.0, "at": "2026-…" }
}
```

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
