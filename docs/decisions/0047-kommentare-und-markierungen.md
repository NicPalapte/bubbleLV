# 0047 – Eigene Markierungen und Kommentare je Position

- **Status:** akzeptiert
- **Datum:** 2026-10-12
- **Betrifft:** Positionskarte, Graph, Filter, Tabelle, CSV-Export, Speicher im Browser
- **Ergänzt:** [0046](0046-letzte-datei-im-browser.md) (letzte Datei im Browser)

## Worum geht's

Beim Durcharbeiten eines LV will der Owner Positionen markieren und kurz kommentieren,
damit er sie später wiederfindet. Bisher waren Notizen ausdrücklich draußen, weil es
keinen Speicher gab. Seit 0046 gibt es einen: die letzte Datei in diesem Browser.
Mockup freigegeben am 2026-10-12.

## Entscheidung

- Je Position gibt es eine **Markierung** (an/aus) und einen **Kommentar** (freier Text).
- Beides entsteht in der Positionskarte: Knopf „⚑ Markieren“ und ein Feld „Kommentar“.
  Gespeichert wird beim Tippen, ohne Speichern-Knopf.
- Graph: kleines Schild am Punkt, dunkles ⚑ für markiert, blaues ✎ für Kommentar.
- Filter „Markiert“ und „Mit Kommentar“ stehen oben neben der Suche. Sie erscheinen erst,
  wenn es etwas zu filtern gibt, und wirken wie jeder andere Filter auf Graph und Fenster.
- Tabelle und CSV-Export bekommen die Spalten „Markiert“ und „Kommentar“. In der Tabelle
  lässt sich seitdem **jede** Spalte ausblenden, auch OZ und Bezeichnung.
- Gespeichert wird in der IndexedDB, im selben Speicher wie die letzte Datei und nur zu
  ihr. Eine neue Datei beginnt leer, **✕** auf der Startseite löscht die Notizen mit.
- Die Startseite zeigt im Feld „Letzte Datei“, wie viele Positionen markiert und
  kommentiert sind.
- Demo-LVs: Markieren und Kommentieren geht, aber nur bis zum Reload. Die Karte sagt das.

## Warum

- Notizen gehören zum Verstehen eines LV: was man beim Lesen auffällig fand, soll man
  wiederfinden.
- An die eine gespeicherte Datei gebunden: keine Verwaltung, kein zweiter Speicher.
- Die Notizen hängen an der Kennung der Position. Sie entsteht beim Laden aus OZ und
  Reihenfolge und ist für dieselbe Datei immer gleich.
- Jedes gespeicherte Projekt bekommt eine eigene Kennung. Notizen werden nur geschrieben,
  wenn sie noch passt. So landen sie nie bei einer Datei, die inzwischen (z. B. in einem
  zweiten Tab) ersetzt wurde.

## Verworfene Alternativen

- **Filter im Seitenfenster „Filter“:** Der Owner wollte es erst oben probieren. Lässt
  sich später verschieben.
- **Notizen in der Datei speichern (GAEB-Export):** GAEB-Export ist außerhalb des Scopes.
- **Notizen unabhängig von der Datei speichern:** bräuchte eine Zuordnung über mehrere
  Dateien. Das ist der Versionsvergleich, und der ist jetzt draußen.

## Folgen

- „Notizen“ ist nicht mehr außerhalb des Scopes, aber nur in dieser Form: je Position,
  zur letzten Datei, in diesem Browser. Aufgaben, Zuständigkeit und Status bleiben draußen.
- Dieselbe Datei in zwei Tabs gleichzeitig: der Tab, der zuletzt schreibt, gewinnt.
  Notizen aus dem anderen Tab gehen dann verloren. Zusammenführen ginge nicht sauber,
  weil ein gelöschter Kommentar sonst wieder auftauchte. Bewusst so gelassen.
- Wer die Website-Daten des Browsers löscht, verliert die Notizen. Wer sie behalten will,
  nimmt den CSV-Export mit.
