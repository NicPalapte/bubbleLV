# Domänen-Referenzdaten

Strukturierte Normdaten, die vom Maintainer aus einer lizenzierten/offiziellen Quelle
gepflegt werden — nicht vom Modell erfunden oder aus dem Internet geraten (siehe
[`../README.md`](../README.md)).

| Datei | Inhalt | Quelle |
|---|---|---|
| [`stlb-bau-leistungsbereiche.csv`](stlb-bau-leistungsbereiche.csv) | STLB-Bau-Leistungsbereiche (LB-Nummer, Bezeichnung, Default-Positionsart, Match-Stichworte) für die Klassifizierung (WP-2) | STLB-Bau-Lizenz/-Export des Maintainers |
| [`pruefregeln.csv`](pruefregeln.csv) | Je Prüfregel: Status und Norm-Verweis (WP-K) | [`../vob-pruefungen.md`](../vob-pruefungen.md) |
| [`risiko-formulierungen.csv`](risiko-formulierungen.csv) | Formulierungen, die ein Risiko auf den AN schieben — Regel V4 | Owner |
| [`hersteller-produktnamen.csv`](hersteller-produktnamen.csv) | Hersteller-/Produktnamen — Regel V3 | Owner |
| [`vob-nebenleistungen.csv`](vob-nebenleistungen.csv) | Nebenleistungen je ATV — Regeln V8, V9 | VOB/C des Owners |
| [`einheiten-gruppen.csv`](einheiten-gruppen.csv) | Einheiten, die dasselbe bedeuten („Stk" = „Stück") | Owner |

## `pruefregeln.csv` — Status je Regel

| Spalte | Bedeutung |
|---|---|
| `regel_id` | ID aus [`../vob-pruefungen.md`](../vob-pruefungen.md), z. B. `V1` |
| `status` | `bestaetigt` · `zu_bestaetigen` · `aus` |
| `norm_verweis` | Wortlaut, den die Oberfläche anzeigt |
| `quelle_version` | Fassung, aus der der Verweis stammt |

- **`bestaetigt`** — der Owner hat Inhalt und Absatz-Nummer geprüft. Die Oberfläche
  zeigt den Verweis ohne Zusatz.
- **`zu_bestaetigen`** — die Regel läuft, der Verweis wird aber sichtbar als
  „Verweis zu bestätigen" markiert. Bubble behauptet keine Fundstelle in der Norm,
  die niemand geprüft hat.
- **`aus`** — die Regel läuft nicht. Ein Wort in dieser Spalte schaltet sie ab,
  ohne Code-Änderung.

Ein unbekannter oder leerer Status gilt als `zu_bestaetigen` — die vorsichtige
Annahme.

## `einheiten-gruppen.csv`

Eine Zeile je Gruppe, Schreibweisen pipe-getrennt. Groß-/Kleinschreibung und
hochgestellte Ziffern (`m³` = `m3`) führt der Code schon von sich aus zusammen;
hier stehen nur die **inhaltlichen** Gruppen. Bewusst nicht enthalten: `lfm` und
`m` — das ist eine Abrechnungsart, keine Schreibweise.

Format je Datei ist in der jeweils referenzierenden Dokumentation beschrieben (für
`stlb-bau-leistungsbereiche.csv` siehe [`../README.md`](../README.md#stlb-bau-leistungsbereiche-als-primäre-klassifizierungsquelle-wp-2)).
Solange eine Datei nur die Kopfzeile enthält, gilt die zugehörige Zuordnung als
**nicht verifiziert** — Code darf dafür keine Platzhalterwerte annehmen, sondern muss
auf den dokumentierten Fallback-Pfad ausweichen.
