# 0042 – Preview nur auf Zuruf

- **Status:** akzeptiert
- **Datum:** 2026-10-10
- **Betrifft:** CI, Deployment
- **Ersetzt:** [0005 – Preview nur bei Code-Änderungen](0005-preview-nur-bei-code.md)

## Worum geht's

Die Preview wurde bei jedem Push gebaut, der `frontend/` anfasst. Meist schaut sie
niemand an, und der Build ist der langsamste Teil der CI.

## Entscheidung

- Die Preview wird nur gebaut, wenn im Pull Request ein Kommentar mit `/preview`
  beginnt.
- Auslösen dürfen nur OWNER, MEMBER und COLLABORATOR. PRs aus Forks bekommen keine
  Preview.
- Der Kommentar bekommt sofort ein 👀 als Rückmeldung.
- Aufräumen bleibt wie in 0007 beim Deploy von `main`.

## Warum

- Weniger Wartezeit und weniger Schreibvorgänge auf `gh-pages`.
- Wer die App anklicken will, weiß das selbst am besten.

## Verworfene Alternativen

- **Label am PR statt Kommentar** – jeder Push würde wieder bauen, solange das Label
  hängt.
- **Manuell über Actions → Run workflow** – braucht dort die PR-Nummer, umständlicher als
  ein Kommentar.

## Folgen

- Nach neuen Pushes zeigt die Preview den alten Stand, bis erneut `/preview` kommt.
- Die Änderung greift erst, wenn sie auf `main` ist: GitHub nimmt Kommentar-Workflows
  immer aus `main`.
