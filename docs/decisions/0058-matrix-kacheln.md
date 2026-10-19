# 0058 – Matrix als Kacheln, Gliederungswechsel gleitet

- **Status:** akzeptiert
- **Datum:** 2026-10-19
- **Betrifft:** `frontend/src/lib/graph/layoutMap.ts`, `frontend/src/components/graph/BubbleGraph.tsx`,
  `frontend/src/components/filter/DisplayControls.tsx`; ergänzt 0035 und 0033

## Worum geht's

- Die Matrix (Zeilen × Spalten) zeigte jede Zelle als Kreis. Bei vielen Zellen war das
  Raster schwer zu lesen, leere Zellen fehlten ganz.
- Im Mockup der Startseite gefiel Nico die Matrix als Kacheln mit runden Ecken, Farbe und
  Hervorhebung, samt Animation.
- Lange Abschnittstitel als Spalten überlappen sich nebeneinander.

## Entscheidung

- Matrix **mit Spalten**: jede Zelle ist eine Kachel mit runden Ecken.
  - Leere Zellen bleiben als blasse, gestrichelte Kachel stehen.
  - Farbe in 5 Stufen nach Anzahl, bezogen auf die vollste Kachel (`--heat-1` bis `--heat-5`).
  - Anzahl und Hinweise oben rechts, Mengensumme oben links, wenn Platz ist.
  - Spaltenbreite nach der vollsten Kachel der Spalte, Zeilenhöhe nach der vollsten der Zeile.
    Die Punkte liegen in Reihen, die größten oben links. Punktgröße wie bisher (Menge, Preis
    oder gleich).
- Matrix **ohne Spalten** bleibt bei Kreisen.
- Hervorhebung: Maus über einer Kachel färbt sie und ihre Zeilen- und Spaltenbeschriftung
  blau. Die Kachel der gewählten Position bleibt blau umrandet.
- Wechsel von Gliederung, Zeilen oder Spalten: die Punkte gleiten in 0,9 s an ihren neuen
  Platz, der Ausschnitt gleitet mit, danach blenden Kreise bzw. Kacheln ein.
  - Ein Filterwechsel gleitet nicht, er springt wie bisher.
  - Keine Animation ab 3.000 Punkten im Graphen und bei „Bewegung reduzieren“ im System.
  - Während des Gleitens keine Hinweisschilder, Notizschilder und keine Linie zur Karte.
- „Abschnitt“ steht nur noch bei den Zeilen zur Wahl, nicht bei den Spalten.

## Warum

- Kacheln machen das Raster sichtbar, auch dort, wo nichts liegt. Die Farbe zeigt auf einen
  Blick, wo sich Positionen sammeln.
- Das Gleiten zeigt, wohin eine Position wandert. Ohne Bewegung muss man sie neu suchen.
- Die Grenze von 3.000 Punkten hält die Zielwerte aus `docs/scope.md` ein: jeder Punkt ist
  ein eigenes SVG-Element, das der Browser bewegt.

## Verworfene Alternativen

- **Alle Punkte in Kacheln gleich groß** (wie im Startseiten-Mockup) – die Größe nach Menge
  ist eine Aussage über das LV, sie bleibt.
- **Abschnittstitel als Spalten kürzen oder drehen** – gekürzt sind sie nicht mehr eindeutig,
  gedreht schlecht lesbar.
- **Animation mit einer Bibliothek** – CSS-Übergänge reichen, keine neue Abhängigkeit.

## Folgen

- Ausnahme von der Regel „keine Animationen“ aus dem Design-Kit (0033): nur dieser Wechsel.
- Nichts für den Repo-Owner zu tun.
