# Domänen-Referenzdaten

Strukturierte Normdaten, die vom Maintainer aus einer lizenzierten/offiziellen Quelle
gepflegt werden — nicht vom Modell erfunden oder aus dem Internet geraten (siehe
[`../README.md`](../README.md)).

| Datei | Inhalt | Quelle |
|---|---|---|
| [`stlb-bau-leistungsbereiche.csv`](stlb-bau-leistungsbereiche.csv) | STLB-Bau-Leistungsbereiche (LB-Nummer, Bezeichnung, Default-Positionsart, Match-Stichworte) für die Klassifizierung (WP-2) | STLB-Bau-Lizenz/-Export des Maintainers |

Format je Datei ist in der jeweils referenzierenden Dokumentation beschrieben (für
`stlb-bau-leistungsbereiche.csv` siehe [`../README.md`](../README.md#stlb-bau-leistungsbereiche-als-primäre-klassifizierungsquelle-wp-2)).
Solange eine Datei nur die Kopfzeile enthält, gilt die zugehörige Zuordnung als
**nicht verifiziert** — Code darf dafür keine Platzhalterwerte annehmen, sondern muss
auf den dokumentierten Fallback-Pfad ausweichen.
