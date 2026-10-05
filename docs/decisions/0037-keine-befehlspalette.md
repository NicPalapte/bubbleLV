# 0037 – Keine Befehlspalette mehr

- **Status:** akzeptiert
- **Datum:** 2026-10-05
- **Betrifft:** Frontend (Kopfleiste, Logo-Menü, Export und Druck)
- **Ersetzt:** in 0034 „Befehle" in der Kopfleiste

## Worum geht's

Die Befehlspalette (Strg K, Knopf „Befehle") stammt aus der Zeit mit vielen Ansichten.
Seit dem Graphen als Hauptscreen erreicht man alles direkt. Nico braucht sie nicht.

## Entscheidung

- Knopf „Befehle" und Strg K entfallen. Der Code der Palette ist gelöscht.
- „Positionen als CSV", „Hinweise als Markdown" und „Drucken" stehen im Logo-Menü, bei
  „Fehler melden". Sie wirken wie bisher auf die gefilterte Menge.

## Warum

- Weniger Bedienwege, weniger zu erklären.
- Export und Druck braucht man selten. Das Logo-Menü hat dafür Platz, ohne die Fläche
  zu belasten.

## Verworfene Alternativen

- **Export im Kopf des Tabellenfensters:** näher an den Daten, aber Hinweise und Druck
  gehören nicht nur zur Tabelle.
- **Export ganz weglassen:** lokaler Export und Druck sind im Scope.

## Folgen

- Für Nico ist kein Handgriff nötig.
- Zu einer OZ springt man über die Suche.
