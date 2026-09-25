# 0029 – Markierungen im Graphen: Ringe und Muster statt Farbe

- **Status:** akzeptiert
- **Datum:** 2026-09-25
- **Betrifft:** Frontend, Bubble-Graph (WP-R), Issue #80

## Worum geht's

Der Graph soll mehr zeigen als Struktur und Größe: **wo Hinweise sitzen** (Prüfung) und
**welche Positionen zusammengehören** (Ähnlichkeit). Beides braucht eine Kennzeichnung an
der Bubble. Die naheliegende Kennzeichnung — Farbe — ist schon vergeben.

## Entscheidung

- **Farbe bleibt dem Gewerk.** Eine Gewerk-Farbskala gilt in allen Ansichten
  ([`0013`](0013-gewerk-farbskala.md)). Keine neue Bedeutung wird über die Füllfarbe
  einer Bubble transportiert.
- **Hinweise aus der Prüfung: ein Ring** um die Positions-Bubble. Die Ringfarbe folgt
  der **Schwere** (`beachten` auffälliger als `hinweis`), nicht der Kategorie — die
  Kategorie steht im Popover.
- **Ähnlichkeitsgruppen: Muster statt Farbe** (gestrichelter Doppelrand). Mehrere
  Gruppen unterscheiden sich durch das Muster, nicht durch einen neuen Farbkreis.
- **Markierungen erscheinen erst ab der Zoomstufe, auf der Positionen einzeln sichtbar
  sind** — also sobald die Positionswolke als Punkte gezeichnet wird und nicht als eine
  Fläche mit Zähler (`CLOUD_LOD_PX`). Weiter draußen wäre ein Ring von 2 px ein Fleck.
- **Die Zahlen entstehen einmal beim Laden**, nicht im Render: die Prüfregeln laufen
  schon in der Pipeline (also im Worker), das Gruppieren nach Position hängt am Import.
- **Eine abgeschaltete Regel markiert nichts.** Der Filterzustand `mutedRules` gilt im
  Graphen genauso wie in der Ansicht „Prüfung".

## Warum

- **Zwei Bedeutungen auf einem Kanal sind keine Bedeutung.** Wer Farbe für Gewerk _und_
  Schwere benutzt, kann beides nicht mehr lesen.
- **Ring und Muster liegen außen.** Sie verdecken die Füllung nicht, lassen sich stapeln
  (eine Position kann Hinweis _und_ Ähnlichkeitsgruppe haben) und verschwinden beim
  Rauszoomen von selbst.
- **Schwere statt Kategorie am Ring:** es gibt zwei Schweregrade, aber sechs Kategorien.
  Sechs unterscheidbare Ringfarben kann niemand auseinanderhalten.
- **Ein Filterzustand, alle Ansichten** (harte Regel): eine Regel, die in der Prüfung
  abgeschaltet ist, darf im Graphen nicht weiter markieren.

## Verworfene Alternativen

- **Füllfarbe nach Schwere** – überschreibt die Gewerk-Farbskala aus [`0013`](0013-gewerk-farbskala.md).
- **Symbol (Ausrufezeichen) an der Bubble** – eine Positions-Bubble hat 8 px Radius; ein
  lesbares Zeichen wäre größer als die Bubble selbst.
- **Markierung auf jeder Zoomstufe** – bei 10k Positionen stünde weit draußen eine Fläche
  aus Ringen, aus der sich nichts mehr ablesen lässt.
- **Eigene Farbskala je Ähnlichkeitsgruppe** – ein LV hat hunderte Gruppen; Farben reichen
  dafür nicht, und sie kollidieren wieder mit dem Gewerk.

## Folgen

- Der Graph zeigt Hinweise und Ähnlichkeit nur im hineingezoomten Zustand. Wer den
  Überblick über alle Hinweise will, nimmt weiter die Ansicht „Prüfung“.
- Neue Markierungen (später etwa Ausreißer) folgen derselben Regel: außen, musterbasiert,
  ab derselben Zoomstufe.
