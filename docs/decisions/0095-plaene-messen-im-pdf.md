# 0095 – Pläne im PDF messen: Ausnahme vom Feature-Freeze

- **Status:** akzeptiert
- **Datum:** 2026-11-05
- **Betrifft:** `packages/core/src/plan/measure.ts`, `frontend/src/lib/docs/planNotes.ts`,
  Fenster „Dokument“ (`frontend/src/components/docs/`), Tabelle, Positionskarte,
  Notizen (`frontend/src/lib/annotations.ts`, `frontend/src/lib/notesFile.ts`)
- **Ergänzt:** 0072 (Begleitdokument als PDF), 0080 (Vorschläge im PDF), 0055 (Positions-Hash)

## Worum geht's

- Seit 24.10. gilt für Conocto Doc ein Feature-Freeze.
- Nico macht für die Plan-Messung eine Ausnahme (Auftrag 05.11.2026). Das Mockup
  „Mockup Pläne messen“ hat er am 04.11. freigegeben.
- Grund: Mengen aus Plänen sind der Kern der Angebotsbearbeitung beim Kalkulator.
- Ablauf: Plan-Messung bis Ende der Woche ab 09.11., danach interner Test bei Nico im
  Unternehmen. Der öffentliche Start (LinkedIn) rückt auf Anfang Dezember.
- Nach der Plan-Messung gilt wieder ein Feature-Freeze. Dann wird in eine stabile
  Version und eine Arbeitsversion („next“, über Cloudflare) getrennt, siehe Issue #189.

## Entscheidung

- **Text oder Plan:** Conocto schätzt je Seite aus Seitengröße und Textmenge
  (größer als A4 oder Querformat mit wenig Text = Plan). Der Mensch stellt je Seite um;
  nur diese Umstellung wird gespeichert. Im Dokument filtert „Alle · Text · Pläne“.
- **Maßstab je Seite:** Steht im Seitentext „M 1:100“ o. ä., schlägt Conocto diesen
  Maßstab vor (gilt nur bei PDF in Originalgröße). Er gilt erst nach „Übernehmen“.
  Sonst: bekannte Strecke messen und Länge eingeben. Der Maßstab gilt für die Seite oder
  für alle Pläne des Dokuments mit demselben Plankopf-Maßstab.
- **Maßstab von Hand:** Findet Conocto keinen, trägt man „1 : x“ selbst ein (Herkunft
  „von Hand“), auf Wunsch für alle Pläne ohne Maßstab.
- **Fläche erkennen:** Bei Rechteck und Kreis wird die geschlossene Linie unter dem
  Mauszeiger erkannt: Seitenbild einmal als Linienmaske, von der Stelle aus füllen
  (`packages/core/src/plan/region.ts`, Bild statt Vektoren: geht auch bei Scans). Nur ein
  Vorschlag, gilt erst nach dem Klick; offene Räume (Tür) ergeben keinen. Am Tablet ohne
  Hover nicht verfügbar. Stückzahl per Symbol erkennen kommt später (Nico, 06.11.).
- **Zoom und Bild:** Jede Seite auf die Bereichsbreite eingepasst, Zoom bis 1600 %. Mausrad
  zoomt über Plänen, Ziehen verschiebt. Eine Zeichenfläche hat höchstens 8 Mio.
  Bildpunkte, sonst zeichnen Browser sie schwarz; bei großem Zoom kommt ein scharfes Bild nur
  vom sichtbaren Ausschnitt dazu (`components/docs/pageCanvas.ts`).
- **Messen:** Werkzeuge nur Länge, Fläche, Stück (Nico, 06.11.). Länge als Strecke (zwei
  Punkte) oder Kette (Doppelklick beendet), Fläche als Rechteck, Kreis oder Polygon. Bedienung
  wie im CAD: Esc beendet den Befehl, Enter schließt ab, Entf löscht die Auswahl. Mit Shift
  mehrere Messungen wählen; verknüpfen nur bei gleicher Art (gleiche Einheit).
- **Verknüpfen:** Jede Messung hängt an einer oder mehreren Positionen, gespeichert über
  den Positions-Hash (0055).
- **VA-Menge und Herkunft:** Tabelle und Positionskarte zeigen die VA-Menge und ihre
  Herkunft. „Plan“ = Summe der verknüpften Messungen. „Rechenansatz“ hat Vorrang: Bausteine
  werden im Plan angetippt (gedruckte Maße einer Maßkette oder eigene Messungen), dazwischen
  Rechenzeichen (+ − × : Klammern). Zahlen werden nie von Hand getippt, damit jede Zahl
  eine Fundstelle im Plan hat. „BIM“ kommt, wenn Conocto BIM Mengen übergeben kann.
  Die Spalten erscheinen in der Tabelle erst, wenn eine Position eine VA-Menge hat.
- **Keine Wertung:** Die Differenz zur LV-Menge wird nur gezeigt, nie als Hinweis oder
  Fehler.
- **Speicher:** In den Notizen der letzten Datei (IndexedDB, weiter Version 6) als
  optionales Feld `plans`; in der Notiz-Datei als `plaene`. Ältere Fassungen lesen das
  Feld nicht und behalten den Rest. Das PDF selbst wird weiter nicht gespeichert.
- **Rechnungen** (Länge, Fläche, Maßstab, Plankopf lesen, Seitenart schätzen) liegen im
  Kern, damit Conocto BIM sie später mitnutzen kann.

## Verworfene Alternativen

- **Maßstab aus dem Plankopf ohne Rückfrage** – ein verkleinert gedrucktes PDF gäbe
  falsche Mengen. Vorschlag + Übernehmen, dazu Probe an einer zweiten Strecke.
- **Messwerte speichern** – nach neuem Maßstab wären alte Werte falsch.
- **Fangen auf Linien im PDF** – braucht die Vektordaten jeder Seite; zu viel für eine
  Woche. Stattdessen Lupe beim Setzen und Zoom.
- **Differenz zur LV-Menge als Prüfhinweis** – wäre ein Urteil; Prüfregeln bleiben
  Hinweise ohne Wertung von Mengen.

## Folgen

- Kein neues Paket.
- Für Nico: beim internen Test Pläne als PDF in Originalgröße nutzen, sonst den Maßstab
  per Strecke festlegen.
- Nach dem Merge: wieder Feature-Freeze, dann Issue #189 (stabile Version auf
  conocto.app, Arbeitsversion auf next.conocto.app über Cloudflare).
