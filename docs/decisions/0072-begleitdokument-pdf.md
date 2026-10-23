# 0072 – Begleitdokument als PDF: lesen, anstreichen, von Hand verknüpfen

- **Status:** akzeptiert
- **Datum:** 2026-10-23
- **Betrifft:** neues Fenster „Dokument“ (`frontend/src/components/docs/`), Notizen
  (`frontend/src/lib/docs/docNotes.ts`, `frontend/src/lib/annotations.ts`), Notiz-Datei
  (`frontend/src/lib/notesFile.ts`), Splitscreen (`frontend/src/lib/workspace/split.ts`)
- **Ergänzt:** 0046, 0047 (was im Browser bleibt), 0061 (Notiz-Datei), 0063
  (Textmarkierungen), 0039 (zweites Browserfenster)
- **Issue:** #160

## Worum geht's

- Zum LV gehören oft Baubeschreibung, Vorbemerkungen oder Gutachten als PDF.
- Nico will beide nebeneinander lesen, im PDF anstreichen und Stellen von Hand mit
  Positionen verknüpfen. Ausdrücklich: **keine Interpretation**, keine Vorschläge.
- Das Dokument muss auf einen zweiten Bildschirm ausgelagert werden können.

## Entscheidung

- **Fenster „Dokument“:** im Split ein Bereich (am Anfang als Reiter neben der Tabelle),
  im Fenster-Modus ein schwebendes Fenster. ↗ öffnet es in einem eigenen Browserfenster
  (zweiter Bildschirm), ↙ holt es zurück.
- **PDF anzeigen:** mit PDF.js (`pdfjs-dist`, Apache-2.0), erst beim ersten PDF geladen.
  Seiten werden nur gezeichnet, wenn sie in der Nähe des sichtbaren Bereichs sind. Suche
  im Text, Zoom, Seitenzahl.
- **Anstreichen:** Rechtsklick auf markierten Text, dieselben 6 Farben wie im Langtext
  (0063).
- **Verknüpfen:** im selben Menü „Mit Position verknüpfen…“. Eine Stelle kann an mehreren
  Positionen hängen. Die Verknüpfung hängt am Positions-Hash (0055), übersteht also
  Umnummerieren. Die Positionskarte zeigt sie unter „Im Dokument“, Klick springt hin.
- **Was gespeichert wird:** nur die Stellen (Seite, Lage, Text, Farbe, Positionen) und
  Name/Seitenzahl des PDF, erkannt am Fingerabdruck der Datei (SHA-256, 12 Zeichen).
  **Das PDF selbst wird nicht gespeichert.** Nach einem Neuladen öffnet man es erneut,
  die Stellen erscheinen wieder.
- **Mehrere PDFs** können nacheinander offen sein, sichtbar ist immer eines.
- **Speicherformen:** IndexedDB-Notizen jetzt Version 6, Notiz-Datei Version 4. Ältere
  Fassungen werden weiter gelesen.
- **Keine Interpretation:** keine automatische Hervorhebung, keine OZ-Vorschläge, kein
  inhaltlicher Abgleich. Ein späterer Abgleich bleibt privat und außerhalb dieses Repos;
  er käme höchstens als Vorschlagsdatei herein.
- **Technik:** der „legacy“-Build von PDF.js, weil der normale Build Browserfunktionen
  voraussetzt, die noch nicht überall da sind.

## Verworfene Alternativen

- **PDF-Bytes in der IndexedDB** – große Dateien, fremde Inhalte dauerhaft im Browser.
  Nico hat sich für „nur Notizen“ entschieden.
- **Regeln (Norm/Frist/Geld) auch übers PDF** und **OZ-Suche mit Vorschlägen** – erst
  später; jetzt bewusst ohne Interpretation.
- **Eigener PDF-Parser** – PDF.js ist der Standard und läuft komplett im Browser.

## Folgen

- Neue Abhängigkeit `pdfjs-dist` (Bundle: eigener, nachgeladener Teil von ca. 430 kB plus
  Worker; die Startseite wird nicht größer).
- „Mehrere Dateien gleichzeitig“ bleibt draußen für LVs. Ein PDF neben dem LV ist erlaubt.
- Für den Owner nichts einmalig zu tun.
