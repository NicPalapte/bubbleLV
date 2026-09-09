# 0001 – Review-Agent für Pull Requests

- **Status:** akzeptiert
- **Datum:** 2026-09-09
- **Betrifft:** CI, Code-Qualität

## Worum geht's

Jeder Pull Request soll automatisch durchgelesen werden, bevor er in `main` landet.
Gefundene Probleme sollen direkt an der betroffenen Codezeile stehen, nicht in einem
langen Fließtext. Gleichzeitig darf das weder endlos laufen noch unnötig Geld kosten.

## Entscheidung

- Neuer Workflow `.github/workflows/claude-review.yml`.
- Der Agent kommentiert **Zeile für Zeile** (Inline-Kommentare) plus einen kurzen
  Gesamtkommentar in einfacher Sprache.
- Er darf **nur lesen und kommentieren** – kein Code ändern, kein Push, kein Merge,
  keine Freigabe. Technisch abgesichert über `--allowedTools`.
- Obergrenze: **3 automatische Reviews pro Pull Request**. Danach nur noch auf Zuruf
  mit dem Kommentar `@claude review` (der zählt nicht mit).
- Der verbrauchte Stand steht als Kommentar im PR. Zähler zurücksetzen = Kommentar löschen.
- Entwürfe (Draft-PRs) und PRs aus Forks werden nicht automatisch geprüft.
- **Modellwahl automatisch** nach Umfang und Risiko des Diffs:
  - bis 150 geänderte Zeilen und keine sensible Datei → günstiges, schnelles Modell
  - sonst → starkes Modell
  - sensibel sind `frontend/src/lib/`, `frontend/src/workers/`, `.github/workflows/`
- Anmeldung über das Repo-Secret `CLAUDE_CODE_OAUTH_TOKEN` (Claude-Abo des Owners),
  nicht über einen API-Key.

## Warum

- Inline-Kommentare sind beim Nachbessern direkt am richtigen Ort.
- Der harte Deckel verhindert die typische Endlosschleife: Agent kommentiert → Push →
  Agent kommentiert erneut → …
- Zähler als Kommentar statt als Datei oder Label: sichtbar, ohne Extra-Infrastruktur,
  und mit einem Klick zurückzusetzen.
- Zwei Modellstufen statt einer: die meisten PRs sind klein, dort reicht das günstige
  Modell. Parser, Klassifizierung und Workflows sind die Stellen, an denen ein Fehler
  richtig weh tut – die bekommen immer das starke Modell.
- Nur-Lese-Rechte: ein Agent, der selbst pusht, kann sich gegenseitig mit dem
  CI-Workflow hochschaukeln und Review-Historie unbrauchbar machen.
- OAuth-Token statt API-Key: läuft über das vorhandene Abo, keine zweite Abrechnung.

## Verworfene Alternativen

- **Kein Limit, Review bei jedem Push** – unkalkulierbarer Verbrauch, Kommentarflut.
- **Nur manuelles Review per Kommentar** – wird im Alltag vergessen.
- **Immer das stärkste Modell** – teuer ohne erkennbaren Mehrwert bei Kleinstdiffs.
- **Agent darf Fixes committen** – vermischt Reviewer- und Autorenrolle und erzeugt
  neue CI-Läufe, die wieder ein Review auslösen.

## Folgen

- Einmalig durch den Repo-Owner: Secret `CLAUDE_CODE_OAUTH_TOKEN` anlegen
  (Anleitung: `docs/setup/ci-und-agenten.md`). Ohne das Secret schlägt der Review-Schritt fehl.
- Der Agent bewertet gegen `.claude/CLAUDE.md`. Ändern sich die Regeln dort, ändert sich
  automatisch der Maßstab des Reviews – die Datei ist damit die zentrale Stellschraube.
- Formatierung und Stil meldet der Agent bewusst nicht; das erledigen ESLint und Prettier.
