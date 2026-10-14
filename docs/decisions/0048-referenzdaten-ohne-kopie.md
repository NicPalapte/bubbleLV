# 0048 – Referenzdaten ohne Kopie im Frontend

- **Status:** akzeptiert
- **Datum:** 2026-10-14
- **Betrifft:** Referenzdateien unter `docs/domain/reference/`, Build

## Kontext

- Die gepflegten Tabellen (Prüfregeln, Einheiten, Hersteller, Materialien) lagen zweimal:
  unter `docs/domain/reference/` und als Kopie im Frontend.
- Ein Test verlangte, dass beide gleich sind.
- Der Owner bearbeitet die Tabellen in `docs/`. Die Kopie fehlte dann, CI wurde rot – dreimal
  in zwei Tagen.

## Entscheidung

- Die App liest die Tabellen **direkt** aus `docs/domain/reference/`.
- Vite bindet sie zur Build-Zeit als Text ein (Alias `@reference` in
  `frontend/vite.config.ts`). Kein Fetch, keine Kopie.
- Die Kopien unter `frontend/src/lib/check/data/` und
  `frontend/src/lib/classify/material/data/` sind gelöscht, der Gleichheits-Test auch.

## Folgen

- Eine Änderung in `docs/domain/reference/` wirkt beim nächsten Build in der App.
- Das Frontend baut nur noch im vollständigen Repo, nicht aus `frontend/` allein. Alle
  Workflows checken das ganze Repo aus.

## Verworfen

- **Kopie behalten, Kopieren per Skript:** ein Schritt mehr, den man vergessen kann.
- **Tabellen nur im Frontend:** der Owner sucht sie in `docs/`, dort stehen auch die
  Anleitungen.
