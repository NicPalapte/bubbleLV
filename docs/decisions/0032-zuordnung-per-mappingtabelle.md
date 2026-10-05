# 0032 – Zuordnung per Mappingtabelle, mit Hauptwert und Alternativen

- **Status:** akzeptiert (Konzept; Umsetzung folgt in Schritten)
- **Datum:** 2026-10-05
- **Betrifft:** Klassifizierung (Stufe 0 bis 2), Referenzdaten, Eigenschaften-Ansicht

## Worum geht's

- Wortlisten stehen heute an vielen Stellen im Code (siehe
  `docs/domain/reference/wortlisten-uebersicht.md`), teils doppelt.
- Bei einem Konflikt entscheidet still die Reihenfolge. Alternativen gehen verloren.
- Der Owner will Positionen zu Leistungsbereichen **und** später zu anderen
  Gliederungen (DIN 276) zuordnen, und die Zuordnung soll erweiterbar sein.

## Entscheidung

**Dimensionen.** Jede Gliederung ist eine eigene Dimension mit eigenem Code-Katalog:
`leistungsbereich` (STLB-Bau), `positionsart`, `bauteiltyp`, `material`.
Später `kostengruppe` (DIN 276). Eine Position hat je Dimension einen Hauptwert.
Dimensionen schließen sich nicht aus.

**Mappingtabelle.** Eine Datei, eine Zeile je Zuordnung:

| Spalte      | Bedeutung                             |
| ----------- | ------------------------------------- |
| `dimension` | z. B. `leistungsbereich`              |
| `code`      | z. B. `013`                           |
| `stichwort` | klein geschrieben, Teilstring-Treffer |
| `wo`        | `kurztext` oder `alle`                |
| `gewicht`   | Zahl; höher gewinnt                   |
| `quelle`    | `katalog` · `owner` · `lernregel`     |
| `status`    | `entwurf` · `bestaetigt`              |
| `hinweis`   | Freitext für den Prüfer               |

- Ein Stichwort darf in mehreren Zeilen stehen (mehrere Codes).
- Die Codes und Bezeichnungen je Dimension stehen in einem Katalog je Dimension
  (heute: `stlb-bau-leistungsbereiche.csv`).
- Nur Zeilen mit `status = bestaetigt` wirken.

**Bewertung innerhalb einer Dimension**, in dieser Reihenfolge:

1. Fundstelle: Kurztext vor Langtext vor Überschrift.
2. `gewicht`.
3. Länge des Stichworts.
4. Bleibt ein Gleichstand zwischen verschiedenen Codes: **mehrdeutig**.

**Ergebnis.** Je Dimension ein Hauptwert (bester Treffer, auch bei „mehrdeutig") plus
Liste der Alternativen. `_meta` hält fest, welche Dimensionen mehrdeutig sind.
Die Oberfläche zeigt bei Mehrdeutigkeit den Hinweis und beide Optionen zur Auswahl.
Filter, Summen und Graph arbeiten mit dem Hauptwert.

**Lernfähig.** Die Mappingtabelle kann eine zweite Quelle bekommen: Regeln aus
manuellen Tags oder Zuweisungen (`quelle = lernregel`). Sie gelten vor den
Katalog-Zeilen. Der Abgleich kennt beide Quellen von Anfang an.

**Grenzen (Scope).**

- Ohne Speicherung über die Session hinaus (`docs/scope.md`, Zeile 189) leben
  Lernregeln nur bis zum Reload.
- Bleibende Lernregeln gehen nur über eine Datei: als lokaler Download (erlaubt),
  vom Owner ins Repo übernommen. Ein Import in die App oder Zuweisungen
  verwalten ist Out of Scope (Zeilen 192 und 196). Das ist eine eigene Entscheidung.
- DIN 276 steht nicht in `docs/scope.md`. Jetzt gibt es nur das Format, **keine**
  Kostengruppen-Daten. Die Liste muss aus der Norm vom Owner kommen.

**Material** ist eine eigene Dimension mit eigenen Zeilen. Die Spalte `keywords` im
STLB-Katalog speist es nicht mehr (siehe [`0030`](0030-material-filter-ausblenden.md)).

## Verworfene Alternativen

- **Mehrfachzuordnung (Position in mehreren LB gleichzeitig)** – würde Filter,
  Summen und Graph ändern.
- **Bei Gleichstand kein Wert** – Filter würden Positionen verlieren.
- **Listen im Code behalten, nur zusammenführen** – löst den Konflikt nicht und
  lässt sich nicht um DIN 276 oder Lernregeln erweitern.

## Folgen

Umsetzung in Schritten, jeder mit Test und Vorher/Nachher-Vergleich:

1. Format und Katalog-Loader (diese Entscheidung, keine Verhaltensänderung).
2. Gemeinsamer Abgleich; bestehende Listen als Zeilen übernehmen.
3. Hauptwert und Alternativen im Datenmodell und in den Eigenschaften.
4. Keyword-Entwurf nach Prüfung einspielen; Material als eigene Dimension.

Ersetzt keine frühere Entscheidung. [`0031`](0031-stlb-katalog-ohne-positionsart.md)
bleibt gültig; die Keywords wandern später aus dem STLB-Katalog in die Mappingtabelle.
