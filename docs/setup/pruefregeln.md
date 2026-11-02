# Prüfregeln pflegen

Diese Seite ist für den Repo-Owner.

**Kurz:** Jede Prüfregel ist eine Regel in
[`docs/domain/reference/regeln.json`](../domain/reference/regeln.json), wie die anderen
Grundstock-Regeln (Entscheidung 0086). Wörter stehen weiter in CSV-Tabellen daneben. Die App
liest beides beim nächsten Build.

| Datei                         | Was du dort änderst                                                |
| ----------------------------- | ------------------------------------------------------------------ |
| `regeln.json`                 | Name, Hinweistext, Kategorie, Schwere, Norm-Verweis, Status, Werte |
| `wortlisten.csv`              | Verweise für V6 (Anlage, Plan, Gutachten), Bieterwörter für V7     |
| `risiko-formulierungen.csv`   | Formulierungen für V4                                              |
| `hersteller-produktnamen.csv` | Hersteller und Produktnamen für V3                                 |
| `einheiten-gruppen.csv`       | Einheiten, die dasselbe meinen (V2, G3)                            |

## In `regeln.json`

Die Prüfregeln erkennst du an der Kennung: `v1-bedarfsposition` … `g3-einheit-schreibweise`,
`m1-bewehrung`. Das Kürzel vorn („V1“) zeigt die App in „Prüfung“. Ändere nur diese Felder:

- `name`: Überschrift in der Prüfliste.
- `status`: `freigegeben` (läuft) oder `aus` (verschwindet ganz aus der Prüfung).
- unter `wirkung` → `pruefhinweis`:
  - `kategorie`: `geld`, `menge`, `risiko`, `norm`, `frist` oder `vob`.
  - `schwere`: `hinweis` oder `beachten`.
  - `text`: ein Satz, kein Urteil („ein Blick lohnt“, nicht „unzulässig“).
  - `norm`: `verweis` (Wortlaut) und `stand` (`bestaetigt` oder `zu_bestaetigen`). Mit
    `zu_bestaetigen` zeigt die App „Verweis zu bestätigen“. Ohne Verweis den ganzen
    Eintrag `norm` weglassen (V7, G3).
- Schwellwerte unter `parameter`, z. B. `"punktreihe-mindestlaenge": 5` bei V7 oder
  `"positionen-im-titel": 3` bei M1. Zahl ohne Anführungszeichen.
- Bei V3 der Abstand für „oder gleichwertig“: `"bereich": { "zeichen": 80 }`.

Nach einer inhaltlichen Änderung `version` um 1 erhöhen.

Folge, wenn die Datei kaputt ist (Komma vergessen, Wert falsch geschrieben): Die Regel fehlt
in der App, im schlimmsten Fall alle Grundstock-Regeln. Der Test `npm test` meldet das vor
dem Merge (`tests/check/wissen.test.ts`).

## `wortlisten.csv`

- Spalten: `liste`, `stichworte`, `bemerkung`.
- `liste` ist der Name, den die Regel nennt (`{ "liste": "verweis-plan" }`). Nicht ändern.
- Schreibweise der Stichworte wie bei den Materialtabellen
  ([`materialwissen.md`](materialwissen.md#schreibweise-der-stichworte)): `*` = beliebige
  Buchstaben, `#` = Zahl, `|` trennt. Ein Stichwort trifft nur ganze Wörter.
- **V6:** Was in `verweis-anlage`, `verweis-plan` und `verweis-gutachten` fehlt, meldet V6
  nicht — z. B. ein Positionsverweis.
- **V7:** Eingabefelder, die die GAEB-Datei selbst kennzeichnet, zählen immer. Punkte im
  übrigen Text zählen ab `punktreihe-mindestlaenge`. `bieterangabe` enthält Aufforderungen
  („vom Bieter einzutragen“), `offenes-feld` Feldnamen: gemeldet wird nur, wenn nach
  Feldname und Doppelpunkt nichts oder eine Lücke steht („Fabrikat: ....“).

Folge, wenn eine Liste leer ist: Die Regel bleibt inaktiv und nennt in der Prüfliste den
Grund.

## `risiko-formulierungen.csv` und `hersteller-produktnamen.csv`

- Risiko: eine Formulierung je Zeile, dazu die Quelle (`quelle_version`).
- Hersteller: `name` und weitere Produktnamen in `stichworte`, pipe-getrennt. Im Fund steht
  das gefundene Wort, z. B. „Ytong“.

## Was im Code bleibt

- Eingebaute Logik, die mehr als Wörter braucht: offene Textstellen (V7), Schreibweisen der
  Einheiten im ganzen LV (G3), Beton ohne Bewehrung mit Betonstahl im selben Abschnitt (M1).
- Wie der Titel je Fund entsteht: gefundene Wörter, dann Angaben wie „keine Menge, keine
  Einheit“.
