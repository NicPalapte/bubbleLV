# 0021 – Matrix: Zählregeln und Farbskala

- **Status:** akzeptiert
- **Datum:** 2026-09-22
- **Betrifft:** Frontend, Ansicht „Matrix" (WP-O)

## Worum geht's

Die Matrix legt zwei Merkmale übereinander und zeigt je Kombination eine Zahl.
Drei Dinge sind dabei nicht selbstverständlich und mussten entschieden werden:

- Was passiert mit Positionen, die zu einem Merkmal **mehrere** Werte tragen
  (eine Position kann mehrere Expositionen oder Normen nennen)?
- Was passiert mit Positionen, die zu einem Merkmal **gar keinen** Wert tragen?
- Wie viele Zeilen und Spalten sind noch lesbar?

## Entscheidung

- **Mehrere Werte = mehrere Zellen.** Eine Position mit zwei Expositionen zählt
  in beiden Zeilen mit. Die Summe der Zellen ist dann größer als die Zahl der
  Positionen — die Ansicht schreibt das dazu, sobald so eine Achse gewählt ist.
- **„Ohne Angabe" ist ein eigener Wert**, keine stille Auslassung: eigene Zeile
  bzw. Spalte, am Ende, kursiv und gedämpft.
- **„Ohne Angabe" und „Weitere" sind nicht anklickbar.** Es gibt keinen
  Facettenwert, der genau sie trifft; ein Klick würde in einer Tabelle landen,
  die mehr zeigt als die Zelle.
- **14 Werte je Achse** stehen einzeln, der Rest wird zu einer Zeile „Weitere
  (n)" zusammengefasst.
- **Achsen sind nach Positionszahl sortiert**, nicht nach dem gewählten
  Zellwert: sonst springen die Zeilen beim Umschalten von Anzahl auf Summe.
- **Leere Zellen bleiben stehen** (ein „·"), sie werden nicht zu 0.
- **Eigene Farbskala** in fünf Stufen (`--heat-1` … `--heat-5` in
  `frontend/src/index.css`), Cyan statt Blau. Die Stufen folgen der Wurzel des
  Anteils am größten Zellwert.
- **Jede vorhandene Zelle trägt eine Zahl**, auch die 0. Leer ist nur, was es
  nicht gibt („·").
- **Negative Summen** (Abzugspositionen, Nachlässe) bekommen einen eigenen Ton
  (`--redS`) statt der weißen Fläche einer Lücke.
- **Fällt der Zellwert zurück**, weil ein Filter die Grundlage wegnimmt, steht
  der Grund über dem Raster — für Mengen wie für Summen.
- **Mengen als Zellwert** gelten weiter nur innerhalb einer Einheit
  (Entscheidung 0019); mischt der Filter Einheiten, ist der Knopf gesperrt.
  Ohne Preise in der Datei ist „Summe" gesperrt.

## Warum

- Eine Position, die zwei Normen nennt, gehört fachlich in beide Zeilen. Sie
  einer davon zuzuschlagen wäre eine Erfindung, sie wegzulassen ein Verlust.
- „Ohne Angabe" ist in einem LV oft die größte Gruppe. Sie auszublenden würde
  die Matrix hübscher und die Aussage falsch machen: dass ein Merkmal fehlt,
  ist selbst eine Information (fehlende Klassifizierung, unklarer Text).
- Ein Raster mit 60 Zeilen ist kein Muster mehr, sondern eine Liste. Die Grenze
  hält die Matrix lesbar, und die Sammelzeile verschweigt den Rest nicht.
- Blau ist im System Auswahl und Interaktion. Würde die Skala in Blau laufen,
  wäre eine dunkle Zelle nicht mehr von einer ausgewählten zu unterscheiden.
- Die Wurzel statt einer linearen Skala: ein LV hat fast immer eine sehr große
  Zelle. Linear verschwindet alles andere in derselben blassen Stufe.

## Verworfene Alternativen

- **Nur einwertige Merkmale als Achse zulassen** – Exposition, Normen, Material
  und Besonderheiten sind genau die Merkmale, die man in einer Matrix sucht.
- **Mehrwertige Positionen anteilig zählen** (eine Position mit zwei Werten
  zählt je 0,5) – die Zellen summieren sich dann zwar sauber, aber in keiner
  Zelle steht mehr eine Zahl von Positionen. „1,5 Positionen" ist nichts.
- **„Ohne Angabe" als Filter zulassen** – dafür bräuchte `matchPos` einen
  Sonderwert „hat keinen Wert" in jeder Facette. Das ist ein Eingriff in die
  Filterlogik für einen Randfall; die Zelle zeigt ihre Zahl auch ohne Klick.
- **Zeilen ohne Grenze** – bei der Facette „Besonderheiten" wären das im
  Extremfall hunderte Zeilen, und der Browser zeichnet sie alle.
- **Klick ergänzt den Filter, statt ihn zu ersetzen** – dann zeigte die Tabelle
  mehr Zeilen als die angeklickte Zelle.

## Folgen

- Nichts, was der Repo-Owner einmalig tun muss.
- Neue Token `--heat-1` … `--heat-5` in `frontend/src/index.css`. Wer die
  Farbskala ändern will, ändert sie dort — nicht in der Komponente.
- Die Zählregel steht in `frontend/src/lib/matrix/model.ts`; die Ansicht
  rechnet nichts selbst.
