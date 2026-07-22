# Bubble

Ein kostenloser LV-Viewer: GAEB-Leistungsverzeichnis importieren, automatisch
klassifizieren und als interaktiven Graph im Browser durchsuchen und filtern.

Die Besonderheit ist, dass sich das Leistungsverzeichnis interaktiv als Nodes in einem Browser anschauenlässt. 
Die Nodes lassen sich nach verschiedenen Attributen, Beziehungen und Größen anschauen, filtern und sortieren. 

Bubble ergänzt dabei **iTwo** als Kalkulationssoftware – er ersetzt iTwo nicht,
sondern übernimmt die Angebotskoordination drum herum.

## Datenmodell

Unter dem Viewer liegt eine quellen-agnostische Struktur: das Leistungsverzeichnis
ist eine von mehreren möglichen Quellen, die diese Struktur befüllt (Details:
[`docs/architecture/data-model.md`](docs/architecture/data-model.md)). Perspektivisch
ist das Rückgrat eine eigene Work-Breakdown-Struktur (WBSNode), an der weitere
Domänendaten hängen können – im MVP wird sie 1:1 aus der LV-Hierarchie erzeugt.

---

## Systemarchitektur

### Stack

| Schicht       | Technologie                                          |
|---------------|------------------------------------------------------|
| Backend       | Python 3.12 / FastAPI (async)                        |
| Datenbank     | PostgreSQL + SQLAlchemy 2.x + Alembic                |
| GAEB-Parsing  | `pyGAEB` – gekapselt hinter `PyGAEBAdapter`          |
| Auth          | JWT via `fastapi-users` (vorbereitet für Azure AD SSO)|
| Frontend      | React + Tailwind (separates Repository)              |
| Testing       | pytest + pytest-asyncio + httpx                      |
| Linting       | ruff + mypy                                          |

### Schichtenmodell

```
HTTP-Request
    │
    ▼
Router          ← nur HTTP-Layer, keine Logik
    │
    ▼
Service         ← Business-Logik
    │
    ▼
Repository      ← DB-Zugriff (Query-Layer)
    │
    ▼
PostgreSQL
```

Routen delegieren ausschließlich an den Service-Layer. Kein direkter
DB-Zugriff aus Routen oder Services – nur über das Repository.

### Projektstruktur

```
lv-manager/
├── .devcontainer/
    ├── devcontainer.json
    ├── docker-compose.yml    
├── app/
│   ├── main.py                  # FastAPI App, Router-Registration
│   ├── config.py                # Settings via pydantic-settings
│   ├── database.py              # Async SQLAlchemy Engine & Session
│   ├── adapters/
│   │   └── gaeb_adapter.py      # PyGAEBAdapter – einzige pyGAEB-Abhängigkeit
│   ├── models/                  # SQLAlchemy ORM Models
│   ├── schemas/                 # Pydantic v2 Request/Response Schemas
│   ├── routers/                 # FastAPI Router
│   ├── services/                # Business-Logik
│   ├── repositories/            # DB-Zugriff
│   └── core/
│       ├── auth.py              # JWT + SSO-Abstraktion
│       ├── exceptions.py        # GAEBParseError, GAEBValidationError, GAEBVersionError
│       ├── email.py
│       └── storage.py
├── alembic/                     # DB-Migrationen
├── tests/
│   ├── conftest.py
│   ├── fixtures/                # Echte GAEB DA XML-Testdateien
│   ├── unit/
│   ├── integration/
│   └── api/
├── .claude/
    ├── CLAUDE.md                # Coding-Agent-Instruktionen
│   ├── settings.json            # Claude Code Hook-Konfiguration
│   └── hooks/lint.sh            # Automatisches Linting nach jedem Edit/Write
├── docs/
│   └── mvp-scope.md             # Feature-Specs und Out-of-Scope-Liste              
├── pyproject.toml
```

### GAEB-Adapter-Pattern

`pyGAEB` ist eine junge Bibliothek – um Breaking Changes abzufangen, ist sie
vollständig hinter einem Adapter-Pattern gekapselt:

```
GAEBParserProtocol (ABC)
    └── PyGAEBAdapter   ← app/adapters/gaeb_adapter.py
```

`pyGAEB`-interne Typen verlassen die Adaptergrenze nie. Alle Methoden
geben ausschließlich eigene Pydantic-Modelle zurück. Ein Bibliothekswechsel
erfordert nur einen neuen Adapter – kein anderer Code wird berührt.

---

## MVP-Scope (Phase 1)

Der MVP umfasst drei Features. Alles andere ist bewusst ausgeschlossen –
Details und Phasenzuordnung siehe [`docs/mvp-scope.md`](docs/mvp-scope.md).

### F-01 · GAEB-Import & Parsing

GAEB DA XML-Dateien (Versionen 2.0–3.3) hochladen, parsen und strukturiert
in PostgreSQL persistieren. Ein Re-Import aktualisiert bestehende Positionen
anhand der **Ordnungszahl (OZ)** als natürlichem Schlüssel – manuell gesetzte
Status und Notizen bleiben dabei erhalten.

### F-02 · LV-Viewer

Das Leistungsverzeichnis hierarchisch (Los → Abschnitt → Position) durchsuchen
und einsehen. Volltextsuche über Kurz- und Langtext via PostgreSQL `tsvector`.
LVs mit 2000+ Positionen müssen initial unter 2 Sekunden laden.

### F-03 · Positionsmanagement

Status (`OPEN | IN_PROGRESS | REVIEW | DONE | BLOCKED`) und Zuständigkeit
pro Position setzen, Notizen hinterlegen, Fortschritt aggregiert abrufen.
Jede Statusänderung wird im Audit-Log protokolliert.

---

## Entwicklungsrichtlinien

Die vollständigen Vorgaben für den Coding-Agenten stehen in
[`CLAUDE.md`](CLAUDE.md). Kurzübersicht:

- **Async first** – alle DB-Operationen und Endpunkte sind `async`
- **Pydantic v2** für alle Schemas – kein `dict`-Return aus Endpunkten
- **Alembic** für alle Schema-Änderungen – nie `Base.metadata.create_all()` in Produktion
- **Conventional Commits** – `feat|fix|refactor|test|chore|docs|perf(<scope>): <beschreibung>`
- **Coverage** ≥ 80 % – `pytest tests/ -x --cov=app --cov-fail-under=80`
- **Linting** läuft automatisch via Claude Code Hook nach jedem Edit/Write

Vollständiges PRD: [Notion](https://www.notion.so/35a380b03be5817ba3d4f7a83474320a)

