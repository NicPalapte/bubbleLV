# 0015 – Gewerk aus der Abschnittsüberschrift erben

- **Status:** akzeptiert
- **Datum:** 2026-09-16
- **Betrifft:** Klassifizierung

## Worum geht's

In realen LVs steht das Gewerk in der Titel-Überschrift („Titel 02
Erdarbeiten") und nicht in jeder Positionszeile. Die Klassifizierung sah bis
jetzt nur den Positionstext — Ergebnis: fast alle Positionen landeten im
Überblick unter „Ohne Gewerk", obwohl die Datei das Gewerk nennt.

## Entscheidung

- Findet Stufe 0 im **Positionstext** keinen Leistungsbereich, prüft sie die
  **Überschriften der übergeordneten Abschnitte und Lose** — die nächstgelegene
  zuerst.
- Verglichen wird mit demselben STLB-Bau-Katalog wie beim Positionstext. Eine
  Überschrift ohne Katalogtreffer liefert nichts; es wird nichts geraten.
- Die Herkunft ist sichtbar: `attributes._meta.gewerkQuelle` steht auf
  `position` oder `abschnitt`, und das Eigenschaften-Panel schreibt bei einem
  geerbten Gewerk „(aus Abschnitt)" dahinter.
- Ein **geerbtes** Gewerk verfeinert die Positionsart nicht: unter
  „Betonarbeiten" stehen auch Vorhaltung und Stundenlohn. Nur ein Treffer im
  Positionstext selbst tut das weiterhin.

## Warum

- **Die Angabe steht in der Datei.** Bubble macht ein LV lesbar; die Überschrift
  zu benutzen, unter der eine Position einsortiert ist, ist kein Raten, sondern
  Lesen. Erfunden wird nichts.
- **Die nächstgelegene Überschrift gewinnt**, weil sie die Position genauer
  beschreibt als das Los darüber.
- **Sichtbar statt stillschweigend:** ein geerbtes Merkmal ist eine Ableitung.
  Wer es prüft, muss erkennen können, woher es kommt.

## Verworfene Wege

- **Nur die `keywords`-Spalte des STLB-Katalogs pflegen.** Hilft ebenfalls und
  bleibt sinnvoll, ist aber inhaltliche Arbeit je Leistungsbereich und trifft
  Positionen weiterhin nicht, deren Text das Gewerk schlicht nicht nennt
  („Wand herstellen, d = 24 cm").
- **Das Gewerk aus der Überschrift ohne Katalogabgleich übernehmen.** Dann
  stünde bei „Titel 09 Allgemeines" das Gewerk „Allgemeines" — ein Wert, den
  keine Facette und kein Ruleset kennt.
- **Nur die Demodatei so schreiben, dass Gewerke greifen.** Hätte die Vorführung
  hübsch gemacht und am Problem nichts geändert.

## Bleibt offen

Die `keywords`-Spalte in
[`domain/reference/stlb-bau-leistungsbereiche.csv`](../domain/reference/stlb-bau-leistungsbereiche.csv)
ist weiterhin leer; ohne sie greifen nur die aus der Katalog-Bezeichnung
abgeleiteten Stichworte. Deshalb bleibt zum Beispiel ein Titel „Maurerarbeiten"
ohne Treffer, weil der Katalog den Bereich „Mauerarbeiten" nennt.
