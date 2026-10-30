# 0086 – Prüfregeln als Regeln

- **Status:** akzeptiert
- **Datum:** 2026-10-30
- **Betrifft:** Prüfregeln (`frontend/src/lib/check/`), Grundstock
  (`docs/domain/reference/regeln.json`), Wortlisten (`docs/domain/reference/*.csv`), Kern
  (`packages/core/src/rules/rule.ts`)
- **Ergänzt:** [0085](0085-ein-regelformat-fuer-alles.md) (Schritt 2 von 5)
- **Ersetzt:** den Tabellen-Teil von [0049](0049-pruefregeln-als-tabelle.md)
  (`pruefregeln.csv`, `pruefregeln-parameter.csv`, `pruefregeln-stichworte.csv`)

## Worum geht's

- Die Prüfregeln V1–V10, G3 und M1 standen als Code plus drei CSV-Tabellen in der App.
- Schritt 2 aus 0085: Sie werden Regeln im Format `bubble-rule-v1` mit der Wirkung
  „Prüfhinweis“, wie alle anderen Regeln.

## Entscheidung

- **Zwölf Grundstock-Regeln** in `regeln.json`, Kennung mit Kürzel vorn
  (`v1-bedarfsposition` … `m1-bewehrung`). „Prüfung“ zeigt das Kürzel („V1“) wie bisher.
- **„Prüfung“ wertet nur noch Regeln aus**, mit dem Auswerter des Kerns. Nur `freigegeben`
  läuft. `aus` fehlt auch in der Liste, wie bisher (V8–V10, M1).
- **Wortlisten bleiben CSV:** Hersteller (`hersteller-produktnamen.csv`), Risiko
  (`risiko-formulierungen.csv`) und neu `wortlisten.csv` (Verweise für V6, Bieterwörter für
  V7). Einheiten-Gruppen aus `einheiten-gruppen.csv`.
- **Eingebaut bleiben** V7 (`offene-stelle`), G3 (`einheit-schreibweise`), M1
  (`bewehrung`). Ihre Schwellwerte stehen als Parameter in der Regel. V8–V10 nennen eine
  eingebaute Logik, die es noch nicht gibt.
- **Fehlt Wissen, ruht die Regel:** leere Wortliste, fehlende Einheiten-Gruppe oder fehlende
  Materialtabelle ⇒ „inaktiv“ mit Grund, kein Fehler.
- **V6 bleibt eine Regel** mit drei Wortlisten (Anlage, Plan, Gutachten), nicht drei Regeln.
  So bleibt V6 ein Eintrag in der Prüfliste.
- **Norm-Verweis nur, wo es einen gibt.** V7 und G3 hatten nie einen. Grundstock-Hinweise
  dürfen deshalb ohne Verweis stehen; erfunden wird keiner. Ein Verweis braucht immer seinen
  Stand (`bestaetigt` oder `zu_bestaetigen`). Das ändert die Regel aus 0085, nach der
  Grundstock-Hinweise immer eine Norm nennen.
- **Titel je Fund** setzt die App aus dem Treffer zusammen: gefundene Wörter („gemäß
  Bodengutachten“), dann stimmende Angaben („keine Menge, keine Einheit“).
- **Ein Fund je Position und Regel.** V4 meldete bisher jede Formulierung einzeln.
- **Vergleich alt/neu:** `frontend/tests/check/funde-vorher.json` hält die Funde der alten
  Prüffunktionen fest (6 Test-LVs, 1 erfundenes Prüf-LV mit Grenzfällen). Gleiche Positionen
  je Regel, bis auf zwei gewollte Abweichungen:
  - V3: Name im Kurztext, „oder gleichwertig“ erst im Langtext ⇒ jetzt ein Fund. Die Regel
    sucht je Text; früher liefen Kurz- und Langtext als ein Text.
  - V4: „trägt der ANbieter“ ⇒ kein Fund mehr. Wortlisten treffen nur ganze Wörter.

## Verworfene Alternativen

- **V6 als drei Regeln** (Plan): drei Zeilen „V6“ in der Prüfliste, ohne Gewinn.
- **Norm-Verweis für V7/G3 ergänzen:** dafür gibt es keinen geprüften Verweis.
- **Parameter in einer eigenen CSV:** ein Schwellwert gehört zur Regel, nicht in eine Liste.

## Folgen

- In „Prüfung“ lauten manche Fund-Titel anders, z. B. „Ytong“ statt „Xella“ oder „Einheit
  h (Stunde)“ statt „Abrechnung nach Zeit (h)“.
- Die zwölf Prüfregeln stehen im Reiter „Regeln“ der Admin-Werkzeuge, nur zum Lesen.
- Owner: Norm-Verweis, Status, Hinweistext und Schwellwerte jetzt in `regeln.json` ändern,
  Wörter weiter in den CSV. Anleitung: [`../setup/pruefregeln.md`](../setup/pruefregeln.md).
