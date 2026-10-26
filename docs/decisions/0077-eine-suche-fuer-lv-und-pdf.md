# 0077 – Eine Suche für LV und PDFs, Begriff aus dem Text übernehmen

- **Status:** akzeptiert
- **Datum:** 2026-10-26
- **Betrifft:** Suchleiste (`frontend/src/components/layout/TopBar.tsx`), Liste darunter
  (`frontend/src/components/docs/SearchSources.tsx`), Suche in PDFs
  (`frontend/src/lib/docs/docSearch.ts`, `DocumentsProvider.tsx`, `DocumentView.tsx`),
  Leiste beim Markieren (`frontend/src/components/common/PaintBar.tsx`, `paint.ts`)
- **Ergänzt:** 0058 (Suche, Nicht-Treffer), 0063 (Textmarkierungen), 0072 (Begleit-PDF)

## Worum geht's

- Nico will Begriffe im Langtext oder im PDF markieren und direkt suchen.
- Und er will eine Suche über alle Dokumente. Im PDF sollen die Treffer aber nur zu
  sehen sein, wenn das PDF offen ist.
- Bisher hatte das Dokument ein eigenes Suchfeld, getrennt von der Suchleiste oben.
- Mockup am 2026-10-26 freigegeben (Feature-Freeze für diesen Wunsch gelockert).

## Entscheidung

- **Eine Suche:** Der Begriff aus der Suchleiste gilt auch in allen PDFs dieser
  Sitzung. Das Suchfeld im Bereich „Dokument“ ist dasselbe Feld, nur an anderer Stelle.
  Wer dort tippt, sucht auch im LV.
- **LV wie bisher:** Graph und Tabelle zeigen die Treffer (dimmen/ausblenden, 0058).
- **PDF-Treffer filtern das LV nicht.** Sie sind ein Wegweiser. Verknüpfte Stellen
  (0072) machen eine Position nicht zum Treffer.
- **Liste unter der Suchleiste:** Sie erscheint nur, wenn es ein PDF gibt. Sie zeigt
  die Positionen im LV und für jedes PDF die Seiten und die Zahl der Treffer.
  „Zeigen ›“ öffnet den Bereich „Dokument“ an der ersten Fundstelle. Ein PDF, das nach
  dem Neuladen nicht mehr offen ist, steht mit „Datei wählen…“ da (PDF-Bytes werden
  nicht gespeichert, 0072).
- **Gelb markiert** sind Treffer nur im PDF, das gerade im Bereich „Dokument“ zu sehen
  ist.
- **Suchen im PDF:** Groß- und Kleinschreibung und Leerraum zählen nicht, denn PDFs
  liefern Leerzeichen und Zeilenumbrüche unzuverlässig. Mindestens 2 Zeichen.
- **Begriff übernehmen:** Text im Langtext oder im PDF markieren. Im Menü (Rechtsklick)
  steht oben „In Suche übernehmen“. Der Begriff ersetzt den Suchtext, Filter bleiben.
- **Tablet:** Ohne Rechtsklick erscheint dasselbe Menü, sobald die Auswahl nach dem
  Berühren kurz ruht. Am Touch-Gerät sind die Zeilen größer.

## Verworfene Alternativen

- **PDF-Treffer als LV-Filter** über verknüpfte Stellen: würde eine Deutung nahelegen.
  0072 will ausdrücklich keine Interpretation.
- **Begriff an die Suche anhängen** statt ersetzen: Die Suche verknüpft Wörter, das
  Ergebnis wäre schwer vorherzusehen.
- **Zwei Suchfelder** (LV und Dokument getrennt): Das war bisher so. Nico will eine Suche.

## Folgen

- Bei großen PDFs liest die Suche beim ersten Begriff alle Seiten einmal. Danach ist
  der Text zwischengespeichert.
- Für den Owner gibt es nichts einmalig zu tun.
