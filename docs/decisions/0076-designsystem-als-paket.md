# 0076 – Designsystem als eigenes Paket `@conocto/design`

- **Status:** akzeptiert
- **Datum:** 2026-10-26
- **Betrifft:** `frontend/src/main.tsx`, `frontend/src/index.css`, `frontend/tailwind.config.js`,
  `frontend/src/components/ui/`, `frontend/package.json`
- **Ergänzt:** 0069 (Conocto-Look)

## Worum geht's

- Nico will das Aussehen von Conocto in weiteren Produkten nutzen, zuerst im BIM-Viewer.
- Dafür liegt es jetzt im eigenen, öffentlichen Repo `NicPalapte/conocto-design`.
- Der LV-Viewer soll dieselbe Quelle nutzen, damit Änderungen an einer Stelle passieren.

## Entscheidung

- Farben (hell/dunkel), Schriftgrößen, Abstände, Radien und Schatten kommen aus dem Paket
  `@conocto/design` (`tokens.css`), ebenso die Schriften (`fonts`) und der Grundstil.
- `frontend/src/index.css` enthält nur noch, was allein die App braucht.
- Der Akzent heißt `--accent` (`-soft`, `-ink`, `-fill`, `-fill-hover`) statt `--blue*`,
  in CSS und als Tailwind-Farbe (`bg-accent-soft`, `text-accent-ink`, …).
- Aus dem Paket kommen die Bausteine `ConoctoLogo`, `Chip`, `ValueChip`/`ChipGroup`,
  `SegmentedControl`, `BlockLabel`. `DataTable` und `Popover` bleiben in
  `components/ui/`, weil sie an die LV-Logik gebunden sind.
- Die App bindet eine **feste Version** ein (Tag in `frontend/package.json`). Eine neue
  Version des Designsystems kommt nur über einen PR in die App.

## Warum

- Eine Quelle für den Look aller Conocto-Produkte, keine Kopien, die auseinanderlaufen.
- Feste Version: Die App ändert sich nie unbemerkt, CI und Screenshots prüfen jeden Wechsel.
- Öffentliches Repo: kein Zugangsschlüssel in den Workflows nötig. Schutz brächte
  „privat“ kaum, die Farben stehen ohnehin im ausgelieferten App-Bundle.

## Verworfene Alternativen

- **Paket als Ordner in diesem Repo (`packages/design`)** – andere Produkte müssten dann
  bubbleLV einbinden.
- **Privates Repo mit Token** – jeder Workflow bräuchte ein Secret, bei Ablauf bricht das
  Deployment.
- **Immer den neuesten Stand (`#main`)** – die App könnte sich ohne PR ändern.

## Folgen

- Farbe oder Größe ändern: im Repo `conocto-design`, neue Version freigeben, dann die
  Version in `frontend/package.json` per PR hochsetzen.
- `npm ci` lädt das Paket von GitHub; ohne Netzzugang zu GitHub schlägt die Installation
  fehl.
- Der Look bleibt pixelgleich (Screenshots hell/dunkel vorher/nachher verglichen).
