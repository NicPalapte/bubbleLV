# Domänen-Referenzdaten

Strukturierte Normdaten, die vom Maintainer aus einer lizenzierten/offiziellen Quelle
gepflegt werden — nicht vom Modell erfunden oder aus dem Internet geraten (siehe
[`../README.md`](../README.md)).

| Datei                                                        | Inhalt                                                                                                                                                  | Quelle                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [`material/`](material/)                                     | Eine Tabelle je Material: Erkennung und Merkmale (Art, Bauweise, Bewehrung …). Pflege: [`../../setup/materialwissen.md`](../../setup/materialwissen.md) | Owner; Beton und Betonstahl als Entwurf von Claude |
| [`pruefregeln.csv`](pruefregeln.csv)                         | Je Prüfregel: Status, Norm-Verweis, Name, Kategorie, Schwere, Hinweistext                                                                               | [`../vob-pruefungen.md`](../vob-pruefungen.md)     |
| [`pruefregeln-parameter.csv`](pruefregeln-parameter.csv)     | Schwellwerte und Einstellungen je Regel (z. B. Titelgröße bei M1)                                                                                       | Owner                                              |
| [`pruefregeln-stichworte.csv`](pruefregeln-stichworte.csv)   | Suchwörter je Regel (V2, V3, V6, V7), Schreibweise wie bei den Materialtabellen                                                                         | Owner                                              |
| [`risiko-formulierungen.csv`](risiko-formulierungen.csv)     | Formulierungen, die ein Risiko auf den AN schieben — Regel V4                                                                                           | Owner                                              |
| [`hersteller-produktnamen.csv`](hersteller-produktnamen.csv) | Hersteller-/Produktnamen — Regel V3                                                                                                                     | Owner                                              |
| [`vob-nebenleistungen.csv`](vob-nebenleistungen.csv)         | Nebenleistungen je ATV — Regeln V8, V9                                                                                                                  | VOB/C des Owners                                   |
| [`einheiten-gruppen.csv`](einheiten-gruppen.csv)             | Einheiten, die dasselbe bedeuten („Stk" = „Stück")                                                                                                      | Owner                                              |

## `pruefregeln.csv` — Stammdaten je Regel

Pflege: [`../../setup/pruefregeln.md`](../../setup/pruefregeln.md).

| Spalte           | Bedeutung                                                             |
| ---------------- | --------------------------------------------------------------------- |
| `regel_id`       | ID aus [`../vob-pruefungen.md`](../vob-pruefungen.md), z. B. `V1`     |
| `status`         | `bestaetigt` · `zu_bestaetigen` · `aus`                               |
| `norm_verweis`   | Wortlaut, den die Oberfläche anzeigt; leer, wenn es keinen gibt       |
| `name`           | Überschrift in der Prüfliste                                          |
| `kategorie`      | `geld` · `menge` · `risiko` · `norm` · `frist` · `vob`                |
| `schwere`        | `hinweis` · `beachten`                                                |
| `hinweis`        | Ein Satz: was die Regel sucht und warum ein Blick lohnt — kein Urteil |
| `quelle_version` | Fassung, aus der der Verweis stammt                                   |

- **`bestaetigt`** — der Owner hat Inhalt und Absatz-Nummer geprüft. Die Oberfläche
  zeigt den Verweis ohne Zusatz.
- **`zu_bestaetigen`** — die Regel läuft, der Verweis wird aber sichtbar als
  „Verweis zu bestätigen" markiert. Bubble behauptet keine Fundstelle in der Norm,
  die niemand geprüft hat.
- **`aus`** — die Regel läuft nicht und steht auch nicht in der Prüfliste. Ein Wort in
  dieser Spalte schaltet sie ab, ohne Code-Änderung.

Fehlt Name, Kategorie oder Schwere, bleibt die Regel inaktiv und nennt den Grund.

Ein unbekannter oder leerer Status gilt als `zu_bestaetigen` — die vorsichtige
Annahme.

## `einheiten-gruppen.csv`

Eine Zeile je Gruppe, Schreibweisen pipe-getrennt. Groß-/Kleinschreibung und
hochgestellte Ziffern (`m³` = `m3`) führt der Code schon von sich aus zusammen;
hier stehen nur die **inhaltlichen** Gruppen. Bewusst nicht enthalten: `lfm` und
`m` — das ist eine Abrechnungsart, keine Schreibweise.

Format je Datei ist in der jeweils referenzierenden Dokumentation beschrieben.
Solange eine Datei nur die Kopfzeile enthält, gilt die zugehörige Zuordnung als
**nicht verifiziert** — Code darf dafür keine Platzhalterwerte annehmen, sondern muss
auf den dokumentierten Fallback-Pfad ausweichen.
