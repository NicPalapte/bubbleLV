# 0051 – Kein Status-Filter

- **Status:** akzeptiert
- **Datum:** 2026-10-15
- **Betrifft:** Filter (`frontend/src/lib/facets.ts`), Regel in `.claude/CLAUDE.md`

## Worum geht's

- Jede Position hat den Status „offen“ aus dem Import. Ändern lässt er sich nicht (Scope).
- Der Filter „Status“ hatte darum immer genau einen Wert. Er filterte nichts.

## Entscheidung

- Der Filter „Status“ fällt weg.
- Der Status bleibt als Anzeige in Positionskarte und Tabelle.

## Folgen

- Ein Filter weniger im Seitenfenster.
- Kommt später ein änderbarer Status, kommt der Filter mit ihm zurück.

## Verworfen

- **Filter behalten, bis der Status änderbar ist:** zeigt eine Wahl, die keine ist.
