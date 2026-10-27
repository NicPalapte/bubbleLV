# 0080 – Vorschläge im PDF: OZ und Mengen aus dem LV

- **Status:** akzeptiert
- **Datum:** 2026-10-27
- **Betrifft:** Vorschläge (`frontend/src/lib/docs/docSuggest.ts`, Worker
  `suggest.worker.ts`, `suggester.ts`), Notizen (`frontend/src/lib/docs/docNotes.ts`,
  `frontend/src/lib/notesFile.ts`), Bereich „Dokument“ (`DocumentView.tsx`, `PdfPage.tsx`,
  `SuggestBar.tsx`, `DocumentsProvider.tsx`), Positionskarte (`DocLinks.tsx`)
- **Ersetzt teilweise:** 0072 (dort: „keine OZ-Vorschläge“)
- **Ergänzt:** 0077 (eine Suche)
- **Issue:** #160 (PR 3)

## Worum geht's

- Im Begleit-PDF stehen oft OZ („siehe Pos. 01.02.0030“) und Mengen („120 m³“).
- Nico will, dass Conocto diese Stellen findet und das Verknüpfen anbietet. Den Auftrag
  hat er am 2026-10-27 trotz Feature-Freeze erteilt.
- Grenze aus #160: Ein exakter Abgleich mit dem LV ist öffentlich in Ordnung. Inhaltliches
  Matching (Text ↔ Position ohne OZ oder Menge) bleibt privat.

## Entscheidung

- **OZ:** Zahlenfolgen mit einem Trenner (`.`, `-`, `/` oder Leerzeichen) werden Glied
  für Glied verglichen, ohne führende Nullen. Die Zahl der Glieder muss passen.
  `1.2.30` trifft also `01.02.0030`.
- **Kurzform:** „Pos. 30“, „Position 0030“, „OZ 2.30“ gelten nur direkt nach einem
  Kontextwort (Pos., Position, OZ, Ordnungszahl) und nur, wenn genau eine Position so endet.
- **Mengen** (Nico: Variante B): Zahl im deutschen Format mit einer Einheit, die im LV
  vorkommt. Wert und Einheit müssen genau eine Position treffen. Nicht vorgeschlagen werden
  ganze Zahlen unter 10 und Pauschalen. `cbm` = `m³`, `qm` = `m²`, sonst gelten die
  Einheiten-Gruppen aus `docs/domain/reference/einheiten-gruppen.csv`.
- **Menge neben OZ:** Steht bis 80 Zeichen hinter einer OZ eine Menge, gehört sie zur OZ.
  Die Leiste zeigt dann „PDF 110 m³ · LV 120 m³“, in Amber, wenn die Mengen abweichen.
- **Nur was es im LV gibt:** Passt eine OZ oder Menge auf mehrere Positionen, gibt es
  keinen Vorschlag.
- **Anzeige:** gestrichelt unterstrichen, OZ in Ziegelrot, Mengen in Amber. Antippen öffnet
  „Verknüpfen“ / „Nein“ / „Position zeigen“. Wer die Position zeigt, kann danach noch
  entscheiden.
- **Mensch entscheidet:** Verknüpft wird erst nach „Verknüpfen“. Die Verknüpfung merkt
  sich ihre Herkunft (`sources`: `oz` oder `menge`), die Positionskarte zeigt „über OZ“
  oder „über Menge“. „Nein“ wird dauerhaft in den Notizen gespeichert (`rejected`), damit
  der Vorschlag nicht wiederkommt.
- **Schalter:** Im Kopf des Bereichs „Dokument“ lassen sich OZ- und Mengen-Vorschläge
  einzeln ein- und ausschalten. Standard ist an. Nach einem Neuladen ist wieder alles an.
- **Technik:** Gerechnet wird Seite für Seite in einem Web Worker. Ohne Worker läuft es
  im Hauptfenster. Kein Request, das PDF verlässt den Browser nicht.
- **Speicherformen:** Notizen in der IndexedDB bleiben `v: 6`, die Notiz-Datei bleibt
  Version 4. Es kommen nur Felder dazu (`sources`, `rejected`, `quelle`, `abgelehnt`).
  Ältere Conocto-Versionen lesen die Daten weiter und übergehen die neuen Felder.

## Verworfene Alternativen

- **Mengen nur neben einer OZ** (Variante A): Das hätte weniger falsche Treffer
  gebracht. Nico wollte Mengen auch allein (Variante B).
- **Vorschlagsdatei (`bubble-links-v1`) einlesen:** Sie stand in #160 für PR 3. Sie kommt
  erst, wenn das private Matching wirklich eine schreibt.
- **„Nein“ nur für die Sitzung merken:** Nico will, dass sich das dauerhaft merkt.
- **Neue Versionsnummern für Speicher und Notiz-Datei:** Damit könnten ältere Versionen
  gesicherte Dateien nicht mehr lesen, obwohl sich nur Felder ergänzt haben.

## Folgen

- Eine Baubeschreibung enthält viele Mengen. Deshalb gibt es mehr falsche Mengen- als
  OZ-Vorschläge. Ablehnen kostet einen Klick, und der Schalter „Mengen“ schaltet alle ab.
- Bei großen PDFs werden alle Seiten einmal gelesen, wie bei der Suche (0077).
- Gescannte PDFs ohne Text bringen keine Vorschläge.
- Für den Owner gibt es nichts einmalig zu tun.
