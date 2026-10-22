# Conocto

**Ein Leistungsverzeichnis auf einen Blick verstehen.** Conocto öffnet deine GAEB-Datei im
Browser, zeigt jede Position als Punkt in einem Graphen und hebt hervor, worauf es ankommt.

**[→ Conocto im Browser öffnen](https://nicpalapte.github.io/bubbleLV/)** · kostenlose Beta

Kein Server · kein Upload · kein Konto

---

## Für wen

Für **Bauunternehmen**, die ein LV bekommen und schnell wissen wollen, was drinsteckt:
Umfang, Mengen, Risiken, offene Angaben. Meist kommt das LV **ohne Preise** (X83) — Conocto
ist genau dafür gebaut. Angebote mit Preisen (X84, X86) gehen auch.

## Was Conocto kann

- **Das ganze LV als Graph** — gegliedert nach Abschnitt oder Mengeneinheit, oder als
  Matrix aus beidem. Große LVs mit bis zu ~10.000 Positionen laufen flüssig.
- **Das Wichtige hervorgehoben** — Geld und Menge, Risiko, Normen, Fristen direkt im Text.
- **Prüfhinweise** — z. B. offene Bieterangaben, Bedarfs- und Alternativpositionen, fehlende
  Bewehrung. Jeder Hinweis nennt seine Fundstelle und Norm. Hinweis, kein Rechtsrat.
- **Filtern und suchen** — nach Abschnitt, Einheit, Menge, Prüfhinweis, Freitext.
- **Positionen vergleichen** — bis zu vier nebeneinander, ähnliche Positionen werden
  vorgeschlagen.
- **Eigene Notizen** — Positionen markieren und kommentieren, als Datei sichern und in eine
  neue Fassung des LV übernehmen.
- **Teilen und weitergeben** — Link auf eine einzelne Position, Export als CSV oder
  Markdown, Druck.

Ohne eigene Datei ausprobieren: Auf der Startseite liegen zwei **Demo-LVs** (ohne und mit
Preisen).

## Deine Daten bleiben bei dir

- Die Datei wird **nur in deinem Browser** gelesen. Sie wird nirgendwohin hochgeladen.
- Kein Konto, kein Login.
- Nur die zuletzt geöffnete Datei und deine Notizen bleiben in diesem Browser gespeichert —
  mit einem Klick auf der Startseite gelöscht.

## Vision: Alle Projektinformationen verknüpft im Browser

| Stufe            | Was                                                  |
| ---------------- | ---------------------------------------------------- |
| **Heute**        | LV lesen und verstehen                               |
| **Als Nächstes** | Positionen teilen und vergleichen                    |
| **Später**       | Terminplan, BIM-Modell und Nachweise an der Position |

Die Position ist der Anker: Alles, was zu einer Leistung gehört, soll an ihr hängen —
weiterhin ohne Server und ohne Upload.

## Beta und Feedback

Conocto ist in der **öffentlichen Beta**. Was sich geändert hat, steht im
[Changelog](CHANGELOG.md). Fehler oder Ideen gern als
[Issue](https://github.com/NicPalapte/bubbleLV/issues).

Conocto kalkuliert nicht und ersetzt keine AVA-Software. Es hilft beim Lesen.

## Für Entwickler

Aufbau, Befehle und Abläufe im Repo: [`docs/entwicklung.md`](docs/entwicklung.md) ·
Entscheidungen: [`docs/decisions/`](docs/decisions/README.md)

## Lizenz

**Alle Rechte vorbehalten.** Der Code ist öffentlich lesbar, darf aber ohne schriftliche
Erlaubnis nicht genutzt, kopiert oder verändert werden ([`LICENSE`](LICENSE)).
Fremd-Bausteine (React, Schriften u. a.) behalten ihre eigenen Lizenzen; die Liste liegt der
App als `lizenzen.txt` bei.
