# Architektur — Backend

> Python 3.12 · FastAPI · SQLAlchemy 2.x (async) · Alembic · PostgreSQL · Pydantic v2.
> Verbindliche Regeln stehen zusätzlich in [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md).

## Schichten

```
Router  →  Service  →  Repository  →  DB
(HTTP)     (Logik)     (Zugriff)     (PostgreSQL)
```

- **Keine Logik in Routern**, kein direkter DB-Zugriff aus Routern/Services.
- Alle Endpunkte und DB-Operationen sind `async`.
- Pydantic v2 für alle Request-/Response-Schemas — kein `dict`-Return aus Endpunkten.
- Schema-Änderungen ausschließlich über Alembic — nie `Base.metadata.create_all()` in Prod.

## GAEB-Adapter-Grenze

```
GAEBParserProtocol (Protocol)
    └── PyGAEBAdapter        ← app/adapters/gaeb_adapter.py  (einzige pyGAEB-Abhängigkeit)
```

`pyGAEB`-interne Typen verlassen die Adaptergrenze **nie**. Der Adapter liefert
ausschließlich eigene Pydantic-Modelle (`ParsedLV` …). Exceptions werden auf
`GAEBParseError`, `GAEBValidationError`, `GAEBVersionError` gemappt
(`app/core/exceptions.py`).

## Quellen-agnostischer Schreibpfad (Kern von WP-1)

Der GAEB-Parser schreibt **nicht** direkt in die DB. Zwischen Parser und Persistenz
liegt ein neutrales Schreibmodell:

```
GAEB-Datei ─► PyGAEBAdapter ─► ParsedLV ─┐
Excel        (später)                    ├─► LVDraft ─► classify ─► LVRepository.persist_lv ─► DB
manuell      (später)                    ┘   (neutral)  (Attribute)   (kennt keine Quelle)
```

**Neutrales Schreibmodell** (`app/schemas/lv_draft.py`), ohne GAEB-Vokabular:

```python
class PositionDraft(BaseModel):
    oz: str
    short_text: str
    long_text: str = ""
    unit: str | None = None
    quantity: float | None = None
    unit_price: float | None = None
    position_type: PositionType = PositionType.NORMAL
    attributes: dict[str, Any] = {}          # aus classify() befüllt

class SectionDraft(BaseModel):
    number: str
    label: str | None = None
    parent_number: str | None = None          # ein Level Verschachtelung
    positions: list[PositionDraft] = []
    sections: list["SectionDraft"] = []

class LotDraft(BaseModel):
    number: str
    label: str | None = None
    sections: list[SectionDraft] = []

class LVDraft(BaseModel):
    project_name: str | None = None
    client: str | None = None
    deadline: datetime | None = None
    source_type: SourceType                    # GAEB | MANUAL | EXCEL
    source_metadata: dict[str, Any] = {}       # z. B. {"gaeb_version": "3.3"}
    lots: list[LotDraft] = []
```

**Regeln:**
- `LVRepository.persist_lv(project_id: str, draft: LVDraft) -> LV`. Das Repository
  importiert nichts aus `app.adapters` oder `pyGAEB`.
- Der `GAEBImportService` mappt `ParsedLV → LVDraft` und ruft danach `classify` +
  `persist_lv`. Ein späterer `ExcelImportService`/`ManualLVService` erzeugt dasselbe
  `LVDraft` und nutzt exakt denselben Persistenzpfad — keine Repo-Änderung nötig.
- Idempotenz unverändert: OZ als natürlicher Schlüssel (`uq_position_lv_oz`),
  `on_conflict_do_update`. Manuelle Zuständigkeiten bleiben beim Re-Import erhalten.

## Klassifizierung (WP-2) — austauschbar (Regel ↔ LLM)

Die Klassifizierung liegt hinter einem **Protocol**, analog zur pyGAEB-Adaptergrenze.
So ist der regelbasierte Extraktor des MVP später gegen einen LLM-Klassifizierer
austauschbar (oder mit ihm kombinierbar) — ohne Änderung an Import, Persistenz oder API.

```python
# app/services/classification/base.py
class ClassificationResult(BaseModel):
    attributes: dict[str, Any] = {}          # beton, expo, tragend, dicke, hoehe, keywords
    meta: ClassificationMeta                  # classifier-id, version, confidence

class ClassifierProtocol(Protocol):
    async def classify(self, item: ClassifierInput) -> ClassificationResult: ...

class ClassifierInput(BaseModel):             # entkoppelt vom Persistenzmodell
    oz: str
    short_text: str
    long_text: str = ""
    unit: str | None = None
```

**Implementierungen:**

| Klasse | Status | Modul |
|---|---|---|
| `RuleBasedClassifier` | MVP | `app/services/classification/rule_based.py` |
| `LLMClassifier` | später (post-MVP) | `app/services/classification/llm.py` |

- **Auswahl per Config:** `settings.CLASSIFIER` (`rule \| llm`). Eine Factory
  `get_classifier()` liefert die aktive Implementierung; der Aufrufer kennt nur das Protocol.
- **Läuft über `ClassifierInput`, nicht über die DB** — damit der Klassifizierer sowohl
  beim Import (aus `PositionDraft`) als auch als **Re-Klassifizierungslauf** über bereits
  persistierte Positionen einsetzbar ist. Ein späterer Wechsel auf LLM erfordert **kein**
  Neu-Importieren des GAEB: `ReclassifyService` lädt Positionen → `ClassifierInput` →
  aktiver Classifier → `attributes` aktualisieren.
- **Async by design**, damit ein LLM-Aufruf (I/O-gebunden, batchbar) ohne Refactoring passt.
- Ergebnis (`attributes` + `meta`) landet in `Position.attributes`; Provenance-Konvention
  siehe [`data-model.md`](data-model.md).

**MVP (`RuleBasedClassifier`):** heuristische Extraktoren — Betongüte (`C\d\d/\d\d`),
Expositionsklassen (`X[CDFSA]\d`), tragend/nichttragend, Maße, Stichworte. `meta.classifier
= "rule"`, `meta.confidence = 1.0` (deterministisch). Bewusst unvollständig, erweiterbar.

**LLM (später, out of MVP scope):** prompt-basierte Extraktion desselben `attributes`-Schemas,
batched, mit `meta.confidence` je Ergebnis. Slot ist vorhanden; Anbindung ist ein
eigenes Post-MVP-Arbeitspaket (siehe [`implementation-plan.md`](../implementation-plan.md)).

## Read-API (WP-3)

Alle Responses sind Pydantic-Modelle; Feldnamen sind auf die Frontend-Types abgestimmt
(siehe [`frontend.md`](frontend.md)).

| Methode | Pfad | Zweck |
|---|---|---|
| `POST`  | `/api/projects/{project_id}/lv:import` | GAEB-Multipart-Upload → `LVImportResponse` |
| `GET`   | `/api/projects/{project_id}/tree`      | rekursiver `LVNode`-Baum (Tree **und** Graph) |
| `GET`   | `/api/positions/{position_id}`         | `PositionDetail` |
| `PATCH` | `/api/positions/{position_id}`         | nur `assignee_id` setzen |

**`LVNode` (rekursiv)** — ein Contract für linke Tree-Spalte und Bubble-Graph:

```python
class LVNode(BaseModel):
    id: str
    kind: Literal["project", "lot", "section", "position"]
    code: str                     # OZ bzw. Los-/Abschnittsnummer
    label: str | None = None
    position_count: int           # Aggregat für Größenmodus "Anzahl"
    total_price: float            # Aggregat für Größenmodus "Gesamtpreis"
    children: list["LVNode"] = []
    # nur auf kind == "position":
    position: PositionSummary | None = None
```

Die Aggregate (`position_count`, `total_price`) rechnet das Backend, damit der Graph
Bubble-Größen ohne alle Rohpositionen bestimmen kann (Skalierung Richtung ~10k Positionen).

## Fehlerbehandlung

GAEB-Exceptions werden im Router auf HTTP-Codes gemappt (z. B. Version nicht unterstützt
→ 422). Logging über `structlog`, kein `print`.

## Bewusst nicht im MVP

Server-Volltext (`tsvector`) — Filterung/Suche laufen im MVP clientseitig.
`Note`/`AuditLog`-Modelle dürfen bestehen bleiben, werden aber von keinem Endpunkt
bespielt. Auth/SSO bleibt nur abstrahiert, im lokalen Dev ohne Login.
