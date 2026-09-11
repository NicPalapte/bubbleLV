# 0002 – Preview-App pro Pull Request

- **Status:** akzeptiert
- **Datum:** 2026-09-09
- **Betrifft:** CI, Deployment
- **Teilweise überholt durch:**
  [0007 – Previews werden beim Deploy aufgeräumt](0007-previews-im-deploy-aufraeumen.md).
  Zwei Punkte unter „Entscheidung" gelten nicht mehr: Die Preview wird **nicht** mehr
  beim Schließen des PRs entfernt, und `deploy-pages.yml` schützt `pr-preview/` nicht
  mehr pauschal per `clean-exclude`. Der Rest gilt unverändert.

## Worum geht's

Zu jedem Pull Request soll es eine anklickbare Version der App geben, um Änderungen im
Browser zu prüfen, statt sie nur im Code zu lesen oder lokal auszuchecken.

## Entscheidung

- Previews laufen auf **GitHub Pages**, kein weiterer Anbieter, kein zusätzliches Konto.
- Adresse: `https://<owner>.github.io/<repo>/pr-preview/pr-<nummer>/`
- Der Link wird automatisch als PR-Kommentar gepostet und beim Schließen des PRs
  samt Dateien wieder entfernt.
- Dafür wird die Pages-Quelle vom Actions-Artefakt auf den **Branch `gh-pages`** umgestellt:
  - `main`-Stand → Wurzelverzeichnis von `gh-pages`
  - Previews → `pr-preview/pr-<nummer>/` im selben Branch
- `deploy-pages.yml` schützt den Ordner `pr-preview/` beim Deployen (`clean-exclude`),
  sonst würde jeder `main`-Push alle offenen Previews löschen.
- Nur PRs aus diesem Repo bekommen eine Preview, keine Fork-PRs.

## Warum

- Kein neuer Dienst, kein neues Konto, keine zusätzlichen Secrets, keine Kosten.
- Alles bleibt an einem Ort: dieselbe Domain, dieselben Repo-Settings.
- Die App ist ein rein statisches Bundle ohne Server – Pages reicht vollständig aus.
- Fachdatenregel bleibt gewahrt: Pages liefert nur statische Dateien aus, GAEB-Dateien
  verlassen den Browser weiterhin nicht.
- Fork-PRs sind ausgenommen, weil fremder Code sonst in den Deployment-Branch schreiben
  könnte.

## Verworfene Alternativen

- **Cloudflare Pages / Vercel / Netlify** – hätten Previews „ab Werk“, verlangen aber
  ein zweites Konto, Secrets im Repo und binden das Projekt an einen Anbieter.
- **Nur Build-Artefakt zum Download** – kein Setup nötig, aber man muss jedes Mal
  herunterladen und entpacken; im Alltag benutzt das niemand.
- **Pages-Quelle auf „GitHub Actions“ belassen** – dort ist immer nur *ein* Stand
  veröffentlichbar; parallele Previews sind damit technisch nicht möglich.

## Folgen

- Einmalig durch den Repo-Owner: *Settings → Pages → Source* auf **Branch `gh-pages` / `/ (root)`**
  umstellen. Bis dahin bleibt die Live-Seite auf dem alten Stand stehen.
  Anleitung: `docs/setup/ci-und-agenten.md`.
- Der Branch `gh-pages` wird von Workflows verwaltet – dort niemals von Hand committen.
- Jeder PR-Push baut die App neu; das dauert etwa so lange wie der normale CI-Lauf.
