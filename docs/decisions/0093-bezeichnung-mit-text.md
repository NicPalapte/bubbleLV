# 0093 – Abschnittsbezeichnung mit Text: erster Absatz ist der Name

- **Status:** akzeptiert
- **Datum:** 2026-11-03
- **Betrifft:** `packages/core/src/gaeb/text.ts` (`splitLabel`), `gaeb/parser.ts`,
  `model/lvDraft.ts`, `export/lvExport.ts`, `frontend/src/components/common/NodeDetails.tsx`,
  `frontend/src/lib/overview/importLog.ts`
- **Ergänzt:** 0068 (LV-Export), Issue #196

## Worum geht's

- Manche Programme schreiben ganzen Beschreibungstext in die Bezeichnung eines Abschnitts
  oder Loses (`LblTx`). Das GAEB-Schema 3.3 erlaubt das: `LblTx` ist dort eine
  „mehrzeilige Textbeschreibung“. Fachlich gehört der Text eher in einen Hinweistext.
- Bisher wurde alles zu einer Zeile zusammengezogen. Im Graphen stand dann ein Satz statt
  eines Namens (PR #209 kürzt ihn nur).

## Entscheidung

- **Name = erster Absatz.** Der Rest wird zum Feld `text` von Abschnitt und Los.
- **Getrennt wird nur an echten Absätzen**, also nach der Zeilen-Aufbereitung aus Issue #41
  (z. B. Leerzeile). Eine vom Export umbrochene lange Überschrift bleibt zusammen.
- **Nichts geht verloren:** Die Karte des Abschnitts zeigt „Text zum Abschnitt“. Der
  Import-Log nennt alle betroffenen Abschnitte; ein Klick wählt den Abschnitt aus.
- **LV-Export:** `text` kommt als optionales Feld dazu, nur wo es Text gibt. Das Schema
  bleibt `conocto-lv-export-v1`; bauonto ignoriert unbekannte Felder.
- Der Positions-Hash ist nicht betroffen: Er enthält keine Abschnittsnamen.

## Verworfene Alternativen

- **Längen-Schwelle** (erst ab N Zeichen trennen): willkürlich; ein kurzer Name mit
  Text darunter bliebe unerkannt.
- **Nur kürzen** (PR #209): der Name bliebe ein abgeschnittener Satz.

## Folgen

- Eine bewusst zweizeilige Bezeichnung mit Leerzeile dazwischen verliert ihre zweite
  Zeile aus dem Namen. Sie steht aber in Karte und Import-Log.
- conocto-bim hat eine Kopie des Kerns: dort mit `scripts/sync-core.mjs` nachziehen.
