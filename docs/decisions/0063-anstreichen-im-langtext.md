# 0063 – Eigene Anstreichungen im Langtext

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

- Text im Langtext auswählen ⇒ kleine Leiste mit drei Farben: Gelb, Orange, Grün.
- Mit Admin-Zugang steht in derselben Leiste „Begriff lernen…" (0053).
- Unter dem Langtext: Liste „Meine Anstreichungen" mit ✕ zum Entfernen.
- Gespeichert wird je Position: Farbe, Stelle im Text, angestrichener Text, Zeitpunkt.
  Wie alle Notizen am Positions-Hash, zur letzten Datei in diesem Browser.
- Findet sich der Text nicht mehr an der Stelle, wird er im ganzen Langtext gesucht.
  Fehlt er ganz, bleibt der Eintrag in der Liste mit „nicht mehr im Text".
- Notiz-Datei Version 3 mit `anstreichungen`. CSV-Spalte „Anstreichungen".
- Kein Filter nach Anstreichungen (Wunsch des Owners).

## Warum

- Die Einfärbung nutzt die CSS Custom Highlight API: der Browser färbt Textbereiche ein,
  ohne den Langtext umzubauen. Suchtreffer und Fundstellen bleiben unberührt.
- Stelle + Text statt nur Stelle: übersteht kleine Textänderungen in einer neuen Datei.

## Verworfene Alternativen

- **Knopf „Kommentar" in der Leiste:** doppelt zum Kommentar-Verlauf der Position.
- **Anstreichung als `<mark>` im DOM:** kollidiert mit Suchtreffern und Fundstellen.

## Folgen

- Speicherform `v: 5`. `v: 4` wird gelesen (ohne Anstreichungen).
- Notiz-Datei Version 3. Versionen 1 und 2 werden weiter gelesen.
- Browser ohne die Highlight API (ältere Firefox-Versionen) zeigen nur die Liste,
  nicht die Farbe im Text.
