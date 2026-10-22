# @bubble/core – der neutrale Kern

Hier liegt alles, was ein LV **ist** – unabhängig davon, wie es angezeigt wird.
Bubble (`frontend/`) ist der Viewer und liest nur über `src/index.ts`.

## Inhalt

- `src/model/` – neutrales Datenmodell (`LVDraft`: Los › Abschnitt › Position)
- `src/gaeb/` – GAEB-Importer (einzige Stelle mit GAEB-XML-Wissen)
- `src/hash/` – Datei-ID und Positions-Hashes (Entscheidung 0055)
- `src/export/` – LV als JSON mit Hashes für bauonto (Entscheidung 0067,
  Kommandozeile: `cd frontend && npm run export-lv -- <datei.x83>`)

## Regeln

- Kein React, kein Import aus `frontend/` – ESLint bricht sonst ab.
- Keine Klassifizierung, keine Prüfregeln: die bleiben vorerst im Viewer.
- Tests unter `tests/`, ausgeführt mit der App: `cd frontend && npm test`.

Warum ein Ordner im selben Repo und kein eigenes Repo:
`docs/decisions/0054-kern-als-paket.md`.
