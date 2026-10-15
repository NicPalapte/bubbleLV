# Prüfregeln pflegen

Diese Seite ist für den Repo-Owner.

**Kurz:** Alles, was du an einer Prüfregel fachlich ändern kannst, steht in drei Tabellen
unter [`docs/domain/reference/`](../domain/reference/). Die App liest sie beim nächsten
Build. Im Code bleibt nur, _wie_ eine Regel sucht und rechnet.

| Datei                         | Was du dort änderst                                         |
| ----------------------------- | ----------------------------------------------------------- |
| `pruefregeln.csv`             | Status, Norm-Verweis, Name, Kategorie, Schwere, Hinweistext |
| `pruefregeln-parameter.csv`   | Schwellwerte, z. B. `zaunbreite` bei G4                     |
| `pruefregeln-stichworte.csv`  | Suchwörter für V2, V6 und V7                                |
| `risiko-formulierungen.csv`   | Formulierungen für V4                                       |
| `hersteller-produktnamen.csv` | Hersteller und Produktnamen für V3                          |
| `einheiten-gruppen.csv`       | Einheiten, die dasselbe meinen (V2, G3)                     |

## `pruefregeln.csv`

- `status`: `bestaetigt`, `zu_bestaetigen` oder `aus`. Mit `aus` verschwindet die Regel
  ganz aus der Prüfung.
- `kategorie`: `geld`, `menge`, `risiko`, `norm`, `frist` oder `vob`.
- `schwere`: `hinweis` oder `beachten`.
- `hinweis`: ein Satz, kein Urteil („ein Blick lohnt", nicht „unzulässig").

Folge, wenn Name, Kategorie oder Schwere fehlt oder falsch geschrieben ist: Die Regel
bleibt inaktiv und nennt in der Prüfliste den Grund.

## `pruefregeln-parameter.csv`

- Eine Zeile je Einstellung: `regel_id`, `parameter`, `wert`, `bemerkung`.
- Zahlen mit Komma oder Punkt (`1,5` = `1.5`).
- Den Namen in `parameter` nicht ändern — daran findet der Code die Zeile.

Folge, wenn eine Zeile fehlt: Die Regel bleibt inaktiv und nennt den fehlenden Parameter.

## `pruefregeln-stichworte.csv`

- Spalten: `regel_id`, `wert`, `stichworte`, `ausser`, `bemerkung`.
- Schreibweise der Stichworte wie bei den Materialtabellen
  ([`materialwissen.md`](materialwissen.md#schreibweise-der-stichworte)): `*` = beliebige
  Buchstaben, `#` = Zahl, `|` trennt.
- **V6:** Jede Zeile ist eine Art Dokument außerhalb des LV. Was hier fehlt, meldet V6
  nicht — z. B. ein Positionsverweis.
- **V7:** Die Zeile `Offenes Feld` enthält Feldnamen. Gemeldet wird nur, wenn nach
  Feldname und Doppelpunkt nichts oder eine Lücke steht („Fabrikat: ....").
  Punkt- und Strichreihen („.....", „____") erkennt der Code selbst.

## Was im Code bleibt

- Wie eine Regel rechnet: z. B. „Preis außerhalb des Erwartungsbereichs seiner Gruppe"
  (G4) oder „Beton ohne Bewehrung, Betonstahl im selben Abschnitt" (M1).
- Die Titel je Fund, z. B. „keine Menge, keine Einheit" — sie setzen sich aus der Datei
  zusammen.
- Die Erkennung von Bedarfs- und Alternativpositionen: sie steht als Feld in der
  GAEB-Datei, nicht als Wort im Text.
