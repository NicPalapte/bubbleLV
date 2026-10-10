# 0041 – Workflows: knappe Rechte, Fremd-Actions fest verdrahtet

- **Status:** akzeptiert
- **Datum:** 2026-10-10
- **Betrifft:** CI (`.github/workflows/`)

## Worum geht's

Das Code-Review vom 2026-10-02 fand zwei Lücken in den Workflows (Issues #109, #110):
`@claude review` konnte jeder auslösen, auch bei Fork-PRs. Und `ci.yml` lief mit den
Standardrechten des Repos.

## Entscheidung

- `@claude review` startet ein Review nur, wenn der Kommentar von OWNER, MEMBER oder
  COLLABORATOR kommt und der PR aus diesem Repo stammt (kein Fork).
- Jeder Workflow hat einen eigenen `permissions`-Block. `ci.yml`: nur `contents: read`.
- Fremd-Actions mit Schreibrechten stehen auf einem Commit-Hash statt auf einem
  Versions-Tag, die Version als Kommentar daneben: `claude-code-action`,
  `github-pages-deploy-action`, `pr-preview-action`.

## Warum

- Das Review läuft mit Secret und Schreibrechten auf fremdem PR-Code. Das darf nur
  jemand starten, dem das Repo vertraut.
- Ein Versions-Tag kann der Autor der Action jederzeit auf anderen Code umbiegen.
  Ein Commit-Hash nicht.

## Verworfene Alternativen

- **Auch GitHubs eigene Actions (`actions/checkout`, `actions/setup-node`) pinnen** –
  kommen vom Plattformbetreiber selbst; Aufwand beim Aktualisieren ohne echten Gewinn.
- **Dependabot für Action-Updates** – neue Automatik im Repo; erst bei Bedarf.

## Folgen

- Für Nico ist kein Handgriff nötig.
- Updates der gepinnten Actions kommen nicht mehr von selbst. Zum Aktualisieren den
  Hash des neuen Release-Tags eintragen und den Versions-Kommentar anpassen.
