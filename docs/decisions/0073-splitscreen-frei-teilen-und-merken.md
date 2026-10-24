# 0073 – Splitscreen frei teilen, letzte Anordnung merken

- **Status:** teilweise ersetzt durch 0074 (Knopf ↺ jetzt im Menü „Ansicht“, kein
  Split/Fenster mehr)
- **Datum:** 2026-10-23
- **Betrifft:** Splitscreen (`frontend/src/components/shell/SplitView.tsx`,
  `frontend/src/lib/workspace/split.ts`), Ansichtszustand (`view.workspace` in
  `frontend/src/state/viewState.ts`), Speicher (`frontend/src/lib/persist/lastLv.ts`),
  Kopfleiste (`WorkspaceBar`)
- **Ersetzt:** in 0070 die fünf festen Plätze in drei Spalten und „Fläche des eigenen
  Stapels = lösen“; in der Architekturregel „UI-Zustand überlebt keinen Reload“ eine
  Ausnahme für die Anordnung

## Worum geht's

- Nico wollte z. B. drei Bereiche nebeneinander, auch nach oben und unten teilen, und
  dabei sehen, ob ein Bereich nur einen Platz teilt oder über die ganze Fläche läuft.
- Nach dem Neuladen soll die Anordnung wieder so sein wie zuletzt.
- Mockup am 2026-10-23 (A: an den Rand ziehen, D: Zonen). Nico hat A + D gewählt und
  „Letzte Anordnung merken“ (keine benannten Ansichten).

## Entscheidung

- **Freie Aufteilung:** Statt fünf fester Plätze ein Baum aus Teilungen. Jede Teilung legt
  ihre Bereiche nebeneinander oder übereinander. Am Anfang sieht alles aus wie bisher.
- **Ziehen am Griff ⠿ — wo man loslässt, entscheidet:**
  - **Kopfzeile** eines Platzes: als Reiter dazu (wie bisher),
  - **Mitte** eines Bereichs: beide tauschen (wie bisher),
  - **Rand** eines Bereichs (äußeres Viertel links, rechts, oben, unten): nur dieser Platz
    wird geteilt,
  - **äußerer Rand der ganzen Fläche** (16 px links, rechts, unten): der Bereich läuft
    über die volle Höhe bzw. Breite.
  - Eine Vorschau färbt genau die Fläche, die der Bereich bekommt, mit Hinweis
    („teilen“, „durchlaufend“ …).
  - Teilen nur, wenn jede Hälfte mindestens 200 px breit bzw. 120 px hoch bleibt.
- **Reiter lösen:** an den Rand des eigenen Stapels ziehen. Ein leerer Platz verschwindet.
- **Trennlinien:** je Teilung. Jede verschiebt nur ihre beiden Nachbarn, kein Bereich
  schmaler als 12 % seiner Teilung. Doppelklick setzt die Teilung zurück.
- **Letzte Anordnung merken:** Lage, Größen, offene/geschlossene Bereiche und
  Split/Fenster bleiben in der IndexedDB dieses Browsers (Schlüssel `anordnung`, nur über
  `lib/persist/lastLv.ts`). Keine LV-Daten, kein Request. Fehlt IndexedDB, gilt nach dem
  Neuladen wieder der Anfang.
- **Zurücksetzen:** Knopf ↺ in der Kopfleiste, sobald die Anordnung vom Anfang abweicht.

## Warum

- Ein Baum deckt „nur diesen Platz teilen“ und „durchlaufend“ mit einer Regel ab.
- Die Zonen kommen ohne neue Knöpfe aus; die Vorschau macht sie sichtbar.
- Die Anordnung ist eine Vorliebe, kein Fachdatum — wie die Farbnamen (0063).

## Verworfene Alternativen

- **C: Menü mit fertigen Anordnungen.** Nico braucht es vorerst nicht.
- **Benannte Ansichten speichern.** Mehr Bedienung; kann später dazukommen.
- **Feste Obergrenze von Spalten.** Die Mindestgröße beim Teilen reicht.
- **Äußerer Rand oben.** Dort liegen die Kopfzeilen (stapeln); unten, links und rechts
  reichen.

## Folgen

- Nichts einmalig zu tun.
- Eine ältere oder kaputte gemerkte Anordnung wird verworfen; fehlende Bereiche einer
  neuen App-Version kommen auf den ersten Platz.
- Neue Bereiche (z. B. Dokument aus 0072) müssen in `PANES` stehen; die gemerkte
  Anordnung ergänzt sie selbst.
