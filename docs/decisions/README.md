# Entscheidungen

Hier steht, **warum** das Projekt so gebaut ist, wie es gebaut ist. Eine Datei pro
Entscheidung, fortlaufend nummeriert. Der Code zeigt das *Was*, diese Dateien das *Warum*.

## Übersicht

| Nr.  | Entscheidung                                                             | Status     | Datum      |
|------|--------------------------------------------------------------------------|------------|------------|
| 0001 | [Review-Agent für Pull Requests](0001-pr-review-agent.md)                | akzeptiert | 2026-09-09 |
| 0002 | [Preview-App pro Pull Request](0002-pr-preview.md)                       | akzeptiert | 2026-09-09 |
| 0003 | [Sprach- und Dokumentationsregeln](0003-sprache-und-dokumentation.md)    | akzeptiert | 2026-09-09 |
| 0004 | [Design-Kit bleibt JSX, App bleibt TSX](0004-design-kit-und-frontend.md) | akzeptiert | 2026-09-10 |
| 0005 | [Preview nur bei Code-Änderungen](0005-preview-nur-bei-code.md)          | akzeptiert | 2026-09-10 |
| 0006 | [Fokus: ein LV vollständig verstehen](0006-fokus-lv-verstehen.md)       | akzeptiert | 2026-09-11 |

## Wann schreibe ich eine neue Datei?

Neue Datei, wenn eine Änderung eine dieser Fragen berührt:

- Kommt eine neue Abhängigkeit, ein neuer Dienst oder ein neuer Workflow dazu?
- Ändert sich etwas an den Architekturregeln aus `.claude/CLAUDE.md`?
- Gab es mehrere sinnvolle Wege und einer wurde bewusst verworfen?
- Muss der Repo-Owner etwas von Hand einstellen (Secrets, Repo-Settings)?

Keine neue Datei für: Bugfixes, Umbenennungen, Tests, Formatierung, normale Features
ohne Weichenstellung.

## Regeln

- Nummern werden nie wiederverwendet. Dateiname: `NNNN-kurzer-titel.md`.
- Eine getroffene Entscheidung wird **nicht umgeschrieben**. Wird sie hinfällig, setzt
  man den Status auf `ersetzt durch NNNN` und schreibt eine neue Datei.
- Erklärung in einfacher Sprache, kurze Sätze, Stichpunkte statt Fließtext.
- Nach dem Anlegen: Zeile in der Übersichtstabelle oben ergänzen.

## Vorlage

```markdown
# NNNN – Titel

- **Status:** akzeptiert
- **Datum:** JJJJ-MM-TT
- **Betrifft:** <Bereich, z. B. CI, Frontend, Parser>

## Worum geht's

Ein bis drei Sätze in einfacher Sprache: welches Problem wird gelöst.

## Entscheidung

Was gilt ab jetzt. Stichpunkte.

## Warum

Die Gründe. Stichpunkte.

## Verworfene Alternativen

- **Option A** – warum nicht.

## Folgen

- Was ändert sich im Alltag, was muss der Repo-Owner einmalig tun.
```
