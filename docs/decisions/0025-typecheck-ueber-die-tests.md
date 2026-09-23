# 0025 – Typecheck läuft auch über die Tests

- **Status:** akzeptiert
- **Datum:** 2026-09-23
- **Betrifft:** CI, `frontend/tsconfig*.json`, `.github/workflows/ci.yml`

## Worum geht's

Der TypeScript-Compiler hat bisher nur `frontend/src` und `vite.config.ts` geprüft.
Der Ordner `frontend/tests` stand in keiner `tsconfig` — dort lief nie ein Typecheck.
Vitest führt Tests aus, ohne die Typen zu prüfen: ein Test durfte eine Funktion mit
zu wenig Argumenten aufrufen und trotzdem grün sein.

## Entscheidung

- Neue Datei `frontend/tsconfig.test.json` (erbt von `tsconfig.app.json`,
  `include: ["tests"]`, zusätzlich die Typen von `vitest/globals` und Node).
- `frontend/tsconfig.json` verweist jetzt auf drei Projekte: App, Node, Tests.
- Neues Skript `npm run typecheck` (`tsc -b`) prüft alle drei.
- Neuer CI-Schritt **Typecheck** vor dem Test-Schritt.
- `npm run build` prüft weiter nur die App (`tsc -b tsconfig.app.json`) und baut sie.
  Ein Typfehler in einem Test soll den Build nicht abbrechen — er soll im
  Typecheck-Schritt auffallen, der genau so heißt.

## Warum

- Ein Test ist nur so viel wert wie die Zusage, die er prüft. Ruft er die geprüfte
  Funktion falsch auf, prüft er etwas anderes als die App tut — und niemand merkt es.
- Gefunden hat das der erste Lauf: `tests/graph/scale.test.ts` rief
  `sizeModeById(...).get(node)` mit einem Argument auf, die Signatur verlangt zwei
  (`get(node, quantities)`). In JavaScript ist das fehlende Argument `undefined`,
  der Test lief durch.
- Eigene `tsconfig` statt `tests` in `tsconfig.app.json`: die Test-Typen
  (`vitest/globals`, Node) gehören nicht in den App-Code. Stünden sie dort, dürfte
  eine Datei unter `src` `node:fs` importieren, ohne dass der Compiler klagt — im
  Browser wäre das ein Fehler zur Laufzeit.

## Verworfene Alternativen

- **`tests` in `tsconfig.app.json` aufnehmen** – schleppt Node- und Vitest-Typen in
  den App-Code (siehe oben).
- **`vitest --typecheck`** – prüft nur Dateien mit `*.test-d.ts` bzw. verlangt eine
  eigene Konfiguration und läuft im Testlauf mit; der Compiler kann es direkt,
  ohne zusätzliche Abhängigkeit.
- **Nichts tun, der Build prüft ja `src`** – genau die Lücke, die hier zugeht.

## Folgen

- Für den Repo-Owner ändert sich nichts. Der Pull Request zeigt einen Schritt mehr
  („Typecheck"); schlägt er fehl, steht der Typfehler mit Datei und Zeile im Log.
- Lokal vor dem Commit: `cd frontend && npm run typecheck`.
