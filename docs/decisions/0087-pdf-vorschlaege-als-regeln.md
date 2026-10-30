# 0087 – PDF-Vorschläge als Regeln

- **Status:** akzeptiert
- **Datum:** 2026-10-30
- **Betrifft:** Vorschläge im PDF (`frontend/src/lib/docs/docSuggest.ts`,
  `frontend/src/lib/docs/suggestRules.ts`), Grundstock (`docs/domain/reference/regeln.json`),
  Notizen (`frontend/src/lib/docs/docNotes.ts`), Bereich „Dokument“ (`DocumentsProvider.tsx`)
- **Ergänzt:** [0085](0085-ein-regelformat-fuer-alles.md) (Schritt 3 von 5)
- **Ersetzt teilweise:** [0080](0080-oz-und-mengen-vorschlaege-im-pdf.md) (dort: Schalter
  nach Neuladen wieder an, feste Schwellwerte im Code)

## Worum geht's

- Die Vorschläge im PDF (OZ und Mengen, 0080) waren feste Logik im Code, mit fest
  eingebauten Zahlen.
- Schritt 3 aus 0085: Sie werden Regeln im Format `bubble-rule-v1`, wie die Prüfregeln.

## Entscheidung

- **Zwei Grundstock-Regeln** in `regeln.json`, beide mit Suchort `pdf` und der Wirkung
  „mit PDF verknüpfen“:
  - „OZ im Dokument“ (`pdf-oz`), eingebaut `oz-im-pdf`, Parameter `menge-hinter-oz` (80).
  - „Menge im Dokument“ (`pdf-menge`), eingebaut `menge-im-pdf`, Parameter
    `kleinste-ganze-zahl` (10).
- **Logik bleibt eingebaut** in `docSuggest.ts`: Sie braucht das ganze LV (welche OZ und
  Menge eindeutig ist). Die Regel sagt nur, ob sie läuft und mit welchen Zahlen.
- **Regel aus ⇒ Art fehlt.** Gesucht wird trotzdem beides, damit eine Menge direkt hinter
  einer OZ nicht plötzlich als eigener Mengen-Vorschlag auftaucht. Der Schalter im
  Dokument verschwindet dann.
- **Kaputter oder fehlender Parameter ⇒ bisheriger Wert**, kein Fehler.
- **Schalter im Dokument gemerkt:** „OZ“ und „Mengen“ aus- oder einblenden steht in den
  Notizen der Datei (`hidden`), übersteht also ein Neuladen. Ein neues LV beginnt mit
  allen an, weil es eigene Notizen hat. Die Notiz-Datei (0061) nimmt den Schalter nicht mit.
- **Vergleich alt/neu:** `frontend/tests/docs/vorschlaege-vorher.json` hält die Vorschläge
  vor dem Umzug fest (12 erfundene PDF-Seiten, 25 Vorschläge). Mit den Grundstock-Regeln
  kommt genau dasselbe heraus.

## Verworfene Alternativen

- **Logik als Bausteine (Begriff, Menge) nachbauen:** Eindeutigkeit über das ganze LV und
  die Wortwahl bei gleicher Menge lassen sich so nicht ausdrücken.
- **Eine Regel für beide Arten:** Dann ließe sich nur beides zusammen abschalten.
- **Schalter im Browser statt in den Notizen:** Er gehört zum LV, nicht zum Browser.

## Folgen

- Im Reiter „Regeln“ der Admin-Werkzeuge stehen zwei neue Grundstock-Regeln, nur zum
  Lesen. Abschalten kommt mit dem Editor-Ausbau (Schritt 5).
- Owner: Schwellwerte jetzt in `regeln.json` ändern, nicht mehr im Code.
