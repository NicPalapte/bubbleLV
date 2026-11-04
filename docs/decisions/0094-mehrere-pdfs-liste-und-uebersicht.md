# 0094 – Mehrere PDFs: Dokumentliste und Übersicht mit Miniaturen

- **Status:** akzeptiert
- **Datum:** 2026-11-03
- **Betrifft:** `frontend/src/components/docs/DocPicker.tsx`,
  `frontend/src/components/docs/DocOverview.tsx`, `frontend/src/components/docs/PdfInput.tsx`,
  `frontend/src/lib/docs/docList.ts`, `frontend/src/lib/docs/thumbnail.ts`
- **Ergänzt:** 0072 (Begleitdokument als PDF)

## Worum geht's

- Für ein Angebot liegen oft viele PDFs vor. Mehrere offene PDFs waren bisher nur über eine
  kleine Auswahlliste erreichbar. Bei vielen Dateien war das unübersichtlich und am Tablet
  schwer zu bedienen.
- Nico hat am 03.11.2026 die Varianten A und B aus dem Mockup „Mehrere PDFs anzeigen“
  freigegeben. Variante C (zwei PDFs nebeneinander) kommt später als eigene Funktion
  (Issue #213).
- Nach dem Feature-Freeze ist das eine Verbesserung: Mehrere PDFs öffnen ging schon vorher,
  neu ist nur die Darstellung.

## Entscheidung

- **Dokumentliste (A):** Die Auswahlliste wird ein Knopf „Name · 3 von 12 ▾“. Er öffnet
  eine Liste mit Name, Seitenzahl und Zahl der verknüpften Stellen, ab 6 PDFs mit
  Suchfeld. Unten stehen „+ PDF hinzufügen“ und „Alle als Übersicht“.
- **Übersicht (B):** Der Bereich „Dokument“ kann alle offenen PDFs als Miniatur der ersten
  Seite zeigen, umschaltbar über „Übersicht · N | Lesen“. Es gibt eine Suche im Namen und
  die Sortierung „Reihenfolge geöffnet“, „Name“ oder „Verknüpfungen“. Ein Klick auf eine
  Karte öffnet das PDF zum Lesen.
- Wer mehrere PDFs auf einmal öffnet, landet zuerst in der Übersicht, bei einem PDF
  direkt im Lesen.
- Die Miniatur wird einmal je Dokument im Browser gezeichnet und nur für die Sitzung
  gemerkt. Keine PDF-Bytes, kein Bild im Speicher (Entscheidung 0046).
- Im leeren Bereich „Dokument“ öffnen der Dateidialog und das Hineinziehen jetzt alle
  gewählten PDFs, nicht nur das erste (Issue #211).
- Übersicht oder Lesen ist Zustand der Sitzung. Er ändert nie Filter, Suche oder Auswahl.

## Verworfene Alternativen

- **Reiter je PDF:** werden ab etwa 5 Dateien zu eng, vor allem am Tablet.
- **„Gruppieren“ schon jetzt als grauer Knopf:** ein Knopf ohne Funktion verwirrt.
  Gruppieren (z. B. nach Dokumentart) kommt, wenn der Kern die Art liefert.

## Folgen

- Kein Schritt für den Repo-Owner nötig.
