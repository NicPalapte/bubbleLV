# 0092 – Startseite auf conocto.app, Viewer unter conocto.app/doc/

- **Status:** akzeptiert
- **Datum:** 2026-11-02
- **Betrifft:** `frontend/index.html`, `frontend/src/landing/`, `frontend/doc/index.html`,
  `frontend/vite.config.ts`, `frontend/src/lib/pipeline/loadDemoLv.ts`
- **Ergänzt:** 0082 (eigene Domain), 0083 (nicht in Suchmaschinen)

## Worum geht's

- Nico will zur Beta eine Startseite, die zeigt, was Conocto kann (Mockup „Bubble
  Startseite“, freigegeben am 02.11.2026).
- Die Startseite soll unter `conocto.app` laufen, der Viewer unter `conocto.app/doc/`.

## Entscheidung

- **Ein Build, zwei Seiten:** Vite baut `frontend/index.html` (Startseite) und
  `frontend/doc/index.html` (Viewer). Beide landen in `frontend/dist`, die gemeinsamen
  Dateien in `assets/`. Die Workflows bleiben unverändert; PR-Vorschauen zeigen die
  Startseite unter `pr-preview/pr-<nr>/` und den Viewer unter `pr-preview/pr-<nr>/doc/`.
- **Startseite ohne React:** nur Schriften, ein Stylesheet und ein kleines Skript
  (`src/landing/main.ts`, rund 3 KB gepackt). Sie lädt nichts vom Viewer.
- **Animation:** 24 Sekunden in vier Szenen, gezeichnet mit SVG + CSS, keine neue
  Abhängigkeit. Maus darüber oder Pause-Knopf hält an. „Bewegung reduzieren“ im System
  zeigt Standbilder, Wechsel über die Reiter.
- **Zwei Knöpfe:** „Mit eigenen Daten ausprobieren“ öffnet `doc/` (Startseite des Viewers
  mit Ablage und letzter Datei). „Demo starten“ öffnet `doc/?demo=muster`: der Viewer lädt
  die Demo ohne Preise sofort und nimmt den Parameter wieder aus der Adresse.
- **Alte Links bleiben gültig:** Ein Link auf die Wurzel mit Fragment (`conocto.app/#lv=…`)
  wird sofort nach `doc/#…` weitergereicht.
- **Beta bleibt unsichtbar:** auch die Startseite trägt `noindex, nofollow` (0083).
- Impressum und Datenschutz stehen wie im Logo-Menü als „folgt“, bis Nico den Dienst
  für die Anschrift gewählt hat.

## Verworfen

- **Startseite als eigener Zustand in der React-App:** der Viewer müsste für jeden Besuch
  komplett laden; die Adresse `/doc/` gäbe es nicht.
- **Zwei getrennte Builds** (Startseite, Viewer mit `--base=/doc/`): zwei Bau-Schritte in
  jedem Workflow, Änderungen an `deploy-pages.yml` und `pr-preview.yml` nötig.
- **Demo über das Fragment** (`#demo=…`): das Fragment gehört den teilbaren Links (0023);
  `?demo=muster` trägt keine Fachdaten.

## Folgen

- Lesezeichen auf `conocto.app` zeigen jetzt die Startseite; der Viewer ist einen Klick
  weiter. Die zuletzt geöffnete Datei bleibt erhalten (gleiche Herkunft, gleiche IndexedDB).
- Nutzungszählung zählt weiterhin nur den Viewer, nicht die Startseite.
- Zum Launch: `noindex` auf beiden Seiten entfernen (0083), Impressum/Datenschutz verlinken.
