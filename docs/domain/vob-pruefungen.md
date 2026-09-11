# VOB-Check — Regelkatalog

> **Disziplin-Hinweis:** Jede Regel nennt ihren Norm-Verweis. Wo die genaue Nummer
> in der aktuellen VOB-Fassung noch zu bestätigen ist, steht das ausdrücklich dabei —
> siehe [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md#domänenwissen). Nichts hier ist
> erfunden, nichts ohne Verweis.

## Was der VOB-Check ist — und was nicht

- Bubble liest die geladene Datei und zeigt **Hinweise zum Prüfen**.
- Bubble gibt **keinen Rechtsrat** und behauptet keine Vollständigkeit.
- Die Erkennung läuft über Textmuster. Fehlalarme sind eingeplant, deshalb:
  - jede Meldung zeigt die **Fundstelle im Text**, nie nur ein Urteil,
  - jede Regel ist **einzeln abschaltbar**,
  - Formulierung im UI: „hier lohnt ein Blick", nicht „das ist unzulässig".
- Fehlen Referenzdaten für eine Regel, greift sie einfach nicht. Kein Fehler.

## Regeln

Spalte **Konfidenz**: `sicher` = Inhalt und Fundstelle in der Norm geprüft.
`zu bestätigen` = Inhalt ist geläufig, die genaue Absatz-Nummer der geltenden Fassung
muss der Owner bestätigen, bevor sie im UI angezeigt wird.

| ID | Bubble findet | Norm-Verweis | Konfidenz | Umsetzbar |
|---|---|---|---|---|
| V1 | Bedarfs-/Eventualposition im LV | VOB/A § 7 Abs. 1 Nr. 4 (Bedarfspositionen grundsätzlich nicht aufnehmen) | zu bestätigen | sofort — `positionType` liefert das direkt |
| V2 | Angehängte Stundenlohnarbeiten, besonders in größerem Umfang | VOB/A § 7 Abs. 1 Nr. 4 Satz 2 · Abrechnung: VOB/B § 15 | zu bestätigen | sofort — Einheit `h`/`Std` plus Stichworte |
| V3 | Produkt- oder Herstellername ohne Zusatz „oder gleichwertig" | VOB/A § 7 Abs. 2 (Produktneutralität); bei EU-Vergaben zusätzlich § 31 Abs. 6 VgV | zu bestätigen | braucht Herstellerliste (Referenzdatei, vom Owner) |
| V4 | Risiko-Übertragung auf den AN („trägt der AN", „unabhängig von den angetroffenen Verhältnissen") | VOB/A § 7 Abs. 1 Nr. 3 (kein ungewöhnliches Wagnis) | zu bestätigen | sofort — Formulierungsliste |
| V5 | Position ohne Menge, ohne Einheit oder mit Menge 0 | VOB/A § 7 Abs. 1 Nr. 1 (eindeutig und erschöpfend) | zu bestätigen | sofort — steht in den Feldern |
| V6 | Preisbeeinflussende Umstände nur als Verweis, nicht in der Datei („gemäß Baugrundgutachten", „siehe Plan") | VOB/A § 7 Abs. 1 Nr. 2 (alle preisbeeinflussenden Umstände angeben) | zu bestätigen | sofort — Verweis-Erkennung |
| V7 | Offener Platzhalter, den der Bieter ausfüllen muss | kein VOB-Bezug — GAEB-Merkmal (`TextComplement`) | sicher | sofort — Parser liefert es |
| V8 | Leistung ausgeschrieben, die nach VOB/C **Nebenleistung** ist (Doppelvergütung prüfen) | VOB/C, ATV DIN 18299 Abschnitt 4.1, dazu die Abschnitte 4.1 der gewerkespezifischen ATV (DIN 18300 ff.) | sicher (Struktur) | braucht Zuordnung LB → ATV und die Nebenleistungs-Listen |
| V9 | Im Text erwähnte **Besondere Leistung** ohne eigene Position | VOB/C, ATV DIN 18299 Abschnitt 4.2 | sicher (Struktur) | Ausbaustufe — schwerer zu erkennen als V8 |
| V10 | Erdarbeiten ohne Angabe von Homogenbereichen | VOB/C, DIN 18300 Abschnitt 0 (Hinweise für das Aufstellen der Leistungsbeschreibung); Homogenbereiche lösen seit der Fassung 2015 die Bodenklassen ab — siehe [`README.md`](README.md#muster-beispiel-din-18300--bodenklassen-vs-homogenbereiche) | sicher (Inhalt), Abschnitts-Nummer zu bestätigen | braucht LB-Erkennung Erdarbeiten |

## Was der Owner bestätigen muss

Bevor eine Regel mit `zu bestätigen` im UI erscheint:

1. **V1, V2:** Ist „Bedarfspositionen grundsätzlich nicht aufnehmen" und der Satz zu
   angehängten Stundenlohnarbeiten in der geltenden Fassung tatsächlich
   **§ 7 Abs. 1 Nr. 4 VOB/A**?
2. **V3:** Steht die Produktneutralität samt „oder gleichwertig" in **§ 7 Abs. 2 VOB/A**?
   Soll die Regel auch unterhalb der EU-Schwellenwerte gelten?
3. **V4, V5, V6:** Sind **§ 7 Abs. 1 Nr. 1–3 VOB/A** korrekt zugeordnet?
4. **V10:** Welcher Unterabschnitt von **DIN 18300 Abschnitt 0** verlangt die
   Homogenbereich-Angaben genau?
5. **V3, V8:** Wer liefert die Referenzdaten — Herstellerliste und Nebenleistungs-Listen
   je ATV? Ohne sie bleiben beide Regeln inaktiv (wie die `keywords`-Spalte im
   STLB-Katalog, siehe [`README.md`](README.md#stlb-bau-leistungsbereiche-als-primäre-klassifizierungsquelle-wp-2)).

## Ablage der Referenzdaten

Wie beim STLB-Katalog: CSV unter [`reference/`](reference/), eine Zeile je Eintrag, mit
Spalte `quelle_version`. Nicht im Code hartkodieren, nicht erfinden.

| Datei | Inhalt | Für |
|---|---|---|
| `reference/vob-nebenleistungen.csv` | ATV-Nummer, Abschnitt, Leistungstext, Stichworte | V8 |
| `reference/hersteller-produktnamen.csv` | Hersteller-/Produktname, Gewerk, Stichworte | V3 |
| `reference/risiko-formulierungen.csv` | Formulierung, Regel-ID, Schweregrad | V4, V6 |

Solange eine Datei nur die Kopfzeile enthält, ist die zugehörige Regel inaktiv.
