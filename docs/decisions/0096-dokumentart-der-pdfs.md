# 0096 – Dokumentart der PDFs: erkennen, von Hand ändern, danach sortieren

- **Status:** akzeptiert
- **Datum:** 2026-11-06
- **Betrifft:** `packages/core/src/docs/docKind.ts`, `frontend/src/lib/docs/docList.ts`,
  `frontend/src/lib/docs/docNotes.ts`, `frontend/src/components/docs/DocKindChip.tsx`,
  `DocOverview.tsx`, `DocPicker.tsx`, `DocumentView.tsx`, `DocumentsProvider.tsx`
- **Ergänzt:** 0094 (Dokumentliste und Übersicht), 0072 (Begleitdokument als PDF)

## Worum geht's

- Für ein Angebot liegen viele PDFs vor: Baubeschreibung, Vertrag, Gutachten, Pläne …
  Wer sucht, denkt in diesen Arten, nicht in Dateinamen.
- Die Regeln für die Art gab es bisher nur im Kern (bauonto, `erkennen/dokumentart.py`).
  Nico will sie in der App haben (06.11.2026), mit einem Etikett je PDF, das man ändern und
  nach dem man sortieren kann. Mockup „PDFs nach Dokumentart“ (A–C) freigegeben.
- Abschnitte (Gliederung im PDF) braucht Nico vorerst nicht; nicht Teil davon.

## Entscheidung

- **Erkennen im Browser, erste Regel gewinnt:**
  1. Dateiname: dieselben Wortregeln wie in bauonto (Reihenfolge zählt).
  2. Format der ersten Seite größer als A3 ⇒ Plan.
  3. Titel der ersten Seite (Text in der größten Schrift): dieselben Wortregeln, ohne „Foto“.
  4. Sonst „Nicht erkannt“ (amber).
- Das sind Wort- und Formatregeln, kein inhaltliches Matching. Darum dürfen sie ins
  öffentliche Bundle. Inhaltliches Verknüpfen bleibt privat im Kern.
- Der Ordnername fehlt im Browser (PDFs kommen einzeln). Die Ordner-Regel aus bauonto gibt
  es darum hier nicht.
- **Etikett je PDF:** auf jeder Karte der Übersicht und neben dem Namen beim Lesen. Antippen
  öffnet die Liste der Arten (Zeilen 44 px, Tablet). Oben steht, woran die Art erkannt
  wurde. „Zurück auf erkannte Art“ nimmt eine Wahl von Hand weg.
- **Von Hand gewählt** wird gemerkt wie alle Notizen zum PDF: am Fingerabdruck des PDFs
  (`DocInfo.kind` in `annotations.documents`), im Browser-Speicher und in der Notiz-Datei.
  Neues Feld, ältere Fassungen lesen es nicht und behalten den Rest. Die erkannte Art wird
  nicht gespeichert, sie wird beim Öffnen neu berechnet.
- **Sortieren:** neue Sortierung „Dokumentart“, Standard. Übersicht und Dokumentliste
  sortieren gleich, mit Überschrift je Art; nicht erkannte zuletzt.
- Zählung (0056): nur das Ereignis `dokument-art`, nie Art oder Name.

## Verworfene Alternativen

- **Regeln nur im Kern lassen und als Datei einlesen:** Nico will die Logik in der App;
  ohne Kern gäbe es sonst gar keine Art.
- **Regeln jetzt schon über den Regeleditor (0081) änderbar:** später, eigener Schritt.
- **Gemeinsame Regeldatei für App und bauonto:** vorerst nicht. Beide Seiten halten die
  Muster gleich, abgesichert durch dieselben Testfälle (`packages/core/tests/docs/`).
  bauonto ändert gerade die Zerlegung der PDFs, ein Umzug jetzt würde stören.

## Folgen

- Kein Schritt für den Repo-Owner nötig.
- Ändern sich die Muster in bauonto, müssen sie in `packages/core/src/docs/docKind.ts`
  nachgezogen werden (und umgekehrt).
