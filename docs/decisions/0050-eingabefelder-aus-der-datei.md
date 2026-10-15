# 0050 – Eingabefelder aus der Datei

- **Status:** akzeptiert
- **Datum:** 2026-10-15
- **Betrifft:** GAEB-Parser (`frontend/src/lib/gaeb/`), `LVDraft`, V7 (offene Textergänzung)

## Worum geht's

- V7 zählte jede Reihe ab drei Punkten als offene Stelle.
- Drei Punkte sind oft nur eine Auslassung („Beton, Mörtel ...“). Das gab falsche Hinweise.
- GAEB DA XML kennzeichnet echte Bieter-Eingaben selbst (Textergänzung des Bieters).
  Der Parser hat diese Kennzeichnung bisher weggeworfen.

## Entscheidung

- Der Parser gibt die Bieter-Eingabefelder als Bereiche im Langtext weiter
  (`PositionDraft.inputFields`, ohne GAEB-Begriff).
- Diese Felder zählen immer, auch wenn sie leer sind oder nur drei Punkte haben.
- Punkte und Unterstriche im übrigen Text zählen erst ab einer Mindestlänge.
  Sie steht in `pruefregeln-parameter.csv` (V7, `punktreihe_mindestlaenge`, Start: 5).
- Die Werte heißen „Textergänzung“ (aus der Datei) und „Punktreihe“ (aus dem Text).

## Folgen

- Weniger falsche Hinweise bei Auslassungspunkten.
- Fehlt die Mindestlänge in der Tabelle, zählen nur die Felder aus der Datei.
- Andere Quellen (später z. B. Excel) können `inputFields` weglassen.

## Verworfen

- **Nur Mindestlänge:** einfacher, übersieht aber kurze echte Felder.
- **Knopf „Hinweis trifft nicht zu“:** vorerst nicht. Der Owner hat sich für die
  genauere Erkennung entschieden.
