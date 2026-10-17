# 0054 – Kern als eigenes Paket im selben Repo

- **Status:** akzeptiert
- **Datum:** 2026-10-17
- **Betrifft:** GAEB-Parser, `LVDraft`, neuer Ordner `packages/core/`, Build-Einstellungen
  in `frontend/` (Alias `@core`)

## Worum geht's

- Bubble soll ein Baustein eines größeren Ganzen werden: später kommen ein BIM-Modell und
  ein Terminplan dazu. Bubble ist der Viewer, das Datenmodell ist der Kern.
- Bisher lagen Parser und Datenmodell mitten in der App (`frontend/src/lib/gaeb/`,
  `frontend/src/types/lvDraft.ts`). Nichts verhinderte, dass App-Code in sie hineinwächst.

## Entscheidung

- Der Kern liegt in `packages/core/` (Paketname `@bubble/core`):
  Datenmodell (`src/model/`), GAEB-Importer (`src/gaeb/`), Hashes (`src/hash/`).
- Die App importiert ihn nur über `@core` (= `packages/core/src/index.ts`).
- Der Kern importiert nichts aus der App und kein React. ESLint bricht sonst ab
  (`packages/core/eslint.config.js`).
- Kein eigener Build, keine eigenen Abhängigkeiten: die App liest den Kern als Quelltext.
  Lint, Format, Typecheck und Tests des Kerns laufen mit den Befehlen der App.
- Klassifizierung und Prüfregeln bleiben vorerst in der App, weil sie sich noch oft ändern.

## Warum

- Die Grenze wird sichtbar und geprüft, ohne dass jede Änderung zwei PRs braucht.
- Die CI bleibt unverändert: sie läuft weiter in `frontend/`.

## Verworfene Alternativen

- **Eigenes Repo:** Versionen veröffentlichen, zwei PRs je Änderung, zwei CIs. Lohnt erst,
  wenn ein zweiter Nutzer (BIM-Viewer, Terminplan) dazukommt oder der Kern offen
  lizenziert wird.
- **npm-Workspaces im Wurzelordner:** hätte `package-lock.json`, CI, Preview und Deploy
  verschoben. Ohne Abhängigkeiten im Kern bringt das nichts.

## Folgen

- Testdateien (`*.x83`) liegen jetzt unter `packages/core/tests/fixtures/`.
- Lizenz des Kerns bleibt „alle Rechte vorbehalten" (0036), bis der Owner das
  offene-Kern-Thema entscheidet.
- Kein manueller Schritt für den Owner.
