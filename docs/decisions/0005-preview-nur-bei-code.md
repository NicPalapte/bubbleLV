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

- Der Preview-Workflow läuft nur noch, wenn ein Pull Request etwas unter `frontend/`
  ändert – oder den Preview-Workflow selbst.
- Umgesetzt als `paths`-Filter in `.github/workflows/pr-preview.yml`.
- Alles andere bleibt: Fork-PRs weiterhin ausgeschlossen, Aufräumen beim Schließen
  unverändert, Live-Deployment von `main` unberührt.
- CI (Lint, Format, Test, Build) und der Review-Agent laufen weiterhin bei **jedem** PR.

## Warum

- Eine Preview ohne Code-Änderung zeigt nichts Neues. Der Link führt auf denselben Stand
  wie der vorige PR.
- `npm ci` plus Build sind der teuerste Schritt der ganzen Automatik.
- Der Filter greift auf die Änderungen des **gesamten** Pull Requests, nicht nur des
  letzten Pushes. Ein PR mit Code-Änderungen bleibt deshalb auch beim Schließen erfasst
  und wird ordentlich aufgeräumt – es bleiben keine Dateien in `gh-pages` liegen.
- Die Qualitätssicherung leidet nicht: Was den Code prüft, läuft unverändert weiter.

## Verworfene Alternativen

- **Im Job prüfen statt im Trigger** (`if:` mit einem Diff-Vergleich) – der Workflow
  würde weiter starten, einen Runner belegen und im PR als Eintrag auftauchen. Der
  `paths`-Filter verhindert den Start überhaupt.
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
