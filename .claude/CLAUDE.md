# Bubble – Coding Agent

## Projektbeschreibung
Webbasierte Bid-Management-App für Bauunternehmen. Bubble ergänzt **iTwo** als
Kalkulationssoftware – er ersetzt iTwo nicht, sondern übernimmt die Angebots­koordination
drum herum. Das MVP ist ein **LV-Viewer** auf einer **quellen-agnostischen** Datenbasis:
GAEB importieren, klassifizieren und das Leistungsverzeichnis als **Bubble-Graph** und
Tabelle einsehen, durchsuchen und filtern.

Vollständige Projekt-/Ordnerbeschreibung: @README.md
Scope: @docs/mvp-scope.md · Plan: @docs/implementation-plan.md
Architektur: @docs/architecture/backend.md · @docs/architecture/frontend.md · @docs/architecture/data-model.md

## Bash-Befehle
- `pytest tests/ -x --cov=app --cov-fail-under=80` – Backend-Tests
- `cd frontend && npm run dev` – Frontend im DevContainer (Proxy /api → FastAPI)

_Backend-Linting/Formatierung laufen automatisch via Claude Code Hook nach jedem
Edit/Write (`.claude/hooks/lint.sh`)._

## Stack
- **Backend:** Python 3.12 / FastAPI · PostgreSQL · SQLAlchemy 2.x + Alembic · Pydantic v2 · pytest + httpx
- **Frontend:** Vite · React · TypeScript · Tailwind (in `frontend/`)
- **Parsing:** pyGAEB, gekapselt hinter `PyGAEBAdapter`

## Architektur (nicht verhandelbar)
### Backend
- `router → service → repository → DB` – keine Logik in Routen
- Pydantic v2 für alle Schemas – kein `dict`-Return aus Endpunkten
- Alle DB-Operationen und Endpunkte sind `async`
- Alembic für alle Schema-Änderungen – nie `Base.metadata.create_all()` in Produktion
- `PyGAEBAdapter` ist die **einzige** Stelle mit `pyGAEB`-Abhängigkeit
  (`app/adapters/gaeb_adapter.py`); Exceptions nur `GAEBParseError`,
  `GAEBValidationError`, `GAEBVersionError`

### Quellen-agnostischer Schreibpfad (Kern)
- Der GAEB-Parser schreibt **nicht** direkt in die DB. Zwischenschritt ist das
  neutrale Schreibmodell `LVDraft` (`app/schemas/lv_draft.py`) – **ohne** GAEB-Begriffe.
- `LVRepository.persist_lv(project_id, draft: LVDraft)`. Das Repository importiert
  **nichts** aus `app.adapters` oder `pyGAEB`.
- Jede LV trägt `source_type` (`GAEB | MANUAL | EXCEL`) + `source_metadata` (JSONB).
- Klassifizierung läuft über das `LVDraft` **vor** der Persistenz und schreibt nach
  `Position.attributes` (JSONB) – quellenunabhängig.
- Klassifizierung liegt hinter `ClassifierProtocol` (`app/services/classification/`).
  MVP: `RuleBasedClassifier`; LLM später. Auswahl per `settings.CLASSIFIER` (`rule | llm`).
  Aufrufer importieren nur das Protocol/`get_classifier()`, nie eine konkrete Implementierung.
  Klassifizierung ist von Import entkoppelt (läuft auch als Re-Klassifizierungslauf).

### Frontend
- Daten kommen aus der API – **keine** Fixture-Daten, **kein** `localStorage` für Fachdaten
- `matchPos` ist die einzige Quelle für Filter-/Suchlogik
- Tree und Bubble-Graph konsumieren **denselben** rekursiven `LVNode`-Baum aus `/tree`

## Code-Style
- Type Hints überall – kein `Any` ohne Kommentar (Python); strikte Types (TS)
- Docstrings (Google-Style) für alle public functions und Klassen
- Logging via `structlog` – kein `print`
- Zeilenlänge ≤ 88 Zeichen (Python)

## Commits (Conventional Commits)
Vor jeder neuen Aufgabe prüfen, ob ein passender Branch aktiv ist. Falls `main` aktiv
ist, darauf hinweisen – keinen Branch selbst erstellen.

`feat|fix|refactor|test|chore|docs|perf(<scope>): <beschreibung>`
Scopes: `gaeb · lv · positions · db · api · classify · frontend`

## Tests
- Unit: Services/Repos mit gemocktem Adapter
- Integration: `PyGAEBAdapter` gegen echte GAEB-Fixtures unter `tests/fixtures/`
- API: `httpx.AsyncClient` gegen die FastAPI-App
- Jede eigene Exception hat mindestens einen Test, der den Fehlerfall auslöst

## MVP-Scope (ein Release, keine Phasen)
**In Scope:** GAEB-Import in quellen-agnostische DB · Klassifizierung Kurz-/Langtext ·
LV-Viewer (Tree + **Bubble-Graph** + Tabelle) · Suche · Facetten-Filter · Zuständigkeit.

**Out of Scope** (ablehnen / vertrösten): Analytik, Aufgaben, Notizen, Vergabepakete,
NU-Anfragen, Bieterfragen, Status-**Änderung**, Auth/SSO, Server-Volltext (`tsvector`),
Excel-/Manuell-Import, Multi-Tenant, GAEB-Export. Details → @docs/mvp-scope.md #out-of-scope

## Kritische Constraints
- Re-Import ist idempotent: OZ als natürlicher Schlüssel; `assignee_id` bleibt erhalten
- Bubble-Graph muss Richtung ~10k Positionen skalieren (Aggregate im `LVNode`, LOD, Culling)
- Status ist Default `OPEN` aus Import und nur Filter-Facette, nicht editierbar

## Antwortformat
Beginne jede neue Komponente mit einem kurzen Implementierungsplan (3–5 Punkte).
Kein Code mit Platzhaltern (`# TODO: implement`).
