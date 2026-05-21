# Bubble – Coding Agent

## Projektbeschreibung 
Webbasierte Bid-Management-App für Bauunternehmen. Bubble ergänzt
**iTwo** als Kalkulationssoftware – er ersetzt iTwo nicht, sondern übernimmt
die Angebotskoordination drum herum: GAEB-Dateien importieren, Leistungsverzeichnisse
strukturiert einsehen und den Bearbeitungsstand je Position nachverfolgen.

Eine vollständige Projektbeschreibung inkl. Architektur und Ordnerstruktur findst du in @README.md

## Bash-Befehle
- `pytest tests/ -x --cov=app --cov-fail-under=80` – Tests

_Linting und Formatierung laufen automatisch via Claude Code Hook nach jedem Edit/Write (`.claude/hooks/lint.sh`)._

## Stack
Python 3.12 / FastAPI · PostgreSQL · SQLAlchemy 2.x + Alembic · JWT (fastapi-users) · pytest + httpx

## Architektur (nicht verhandelbar)
- `router → service → repository → DB` – keine Logik in Routen
- Pydantic v2 für alle Schemas – kein `dict`-Return aus Endpunkten
- Alle DB-Operationen und Endpunkte sind `async`
- Alembic für alle Schema-Änderungen – nie `Base.metadata.create_all()` in Produktion
- `PyGAEBAdapter` ist die **einzige** Stelle mit `pyGAEB`-Abhängigkeit (`app/adapters/gaeb_adapter.py`)
  - Alle Methoden geben eigene Pydantic-Modelle zurück – `pyGAEB`-Typen dürfen die Adaptergrenze nie verlassen
  - Exceptions: nur `GAEBParseError`, `GAEBValidationError`, `GAEBVersionError` (→ `app/core/exceptions.py`)
- Auth-Schicht von Anfang an für Azure AD SSO abstrahieren (wird Phase 2)

## Code-Style
- Type Hints überall – kein `Any` ohne Kommentar
- Docstrings (Google-Style) für alle public functions und Klassen
- f-strings, PascalCase für Klassen, UPPER_SNAKE_CASE für Konstanten
- Logging via `structlog` – kein `print`
- Zeilenlänge ≤ 88 Zeichen

## Commits (Conventional Commits)
Vor jeder neuen Aufgabe prüfen ob ein passender Branch aktiv ist.
Falls main aktiv ist, darauf hinweisen – keinen Branch selbst erstellen.

`feat|fix|refactor|test|chore|docs|perf(<scope>): <beschreibung>`
Scopes: `gaeb · lv · positions · auth · db · api`

## Tests
- Unit: Services/Repos mit gemocktem Adapter
- Integration: `PyGAEBAdapter` gegen echte GAEB-Fixtures unter `tests/fixtures/`
- API: `httpx.AsyncClient` gegen FastAPI-App
- Jede eigene Exception hat mindestens einen Test der den Fehlerfall auslöst

## MVP-Scope (Phase 1)
Nur diese drei Features: **F-01 GAEB-Import · F-02 LV-Viewer · F-03 Positionsmanagement**
Details → @docs/mvp-scope.md

Alles andere ablehnen oder auf spätere Phase vertrösten (→ @docs/mvp-scope.md #out-of-scope).

## Kritische Constraints
- Re-Import ist idempotent: OZ als natürlicher Schlüssel, manuelle Status/Notizen bleiben erhalten
- LV mit 2000+ Positionen muss initial unter 2 Sekunden laden (Pagination + Index + `tsvector`)
- `PositionStatus`: `OPEN | IN_PROGRESS | REVIEW | DONE | BLOCKED` – jede Änderung ins Audit-Log

## Antwortformat
Beginne jede neue Komponente mit einem kurzen Implementierungsplan (3–5 Punkte).
Kein Code mit Platzhaltern (`# TODO: implement`). Abweichende Designentscheidungen explizit begründen.