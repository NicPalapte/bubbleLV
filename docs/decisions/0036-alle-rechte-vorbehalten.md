# 0036 – Alle Rechte vorbehalten statt AGPL

- **Status:** akzeptiert
- **Datum:** 2026-10-05
- **Betrifft:** Lizenz, Build, Frontend

## Worum geht's

Im Repo lag seit PR #13 die AGPL-3.0. Die erlaubt jedem, den Code zu nutzen und zu
verändern. Der Owner will die Nutzung vorerst verbieten (Issue #77).

## Entscheidung

- `LICENSE`: alle Rechte vorbehalten. Lesen auf GitHub bleibt möglich, Nutzung nur mit
  schriftlicher Erlaubnis.
- `frontend/package.json`: `"license": "UNLICENSED"` (npm-Schreibweise für „keine
  Lizenz erteilt“).
- Der Build erzeugt `lizenzen.txt` mit allen Fremd-Bausteinen im Bundle und ihren
  Lizenztexten (`frontend/build/thirdPartyLicenses.ts`). Quelle ist die `package.json`,
  keine Handpflege. Das Logo-Menü verlinkt die Datei.
- Der Haftungssatz „keine Bewertung und kein Rechtsrat“ steht schon in der Prüfung.

## Warum

- Wunsch des Owners: vorerst keine Weiternutzung durch Dritte.
- Fremd-Lizenzen (MIT, ISC, SIL OFL der Schriften) verlangen, dass ihr Text mit der App
  ausgeliefert wird. Das gilt unabhängig von der eigenen Lizenz.

## Verworfene Alternativen

- **AGPL behalten** – widerspricht dem Wunsch des Owners.
- **Repo auf privat stellen** – GitHub Pages braucht im kostenlosen Tarif ein öffentliches Repo.
- **Lizenzliste von Hand** – läuft bei jedem Paket-Update auseinander.

## Folgen

- Wer den Code bis heute unter AGPL bezogen hat, behält diese Rechte für den damaligen
  Stand. Die Änderung gilt für alles ab jetzt.
- Rechteinhaber steht als `NicPalapte` in `LICENSE`. Owner: bei Bedarf durch den
  vollen Namen ersetzen.
- Neue Laufzeit-Abhängigkeit → erscheint automatisch in `lizenzen.txt`.
