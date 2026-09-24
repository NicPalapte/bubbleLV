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
| 0007 | [Previews werden beim Deploy aufgeräumt](0007-previews-im-deploy-aufraeumen.md) | akzeptiert | 2026-09-11 |
| 0008 | [Positionen als Wolke statt als Ring](0008-graph-layout-positionswolke.md) | akzeptiert | 2026-09-11 |
| 0009 | [Demo-LV in der App](0009-demo-lv.md)                                   | akzeptiert | 2026-09-11 |
| 0010 | [Positions-Index und vorberechnete Aggregate](0010-positions-index-und-aggregate.md) | akzeptiert | 2026-09-14 |
| 0011 | [Extraktoren und Fundstellen im Langtext](0011-extraktoren-und-fundstellen.md) | akzeptiert | 2026-09-14 |
| 0012 | [Prüfregeln: Norm-Verweise aus der Referenzdatei](0012-pruefregeln-und-norm-verweise.md) | akzeptiert | 2026-09-14 |
| 0013 | [Eine Gewerk-Farbskala für alle Ansichten](0013-gewerk-farbskala.md) | akzeptiert | 2026-09-16 |
| 0014 | [Zweites Demo-LV: Angebot mit Preisen](0014-demo-lv-mit-preisen.md) | akzeptiert | 2026-09-16 |
| 0015 | [Gewerk aus der Abschnittsüberschrift erben](0015-gewerk-aus-der-abschnittsueberschrift.md) | akzeptiert | 2026-09-16 |
| 0016 | [Ähnliche Positionen: wie Bubble sie findet](0016-aehnlichkeit-und-cluster.md) | akzeptiert | 2026-09-16 |
| 0017 | [Keine Nutzungsmessung, nur ein Melde-Knopf](0017-keine-nutzungsmessung.md) | akzeptiert | 2026-09-21 |
| 0018 | [Treffer im Graphen: isolieren oder im Ganzen zeigen](0018-graph-treffer-isolation.md) | akzeptiert | 2026-09-22 |
| 0019 | [Mengen im Graphen nur innerhalb einer Einheit](0019-mengen-nur-je-einheit.md) | akzeptiert | 2026-09-22 |
| 0020 | [Langtext-Vergleich: Wortmenge statt Teilfolge](0020-langtext-vergleich-ohne-bibliothek.md) | akzeptiert | 2026-09-22 |
| 0021 | [Matrix: Zählregeln und Farbskala](0021-matrix-zaehlregeln.md) | akzeptiert | 2026-09-22 |
| 0022 | [Export, Druck und Fehlermeldung ohne Request](0022-export-und-druck-ohne-request.md) | akzeptiert | 2026-09-22 |
| 0023 | [Ansicht, Filter und Auswahl im URL-Fragment](0023-zustand-im-url-fragment.md) | akzeptiert | 2026-09-22 |
| 0024 | [Fehler melden ohne GitHub-Konto](0024-fehler-melden-ohne-konto.md) | akzeptiert | 2026-09-23 |
| 0025 | [Typecheck läuft auch über die Tests](0025-typecheck-ueber-die-tests.md) | akzeptiert | 2026-09-23 |
| 0026 | [Ein Absturz zeigt eine Seite, keine weiße Fläche](0026-absturz-auffangnetz.md) | akzeptiert | 2026-09-23 |
| 0027 | [Versionsnummer, Changelog und „Über diese App"](0027-versionsnummer-und-ueber-diese-app.md) | akzeptiert | 2026-09-24 |
| 0028 | [Zwei Leisten, „Mitnehmen" in die Befehle](0028-zwei-leisten-und-befehle.md) | akzeptiert | 2026-09-24 |

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
