# VOB-Check — Regelkatalog

> **Disziplin-Hinweis:** Jede Regel nennt ihren Norm-Verweis. Wo die genaue Nummer
> in der aktuellen VOB-Fassung noch zu bestätigen ist, steht das ausdrücklich dabei —
> siehe [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md#domänenwissen). Nichts hier ist
> erfunden, nichts ohne Verweis.

## Was der VOB-Check ist — und was nicht

- Conocto liest die geladene Datei und zeigt **Hinweise zum Prüfen**.
- Conocto gibt **keinen Rechtsrat** und behauptet keine Vollständigkeit.
- Die Erkennung läuft über Textmuster. Fehlalarme sind eingeplant, deshalb:
  - jede Meldung zeigt die **Fundstelle im Text**, nie nur ein Urteil,
  - jede Regel ist **einzeln abschaltbar**,
  - Formulierung im UI: „hier lohnt ein Blick", nicht „das ist unzulässig".
- Fehlen Referenzdaten für eine Regel, greift sie einfach nicht. Kein Fehler.

## Stand der Umsetzung (WP-K)

| Regel                  | Zustand                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1, V2, V4, V5, V6, V7 | **umgesetzt und aktiv**, Norm-Verweise vom Owner bestätigt (14.10.2026)                                                                                   |
| V3                     | aktiv (15.10.2026) — sucht Namen aus der Herstellerliste; steht „gleichwertig“ in der Position, schlägt sie nicht an                                      |
| V8, V9, V10            | **aus** (`status = aus`) — Owner recherchiert die Verweise, bis dahin nicht in der Prüfung                                                                |
| G3                     | Kennzahl ohne Norm-Bezug, aktiv (uneinheitliche Einheiten)                                                                                                |
| G1, G2                 | **entfernt** (15.10.2026): Ranglisten der teuersten und mengenstärksten Positionen sind keine Auffälligkeit. Die Auswertung im Überblick zeigt sie weiter |
| G4                     | **entfernt** (15.10.2026): ein „auffälliger" Einheitspreis ist eine Deutung der Software, keine Tatsache aus der Datei                                    |
| M1                     | **aus** (15.10.2026): unbewehrte Bauteile erkennt der Fachmann selbst, der Hinweis überlud die Oberfläche                                                 |

Jede Prüfregel ist eine Grundstock-Regel im Format `bubble-rule-v1` mit der Wirkung
„Prüfhinweis“ in [`reference/regeln.json`](reference/regeln.json) (Entscheidung
[0086](../decisions/0086-pruefregeln-als-regeln.md)): Status, Norm-Verweis mit Stand, Name,
Kategorie, Schwere, Hinweistext und Schwellwerte. Suchwörter stehen in Wortlisten (CSV,
Tabelle unten) — nicht im Code. Im Code steht nur die eingebaute Logik von V7, G3 und M1.
Ein Norm-Verweis mit Stand `zu_bestaetigen` erscheint sichtbar als
**„Verweis zu bestätigen"**: Conocto zeigt den Fund (eine Tatsache über die Datei),
behauptet aber keine Fundstelle in der Norm, die niemand geprüft hat. Mit
`"status": "aus"` verschwindet eine Regel vollständig, ohne Code-Änderung.

Ausgewertet in `frontend/src/lib/check/` mit dem Auswerter des Kerns; die Ansicht
„Prüfung" ist einer der gleichrangigen Ansichtsmodi.

## Regeln

Spalte **Konfidenz**: `sicher` = Inhalt und Fundstelle in der Norm geprüft.
`zu bestätigen` = Inhalt ist geläufig, die genaue Absatz-Nummer der geltenden Fassung
muss der Owner bestätigen, bevor sie im UI angezeigt wird. `bestätigt` = vom Owner
bestätigt (`norm.stand` in `reference/regeln.json`).

| ID  | Conocto findet                                                                                                                                                                                   | Norm-Verweis                                                                                                                                                                                                                                      | Konfidenz                                        | Umsetzbar                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Bedarfs- oder Alternativposition im LV; der Titel je Fund nennt, welche der beiden (früher V11 für Alternativpositionen)                                                                         | VOB/A § 7 Abs. 1 Nr. 4                                                                                                                                                                                                                            | bestätigt                                        | sofort — `positionType` liefert das direkt                                                                                                                          |
| V2  | Angehängte Stundenlohnarbeiten, besonders in größerem Umfang                                                                                                                                     | VOB/A § 7 Abs. 1 Nr. 4 Satz 2 · Abrechnung: VOB/B § 15                                                                                                                                                                                            | bestätigt                                        | sofort — Einheit `h`/`Std` plus Stichworte                                                                                                                          |
| V3  | Produkt- oder Herstellername ohne Zusatz „oder gleichwertig"                                                                                                                                     | VOB/A § 7 Abs. 2 (Produktneutralität); bei EU-Vergaben zusätzlich § 31 Abs. 6 VgV                                                                                                                                                                 | bestätigt                                        | braucht Herstellerliste (Referenzdatei, vom Owner)                                                                                                                  |
| V4  | Risiko-Übertragung auf den AN („trägt der AN", „unabhängig von den angetroffenen Verhältnissen")                                                                                                 | VOB/A § 7 Abs. 1 Nr. 3 (kein ungewöhnliches Wagnis)                                                                                                                                                                                               | bestätigt                                        | sofort — Formulierungsliste                                                                                                                                         |
| V5  | Position ohne Menge, ohne Einheit oder mit Menge 0                                                                                                                                               | VOB/A § 7 Abs. 1 Nr. 1 (eindeutig und erschöpfend)                                                                                                                                                                                                | bestätigt                                        | sofort — steht in den Feldern                                                                                                                                       |
| V6  | Verweis auf ein Dokument außerhalb des LV („gemäß Baugrundgutachten", „siehe Plan"). Solche Dokumente liegen meist den Vergabeunterlagen bei; der Hinweis bittet nur zu prüfen, ob sie vorliegen | VOB/A § 7 Abs. 1 Nr. 2 (alle preisbeeinflussenden Umstände angeben)                                                                                                                                                                               | bestätigt                                        | sofort — Verweis-Erkennung                                                                                                                                          |
| V7  | Offener Platzhalter, den der Bieter ausfüllen muss                                                                                                                                               | kein VOB-Bezug — GAEB-Merkmal (`TextComplement`)                                                                                                                                                                                                  | sicher                                           | sofort — Parser liefert es                                                                                                                                          |
| V8  | Leistung ausgeschrieben, die nach VOB/C **Nebenleistung** ist (Doppelvergütung prüfen)                                                                                                           | VOB/C, ATV DIN 18299 Abschnitt 4.1, dazu die Abschnitte 4.1 der gewerkespezifischen ATV (DIN 18300 ff.)                                                                                                                                           | sicher (Struktur)                                | braucht Zuordnung LB → ATV und die Nebenleistungs-Listen                                                                                                            |
| V9  | Im Text erwähnte **Besondere Leistung** ohne eigene Position                                                                                                                                     | VOB/C, ATV DIN 18299 Abschnitt 4.2                                                                                                                                                                                                                | sicher (Struktur)                                | Ausbaustufe — schwerer zu erkennen als V8                                                                                                                           |
| M1  | Betonposition mit Festigkeitsklasse, aber ohne Angabe zur Bewehrung; nennt den Betonstahl im selben Hauptabschnitt                                                                               | kein Norm-Bezug — Beobachtung an der Datei                                                                                                                                                                                                        | sicher (Feld)                                    | sofort — Materialtabellen ([`reference/material/`](reference/material/)); braucht außerdem Positionsart „Bauteil“ und die Festigkeitsklasse aus der Klassifizierung |
| V10 | Erdarbeiten ohne Angabe von Homogenbereichen                                                                                                                                                     | VOB/C, DIN 18300 Abschnitt 0 (Hinweise für das Aufstellen der Leistungsbeschreibung); Homogenbereiche lösen seit der Fassung 2015 die Bodenklassen ab — siehe [`README.md`](README.md#muster-beispiel-din-18300--bodenklassen-vs-homogenbereiche) | sicher (Inhalt), Abschnitts-Nummer zu bestätigen | braucht LB-Erkennung Erdarbeiten (entfernt, [0044](../decisions/0044-leistungsbereich-entfernt.md))                                                                 |

## Was der Owner bestätigen muss

V1–V7 sind bestätigt (14.10.2026). Offen:

1. **V8, V9:** Verweise auf VOB/C, ATV DIN 18299 Abschnitt 4.1 und 4.2 — und wer
   liefert die Nebenleistungs-Listen je ATV?
2. **V10:** Welcher Unterabschnitt von **DIN 18300 Abschnitt 0** verlangt die
   Homogenbereich-Angaben genau?
3. **V3:** Soll die Regel auch unterhalb der EU-Schwellenwerte gelten?

## Ablage der Referenzdaten

CSV unter [`reference/`](reference/), eine Zeile je Eintrag, mit
Spalte `quelle_version`. Nicht im Code hartkodieren, nicht erfinden.

| Datei                                                                            | Inhalt                                                      | Für    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------ |
| [`reference/regeln.json`](reference/regeln.json)                                 | Die Regeln selbst: Bedingung, Hinweis, Norm-Verweis, Status | alle   |
| [`reference/wortlisten.csv`](reference/wortlisten.csv)                           | Liste, Stichworte (Verweise, Bieterwörter)                  | V6, V7 |
| [`reference/vob-nebenleistungen.csv`](reference/vob-nebenleistungen.csv)         | ATV-Nummer, Abschnitt, Leistungstext, Stichworte            | V8, V9 |
| [`reference/hersteller-produktnamen.csv`](reference/hersteller-produktnamen.csv) | Hersteller-/Produktname, Stichworte                         | V3     |
| [`reference/risiko-formulierungen.csv`](reference/risiko-formulierungen.csv)     | Formulierung, Quelle                                        | V4     |
| [`reference/einheiten-gruppen.csv`](reference/einheiten-gruppen.csv)             | Einheiten, die dasselbe bedeuten                            | G3, V2 |

Solange eine Wortliste leer ist, ist die zugehörige Regel inaktiv — sie
verschwindet aber nicht aus der Ansicht, sondern steht dort mit ihrem Grund. Sonst
hielte man eine fehlende Referenzdatei für „nichts gefunden".

`risiko-formulierungen.csv` startet mit genau den zwei Formulierungen, die oben in
der Tabelle zu V4 stehen — übernommen aus diesem Dokument, nicht erfunden. Die Liste
lebt davon, dass der Owner sie erweitert.
