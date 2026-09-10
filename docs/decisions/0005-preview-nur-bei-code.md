# 0005 – Preview nur bei Code-Änderungen

- **Status:** akzeptiert
- **Datum:** 2026-09-10
- **Betrifft:** CI, Deployment
- **Ergänzt:** [0002 – Preview-App pro Pull Request](0002-pr-preview.md)

## Worum geht's

Bisher baute jeder Pull Request eine Preview – auch die, die nur Dokumentation ändern.
Dabei entsteht eine App, die exakt so aussieht wie vorher. Der Lauf dauert länger als
alles andere am PR zusammen.

## Entscheidung

- Die Preview wird nur noch gebaut, wenn ein Pull Request etwas unter `frontend/`
  ändert – oder einen der beiden Preview-Workflows.
- Umgesetzt als `paths`-Filter in `.github/workflows/pr-preview.yml`.
- **Das Aufräumen zieht in eine eigene Datei um:**
  `.github/workflows/pr-preview-cleanup.yml` läuft bei jedem geschlossenen Pull Request,
  ohne `paths`-Filter.
- Beide Workflows teilen sich die `concurrency`-Gruppe `preview-<branch>`, damit
  Aufräumen und Veröffentlichen sich nicht überholen.
- Alles andere bleibt: Fork-PRs weiterhin ausgeschlossen, Live-Deployment von `main`
  unberührt.
- CI (Lint, Format, Test, Build) und der Review-Agent laufen weiterhin bei **jedem** PR.

## Warum

- Eine Preview ohne Code-Änderung zeigt nichts Neues. Der Link führt auf denselben Stand
  wie der vorige PR.
- `npm ci` plus Build sind der teuerste Schritt der ganzen Automatik.
- Der Filter sitzt am Auslöser, nicht im Job. Der Workflow startet also gar nicht erst,
  statt zu starten und sich selbst zu überspringen.
- **Warum das Aufräumen ungefiltert laufen muss:** Stünde es im gefilterten Workflow,
  gäbe es einen Fall, in dem es ausfällt. Ein Pull Request ändert etwas unter
  `frontend/`, die Preview wird veröffentlicht – dann nimmt ein späterer Commit die
  Änderung wieder zurück. Beim Schließen sieht der Filter keine `frontend/`-Änderung
  mehr, der Lauf startet nicht, und der Preview-Ordner bliebe für immer in `gh-pages`
  liegen. Zwei getrennte Dateien schließen das aus.
- Die Qualitätssicherung leidet nicht: Was den Code prüft, läuft unverändert weiter.

## Verworfene Alternativen

- **Alles in einer Datei lassen, mit `paths` auch für `closed`** – so war der erste
  Entwurf. Der Review-Agent hat den Aufräum-Fehler oben gefunden. GitHub kann einen
  `paths`-Filter nicht auf einzelne Ereignis-Typen beschränken – deshalb zwei Dateien.
- **Im Job prüfen statt im Auslöser** (`if:` mit einem Diff-Vergleich) – der Workflow
  würde weiter starten, einen Runner belegen und im PR als Eintrag auftauchen.
- **Preview manuell auf Zuruf starten** (`workflow_dispatch`) – spart am meisten, aber
  dann muss man bei jedem Code-PR daran denken. Genau das soll die Automatik abnehmen.
- **So lassen** – kostet bei jedem Doku-PR einen vollständigen Build für ein Ergebnis,
  das niemand anschaut.

## Folgen

- Für den Repo-Owner ist kein Handgriff nötig.
- **Beim Ausprobieren beachten:** Ein Test-PR, der nur die `README.md` ändert, bekommt
  jetzt keinen Preview-Link mehr. Für den Test in
  [`docs/setup/ci-und-agenten.md`](../setup/ci-und-agenten.md) muss eine Datei unter
  `frontend/` angefasst werden.
- Fehlt der Preview-Link an einem reinen Doku-PR, ist das kein Fehler.
- In der Actions-Übersicht steht jetzt ein zweiter Eintrag „PR-Preview aufräumen".
  Er läuft bei jedem geschlossenen PR und ist ohne vorhandene Preview wirkungslos.
