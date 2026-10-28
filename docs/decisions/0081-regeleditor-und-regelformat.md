# 0081 – Regeleditor und Regelformat `bubble-rule-v1`

- **Status:** akzeptiert (Prototyp)
- **Datum:** 2026-10-28
- **Betrifft:** Kern (`packages/core/src/rules/`, `packages/core/src/text/`), Admin-Werkzeuge
  (`frontend/src/components/admin/`), Langtext und Positionskarte (`PositionDetails.tsx`,
  `PositionLinks.tsx`), Notizen (`frontend/src/lib/annotations.ts`,
  `frontend/src/lib/positionLinks.ts`), Speicher (`frontend/src/lib/persist/lastLv.ts`)
- **Ergänzt:** 0053 (Admin-Werkzeuge), 0049 (Beziehungen), 0060 (Wissensgraph), 0080 (Satzgrenze)
- **Konzept:** „Gemeinsame Regellogik für Doc und core“ (Claude Doc, 2026-10-27)

## Worum geht's

- Nico will, dass jede Firma eigene Regeln baut, nach denen Dokumente gelesen werden.
  Ein Grundstock an Regeln soll später für alle Firmen gelten.
- Bisher gab es nur gelernte Begriffe (ein Wort, eine Farbe). Regeln wie „Nachtrag und
  ausgeschlossen im selben Satz“ ließen sich nicht ausdrücken.
- Auftrag am 2026-10-27 trotz Feature-Freeze: erster Prototyp in den Admin-Werkzeugen.
  Am 2026-10-28 dazu: Regel aus einer Markierung, und Regeln, die Positionen verbinden,
  mit Vorschau und Bestätigen.

## Entscheidung

- **Ein Format im Kern:** `bubble-rule-v1` (`packages/core/src/rules/rule.ts`). Eine Regel
  hat Bedingung, Wirkung, Geltung und Status, dazu Kennung mit Version und Herkunft.
  - Bedingung: Bausteine „Begriff“ (Schreibweise wie in den Materialtabellen, `#` und `*`),
    „Menge“ (Zahl mit Einheit, wahlweise nur eine Einheit), „Norm“ (Fundstellen des
    Norm-Extraktors der App), verbunden mit „alle“ oder „eines“, dazu Ausschluss „nicht“.
  - Abstand: gleicher Satz, höchstens N Zeichen, oder ganzer Text. Gesucht wird im
    Kurztext, im Langtext oder in beiden.
  - Wirkung: hervorheben (Wichtig, Material, Maße) oder Positionen verbinden.
- **Ein Auswerter im Kern** (`evaluate.ts`), reine Funktionen. bauonto kann ihn später
  per Befehl aufrufen, statt ihn in Python nachzubauen.
- **Eine Satzlogik:** `sentenceAround` liegt jetzt im Kern (`text/sentence.ts`) und gilt für
  Regeln und die Mengen-Vorschläge im PDF (0080). Ein Punkt beendet den Satz nur vor einem
  Großbuchstaben. Ebenso liegt die Stichwort-Schreibweise im Kern (`text/stichwort.ts`).
- **Grundstock:** `docs/domain/reference/regeln.json`, gilt für alle, in der App nur lesbar,
  als eigene Regel kopierbar. Zum Start drei Beispielregeln.
- **Eigene Regeln:** im Browser (IndexedDB, Schlüssel `regeln`), unabhängig von der Datei,
  wie die gelernten Begriffe. Austausch über eine Datei `regeln.json` (laden, herunterladen).
- **Status:** „Entwurf“ zeigt Treffer nur in der Vorschau des Editors. Erst „Aktiv“ wirkt im
  LV: Hervorhebung im Langtext bzw. Vorschläge in der Positionskarte. „Aus“ ruht.
- **Regel aus Markierung:** Mit Admin-Zugang bietet die Leiste im Langtext „Als Regel…“.
  Mengen werden Baustein „Menge“, kurze Stellen bleiben ein Begriff (Zahlen als `#`), lange
  Stellen geben bis zu drei tragende Wörter. Gespeichert werden nur diese Bausteine.
- **Verbinden:** Eine Verbindungsregel hat eine zweite Bedingung für die Zielposition und
  „nur mit gleichem Abschnitt / gleicher Einheit“. Paare werden erst danach vorgruppiert
  gebildet, nie alle gegen alle, höchstens 500 je Regel.
  - Vorschläge erscheinen gestrichelt im Editor und in der Positionskarte („Verbunden“) mit
    „Ja“/„Nein“. Erst „Ja“ macht eine Verbindung. „Nein“ wird gemerkt.
  - Jedes Urteil steht mit Regel (`id@version`) und Zeitpunkt in den Notizen der Datei,
    unter beiden Positions-Hashes (Feld `links`, Speicherform `v: 6` nur ergänzt).
  - Vorschläge aktiver Regeln werden einmal je LV und Regelstand berechnet und
    zwischengespeichert (`lib/rules/linkSuggestions.ts`), nicht je Render.
- **Rechnung auf dem UI-Thread, nicht im Worker:** Vorschläge und Treffer-Vorschau laufen
  im Browserfenster selbst. Bei 10.000 Positionen bleiben beide unter 200 ms („Fenster
  öffnen“, docs/scope.md); das prüft `frontend/tests/perf/regeln.test.ts`. Regeln ändern
  sich nach dem Laden, ein Worker müsste das LV dafür ein zweites Mal halten. Reißt der Test
  die Schranke, zieht die Rechnung in den Worker.

## Warum

- Ein Format und ein Auswerter für Doc und core: die Auswertung kann nicht auseinanderlaufen.
- Regeln enthalten nur Begriffe und Einstellungen, nie Text aus einem LV. So lassen sich
  Regeln teilen, ohne Projektdaten zu teilen.
- KI oder Regel schlagen vor, der Mensch entscheidet: jedes Ja und Nein ist ein Urteil und
  später Goldstandard für core.

## Verworfene Alternativen

- **Regeln als CSV wie `hervorhebungen.csv`:** Bausteine, „alle/eines“ und Verbindungen
  passen nicht in eine Zeile. JSON lässt sich trotzdem in jedem Editor lesen.
- **Eigener Normerkenner im Kern:** zwei Erkenner würden auseinanderlaufen. Der Kern nimmt
  die Fundstellen der App entgegen.
- **Verbindungen sofort gelten lassen:** widerspricht „Mensch entscheidet“ und 0049 (keine
  wertenden Regeln). Darum nur Vorschlag, bis jemand bestätigt.
- **Satz bis Zeilenumbruch:** Vorschlag im Konzept. Verworfen, damit Regeln und PDF-Vorschläge
  dieselbe Satzgrenze haben (0080).

## Folgen

- Admin-Werkzeuge haben den Reiter „Regeln“. Der ausgegraute Reiter „Prüfregeln“ entfällt,
  „Material“ bleibt ausgegraut.
- Prototyp-Grenzen: keine Suche im PDF, keine Wirkung „Merkmal setzen“, Geltung nur
  Grundstock oder eigene Firma (Projekt und Auftraggeber später). Die Notiz-Datei (0061)
  nimmt Verbindungen noch nicht mit.
- Neue Grundstock-Regeln: im Editor bauen, `regeln.json` herunterladen, Einträge nach
  `docs/domain/reference/regeln.json` übernehmen und `geltung` auf `allgemein` setzen.
