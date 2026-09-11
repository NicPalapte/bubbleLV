# 0007 – Previews werden beim Deploy aufgeräumt

- **Status:** akzeptiert
- **Datum:** 2026-09-11
- **Betrifft:** CI, Deployment
- **Ergänzt:** [0002 – Preview-App pro Pull Request](0002-pr-preview.md)

## Worum geht's

Beim Mergen eines Pull Requests tauchte in *Actions* regelmäßig ein abgebrochener Lauf
auf: **„pages build and deployment"** zum Commit *„Remove preview for PR ＜Nr＞"*,
Ergebnis `cancelled`. Betroffen waren die PRs 37, 38, 39, 42, 43 und 44 – also fast jeder
Merge.

Ursache: Ein Merge löste **zwei** Schreibvorgänge auf `gh-pages` fast gleichzeitig aus.

1. `pr-preview.yml` reagierte auf „PR geschlossen" und löschte den Preview-Ordner.
2. `deploy-pages.yml` reagierte auf den Push nach `main` und veröffentlichte die App.

Beide hatten getrennte Sperren und wussten nichts voneinander. GitHub baut die Seite nach
jedem Push auf `gh-pages`, lässt aber nur einen Build gleichzeitig zu – der erste wurde
vom zweiten abgebrochen.

## Entscheidung

- `pr-preview.yml` hört **nicht mehr** auf „PR geschlossen" und räumt nicht mehr auf.
  Der Schritt läuft mit `action: deploy` statt dem Standard `auto`.
- `deploy-pages.yml` räumt mit auf: Vor dem Veröffentlichen kopiert er die Previews der
  **offenen** Pull Requests aus `gh-pages` in den Build-Ordner.
- Damit entfällt `clean-exclude`. Der Veröffentlichungsschritt spiegelt den Build-Ordner
  und löscht alles, was darin fehlt – also genau die Previews geschlossener PRs.
- Zusätzlich legt der Workflow einmalig `.nojekyll` im Branch `gh-pages` an.

## Warum

- **Ein Merge = ein Schreibvorgang.** Ohne zweiten Push gibt es nichts mehr abzubrechen.
- Die Preview-Ordner werden nicht mehr einzeln gelöscht, sondern ergeben sich aus der
  Liste der offenen PRs. Ein Ordner, der beim Aufräumen übersehen wurde, verschwindet
  beim nächsten Deploy von selbst.
- `.nojekyll`: Ohne diese Datei schiebt GitHub den Branch durch Jekyll. Jekyll überspringt
  Dateien, die mit `_` beginnen. Erzeugt der Build so eine Datei, fehlt sie kommentarlos
  auf der Live-Seite – ohne Fehlermeldung irgendwo. Die Datei gehört in den Branch, nicht
  in `frontend/public/`: der Kopierschritt der Deploy-Action lässt `.nojekyll` bewusst
  unangetastet, sie käme von dort also nie an.

## Verworfene Alternativen

- **Beiden Workflows dieselbe Sperre geben** – kleinerer Eingriff, aber unsicher: Der
  Deploy-Job läuft rund 35 s, ein Seiten-Build rund 40 s. Der zweite Push käme weiterhin,
  nur etwas später – die Abbrüche könnten vereinzelt zurückkommen.
- **Nur `clean-exclude` je offenem PR setzen** statt die Previews zu kopieren – hängt
  davon ab, wie `rsync` geschützte Unterordner beim Löschen des Elternordners behandelt.
  Der Kopierweg kommt ohne diese Annahme aus.
- **So lassen und dokumentieren** – die Abbrüche sind kosmetisch, aber sie stehen in
  jedem Merge im Dashboard. Ein rotes Feld, das man wegsehen muss, macht echte Fehler
  unsichtbar.
- **Pages-Quelle zurück auf „GitHub Actions"** – dort gibt es keinen Jekyll-Schritt und
  keinen Branch-Wettlauf, aber auch keine parallelen Previews. Würde 0002 aufheben.

## Folgen

- Für den Repo-Owner ist kein Handgriff nötig.
- **Neu im Alltag:** Die Preview eines geschlossenen PRs verschwindet nicht mehr sofort,
  sondern beim nächsten Merge nach `main`. Der Link zeigt bis dahin den letzten Stand
  des PRs. Das ist kein Fehler.
- Der Workflow liest jetzt die Liste der offenen Pull Requests (`pull-requests: read`).
- Der Lauf, der `.nojekyll` anlegt, erzeugt einmalig einen zusätzlichen Seiten-Build.
  Danach bleibt die Datei liegen und der Schritt meldet nur noch „ist vorhanden".
