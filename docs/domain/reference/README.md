# Domänen-Referenzdaten

Strukturierte Normdaten, die vom Maintainer aus einer lizenzierten/offiziellen Quelle
gepflegt werden — nicht vom Modell erfunden oder aus dem Internet geraten (siehe
[`../README.md`](../README.md)).

| Datei                                                        | Inhalt                                                                                                                                                                                                                    | Quelle                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [`material/`](material/)                                     | Eine Tabelle je Material: Erkennung und Merkmale (Art, Bauweise, Bewehrung …). Pflege: [`../../setup/materialwissen.md`](../../setup/materialwissen.md)                                                                   | Owner; Beton und Betonstahl als Entwurf von Claude |
| [`wortlisten.csv`](wortlisten.csv)                           | Weitere Wortlisten für Regeln: Spalte `liste` = Name in der Regel, `stichworte` pipe-getrennt (V6, V7)                                                                                                                    | Owner                                              |
| [`risiko-formulierungen.csv`](risiko-formulierungen.csv)     | Wortliste `risiko`: Formulierungen, die ein Risiko auf den AN schieben — Regel V4                                                                                                                                         | Owner                                              |
| [`hersteller-produktnamen.csv`](hersteller-produktnamen.csv) | Wortliste `hersteller`: Namen und Produktnamen — Regel V3                                                                                                                                                                 | Owner                                              |
| [`vob-nebenleistungen.csv`](vob-nebenleistungen.csv)         | Nebenleistungen je ATV — Regeln V8, V9                                                                                                                                                                                    | VOB/C des Owners                                   |
| [`einheiten-gruppen.csv`](einheiten-gruppen.csv)             | Einheiten, die dasselbe bedeuten („Stk" = „Stück")                                                                                                                                                                        | Owner                                              |
| [`hervorhebungen.csv`](hervorhebungen.csv)                   | Begriffe, die im Langtext hervorgehoben werden (Material, Maße, Wichtig, nicht hervorheben) — Entscheidung 0053. Pflege: [`../../setup/admin-werkzeuge.md`](../../setup/admin-werkzeuge.md)                               | Owner (Admin-Werkzeuge)                            |
| [`regeln.json`](regeln.json)                                 | Grundstock-Regeln `bubble-rule-v1` für alle Firmen (hervorheben, Positionen verbinden, Prüfregeln V1–V10, G3, M1, PDF-Vorschläge `pdf-oz` und `pdf-menge`) — Entscheidungen 0081, 0086, 0087. Pflege: [`../../setup/admin-werkzeuge.md`](../../setup/admin-werkzeuge.md) | Owner (Admin-Werkzeuge)                            |

## Prüfregeln — in `regeln.json`

Seit Entscheidung 0086 steht jede Prüfregel als Grundstock-Regel in
[`regeln.json`](regeln.json). Pflege: [`../../setup/pruefregeln.md`](../../setup/pruefregeln.md).

## `hervorhebungen.csv` — Begriffe im Langtext

Färbt Begriffe im Langtext der Positionskarte ein. Kein Filter, kein Attribut, keine
Prüfregel. Pflege mit den Admin-Werkzeugen oder von Hand:
[`../../setup/admin-werkzeuge.md`](../../setup/admin-werkzeuge.md).

| Spalte      | Bedeutung                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `begriff`   | Wort oder Muster, ohne Groß/klein. `#` = eine Zahl, `*` = Buchstaben oder Ziffern, z. B. `C#/#` |
| `kategorie` | `material` (grün) · `masse` (violett) · `wichtig` (rot) · `aus` (nicht hervorheben)             |
| `bemerkung` | frei, wird nicht ausgewertet                                                                    |

- **Vorrang:** Was die App selbst findet (Normen, Maße, Fristen …), bleibt. Ein Begriff
  färbt nur Stellen, die noch frei sind.
- **`aus`** nimmt jede Markierung weg, die den Begriff berührt, auch eine der App.
- **Längere Begriffe zuerst:** „Sichtbetonklasse SB#" gewinnt gegen „SB#".
- Zeilen mit leerem Begriff oder unbekannter Kategorie werden still übersprungen.
- Im Browser gelernte Begriffe kommen dazu und gelten nur dort, bis die Datei hier
  ersetzt ist.

## `einheiten-gruppen.csv`

Eine Zeile je Gruppe, Schreibweisen pipe-getrennt. Groß-/Kleinschreibung und
hochgestellte Ziffern (`m³` = `m3`) führt der Code schon von sich aus zusammen;
hier stehen nur die **inhaltlichen** Gruppen. Bewusst nicht enthalten: `lfm` und
`m` — das ist eine Abrechnungsart, keine Schreibweise.

Format je Datei ist in der jeweils referenzierenden Dokumentation beschrieben.
Solange eine Datei nur die Kopfzeile enthält, gilt die zugehörige Zuordnung als
**nicht verifiziert** — Code darf dafür keine Platzhalterwerte annehmen, sondern muss
auf den dokumentierten Fallback-Pfad ausweichen.
