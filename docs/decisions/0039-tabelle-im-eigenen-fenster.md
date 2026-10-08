# 0039 – Tabelle im eigenen Fenster

- **Status:** akzeptiert
- **Datum:** 2026-10-06
- **Betrifft:** Frontend (Tabellenfenster, Popover, Datentabelle)
- **Ergänzt:** 0034 (Graph als Hauptscreen)

## Worum geht's

Wer zwei Bildschirme hat, will den Graphen auf dem einen und die Tabelle auf dem anderen
sehen. Bisher lag die Tabelle immer als Fenster über dem Graphen.

## Entscheidung

- Im Kopf des Tabellenfensters öffnet ↗ ein eigenes Browserfenster (Pop-up) mit der
  Tabelle. Man zieht es auf den zweiten Bildschirm.
- Das Pop-up ist eine leere Seite derselben App. Die Tabelle wird per React-Portal
  (Darstellung in ein anderes Fenster, aber im selben Programm) hineingezeichnet.
  Filter, Suche, Auswahl und Vergleich sind deshalb ohne Abgleich synchron.
- ↙ im Pop-up holt die Tabelle zurück über den Graphen. Wer das Pop-up schließt,
  schließt die Tabelle.
- Ein Reload oder das Schließen der Hauptseite schließt das Pop-up mit.
- Blockiert der Browser das Pop-up, steht kurz „Pop-up blockiert" im Tabellenkopf.
  Die Tabelle bleibt dann, wo sie war.
- Popover und Klick-außerhalb hören auf das Fenster, in dem sie stehen
  (`useHostWindow`). Sonst öffnete sich das Spaltenmenü auf dem anderen Bildschirm.

## Warum

- Kein Server, kein Request. Die Daten bleiben in einem Browser-Tab, das Pop-up ist
  nur eine zweite Fläche davon.
- Ein Zustand für alles bleibt erhalten (CLAUDE.md, „Ein Filterzustand für Graph und
  Fenster").

## Verworfene Alternativen

- **Zweiter Tab mit eigener App und Abgleich über `BroadcastChannel`** (Nachrichtenkanal
  zwischen Tabs): die Datei müsste in beiden Tabs geladen sein, jeder Zustand doppelt
  gepflegt werden.
- **Pop-up mit eigener Adresse statt leerer Seite:** würde die App dort neu starten,
  ohne geladenes LV.
- **Fensterposition auf dem zweiten Bildschirm automatisch setzen:** braucht eine
  Browser-Berechtigung (Window Management API) und eine Rückfrage beim Nutzer. Das
  Hinüberziehen von Hand reicht.

## Folgen

- Blockiert der Browser Pop-ups für die Seite, muss Nico sie einmal in der Adressleiste
  erlauben. Sonst bleibt die Tabelle im Hauptfenster.
- Tastenkürzel der Kopfleiste (Strg K, „/", „?") und Escape zum Zurücknehmen der Auswahl
  wirken nur im Hauptfenster. Gewollt: das zweite Fenster zeigt nur die Tabelle. Dort
  gelten ihre Tasten wie gewohnt, Escape schließt offene Menüs.
