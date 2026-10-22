# 0068 – LV als JSON für das Matching-Labor bauonto

- **Status:** vorgeschlagen
- **Datum:** 2026-10-22
- **Betrifft:** Kern (`packages/core/src/export/`), Kommandozeile (`frontend/scripts/`);
  ergänzt 0055 und 0060

## Worum geht's

- Im Repo `bauonto` entsteht ein Labor, das LV-Positionen mit Texten der Baubeschreibung
  verknüpft (Python, Neo4j). Die Ergebnisse sollen später in Bubble an der Position hängen.
- Dafür muss bauonto jede Position mit **genau derselben ID** ansprechen wie Bubble: dem
  Positions-Hash aus 0055.

## Entscheidung

- Der Kern bekommt `toLvExport(draft, fileId)`. Ergebnis: das LV mit Losen, Abschnitten und
  Positionen, jede Position mit ihren Hashes. Schema-Kennung `bubble-lv-export-v1`.
- Die Klassifizierung (`attributes`) ist nicht dabei. Sie lebt im Viewer.
- Ein Kommandozeilen-Werkzeug ruft den Kern auf:
  `cd frontend && npm run export-lv -- <datei.x83> [ausgabe.json]`.
- Es läuft lokal in Node ab Version 22.18 (führt TypeScript direkt aus, steht in
  `frontend/package.json` unter `engines`). Die Datei verlässt den Rechner nicht.
- Kaputte oder fremde Dateien enden mit einer kurzen Meldung, nicht mit einem Programmabbruch.

## Warum

- **Ein Parser, eine Wahrheit:** Bubbles GAEB-Parser bleibt die einzige Stelle mit
  GAEB-Wissen. bauonto liest nur JSON.
- **Gleiche Hashes ohne Nachbau:** Ein Python-Nachbau des Hashes müsste Textnormierung,
  Zahlenformat und JSON-Schreibweise exakt treffen. Ein kleiner Unterschied würde jede
  Verknüpfung still an die falsche Stelle hängen.

## Verworfene Alternativen

- **Hash in Python nachbauen** (z. B. mit dem Paket pyGAEB) – zwei Parser, die auseinanderlaufen
  können, siehe oben.
- **Eigener Build des Kerns für Node** – mehr Aufwand. Vite lädt den Kern schon als Quelltext,
  das Werkzeug nutzt denselben Weg.

## Folgen

- Neue Entwicklungs-Abhängigkeit `@types/jsdom` (nur Typen, nicht im ausgelieferten Bundle).
  Im Werkzeug ersetzt jsdom den `DOMParser` des Browsers.
- Für Nutzer von Bubble ändert sich nichts.
- Ändert sich die Normierung der Hashes (neue Schema-Kennung in 0055), muss bauonto neu
  exportieren.
- Für den Owner: Status auf „akzeptiert" setzen, wenn der Weg passt.
