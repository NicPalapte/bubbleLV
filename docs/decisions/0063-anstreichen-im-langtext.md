# 0063 – Eigene Textmarkierungen im Langtext

- **Status:** akzeptiert
- **Datum:** 2026-10-21
- **Betrifft:** Positionskarte (Langtext), eigene Notizen (`frontend/src/lib/annotations.ts`),
  Speicher (`frontend/src/lib/persist/lastLv.ts`), Notiz-Datei (`lib/notesFile.ts`),
  CSV-Export
- **Baut auf:** 0047, 0057 (Notizen am Positions-Hash), 0061, 0062

## Worum geht's

- Der Owner wollte Stellen im Langtext selbst anstreichen, wie mit einem Textmarker.
- Mockup Variante C am 2026-10-21, vom Owner freigegeben. Ohne Filter „mit Anstreichung".

## Entscheidung

- Text im Langtext auswählen ⇒ kleines Menü mit sechs festen Farben: Gelb, Orange,
  Grün, Blau, Rosa, Lila.
- Jede Farbe kann einen eigenen Namen bekommen (z. B. Gelb = wichtig, Grün = Maß), über
  „Farben benennen…" im Menü. Der Name steht im Menü, in der Tabelle und im CSV.
  - Gilt in diesem Browser für alle Dateien (IndexedDB, Schlüssel `farbnamen`).
  - Kommt mit in die Notiz-Datei (`farben`). Beim Laden übernimmt Bubble nur Namen für
    Farben, die hier noch keinen haben.
  - Owner-Wahl am 2026-10-21: feste Farben mit eigenen Namen statt frei wählbarer Farben.
- Mit Admin-Zugang steht in derselben Leiste „Begriff lernen…" (0053).
- Über dem Langtext zeigt der Text-Cursor, dass sich markieren lässt.
- Unter „Eigenschaften": Abschnitt „Meine Textmarkierungen" als kleine Tabelle
  (Farbe | Text), ✕ entfernt eine.
- Label „Meine Textmarkierungen" neben den Fundstellen-Labels blendet die Farben im Text
  aus. Eine neue Markierung blendet sie wieder ein.
- In der Oberfläche heißt es „Textmarkierung" (Wunsch des Owners); im Code und in der
  Notiz-Datei bleibt der Name `Highlight` / `anstreichungen`.
- Die Zeile „Status" fällt aus den Eigenschaften der Positionskarte. Den Stand zeigt der
  Fortschritt (0062). Die Spalte „Status" in der Tabelle bleibt vorerst.
- Gespeichert wird je Position: Farbe, Stelle im Text, angestrichener Text, Zeitpunkt.
  Wie alle Notizen am Positions-Hash, zur letzten Datei in diesem Browser.
- Findet sich der Text nicht mehr an der Stelle, wird er im ganzen Langtext gesucht.
  Fehlt er ganz, bleibt der Eintrag in der Liste mit „nicht mehr im Text".
- Notiz-Datei Version 3 mit `anstreichungen`. CSV-Spalte „Textmarkierungen".
- Kein Filter nach Anstreichungen (Wunsch des Owners).

## Warum

- Die Einfärbung nutzt die CSS Custom Highlight API: der Browser färbt Textbereiche ein,
  ohne den Langtext umzubauen. Suchtreffer und Fundstellen bleiben unberührt.
- Stelle + Text statt nur Stelle: übersteht kleine Textänderungen in einer neuen Datei.

## Verworfene Alternativen

- **Knopf „Kommentar" in der Leiste:** doppelt zum Kommentar-Verlauf der Position.
- **Farben frei anlegen (Farbwähler):** mehr Aufwand, Regeln für gelöschte Farben nötig,
  Lesbarkeit in hell/dunkel nicht gesichert. Feste Farben mit Namen reichen vorerst.
- **Anstreichung als `<mark>` im DOM:** kollidiert mit Suchtreffern und Fundstellen.

## Folgen

- Speicherform `v: 5`. `v: 4` wird gelesen (ohne Anstreichungen).
- Notiz-Datei Version 3 mit `anstreichungen` und `farben`. Versionen 1 und 2 werden weiter
  gelesen.
- Browser ohne die Highlight API (ältere Firefox-Versionen) zeigen nur die Liste,
  nicht die Farbe im Text.
