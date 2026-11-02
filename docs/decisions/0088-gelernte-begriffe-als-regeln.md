# 0088 – Gelernte Begriffe als Regeln

- **Status:** akzeptiert
- **Datum:** 2026-10-31
- **Betrifft:** Hervorhebung im Langtext (`frontend/src/lib/rules/rules.ts`, `applyRules`),
  gelernte Begriffe (`frontend/src/lib/highlight/terms.ts`), Admin-Werkzeuge
  (`frontend/src/state/admin.tsx`, `components/layout/AdminDialog.tsx`), Kern
  (`packages/core/src/rules/rule.ts`)
- **Ergänzt:** [0085](0085-ein-regelformat-fuer-alles.md) (Schritt 4 von 5)
- **Ersetzt teilweise:** [0053](0053-marker-verlauf-und-gelernte-begriffe.md) (gelernte
  Begriffe als eigene Liste und `hervorhebungen.csv`)

## Worum geht's

- Gelernte Begriffe waren eine eigene Liste im Browser, dazu die Tabelle
  `hervorhebungen.csv` (leer). Sie liefen neben den Regeln her, mit eigener Logik.
- Schritt 4 aus 0085: Sie werden Regeln im Format `bubble-rule-v1`.

## Entscheidung

- **Eine Regel je Begriff:** Baustein „Begriff“, Suchort Langtext, Wirkung „hervorheben“
  mit Material, Maße oder Wichtig. Name = Begriff, Bemerkung „Gelernter Begriff“.
- **Neue Wirkung „Nicht hervorheben“** (`hervorheben: "aus"`): nimmt jede Fundstelle weg,
  die der Treffer berührt, auch eine der Erkennung. Gilt jetzt auch für Treffer anderer
  Regeln.
- **„Immer hervorheben als …“** an einer Markierung legt direkt eine eigene Regel an. Ein
  zweites Mal mit demselben Begriff ändert nur die Farbe dieser Regel und schaltet sie wieder
  an; Name und Bemerkung bleiben.
- **Einmaliger Umzug:** Begriffe, die ältere Versionen im Browser gespeichert haben, werden
  beim Start eigene Regeln. Erst wenn die Regeln gesichert sind, wird die alte Liste geleert.
- **Vorrang wie bisher:** Erkennung der App zuerst, dann längere Treffer vor kürzeren
  („Sichtbetonklasse SB2“ vor „SB2“). Das gilt jetzt für alle Hervorhebungsregeln, nicht
  nur für Begriffe.
- **Filter „Material“** (0066) nimmt die aktiven Begriff-Regeln mit „Material“.
- **`hervorhebungen.csv` entfällt.** Für alle übernommen wird über „regeln.json
  herunterladen“ und den Grundstock, wie bei jeder Regel.
- **Reiter „Begriffe“ entfällt**, die Begriffe stehen unter „Eigene Regeln“. Das
  Treffer-Protokoll sitzt jetzt in der Kopfzeile der Admin-Werkzeuge.
- **Vergleich alt/neu:** `frontend/tests/highlight/vergleich/hervorhebungen-vorher.json` hält
  die Hervorhebungen vor dem Umzug fest (6 Test-LVs, 6 erfundene Texte, 15 erfundene
  Begriffe, dazu der Grundstock). Mit den Begriffen als Regeln kommt genau dasselbe heraus.

## Verworfene Alternativen

- **Eine Regel je Farbe** mit allen Begriffen: kürzere Liste, aber ein Begriff ließe sich
  nicht einzeln abschalten oder ändern.
- **`hervorhebungen.csv` als Wortliste behalten:** Sie war leer, und ein Begriff mit Farbe
  ist eine Regel, keine Liste.

## Folgen

- Die Liste „Eigene Regeln“ wird mit vielen Begriffen lang. Schritt 5 gruppiert die Liste
  nach Wirkung.
- Owner: Begriffe für alle übernehmen jetzt per „regeln.json herunterladen“ und Eintrag in
  `docs/domain/reference/regeln.json`. Anleitung:
  [`../setup/admin-werkzeuge.md`](../setup/admin-werkzeuge.md).
