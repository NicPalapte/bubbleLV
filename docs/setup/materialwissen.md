# Materialwissen pflegen

Diese Seite ist für den Repo-Owner.

**Kurz:** Je Material gibt es eine Tabelle unter
[`docs/domain/reference/material/`](../domain/reference/material/). Bearbeiten kannst du
sie in Excel. Danach muss die Datei in die App kopiert werden (siehe unten).

## Aufbau einer Tabelle

Der Dateiname ist der Name des Materials: `beton.csv` heißt in der App „Beton".

| Spalte | Bedeutung |
|---|---|
| `merkmal` | „Erkennung" oder der Name eines Merkmals, z. B. „Bauweise" |
| `wert` | Welcher Wert gilt, wenn ein Stichwort trifft, z. B. „Ortbeton". Bei „Erkennung" leer |
| `stichworte` | Woran man es erkennt. Mehrere mit `\|` trennen |
| `ausser` | Was trotz Treffer nicht zählt, z. B. `betonstahl*` |
| `bemerkung` | Nur für dich, die App liest sie nicht |

- Eine Zeile je Wert. Mehrere Zeilen mit demselben Merkmal sind ein Merkmal mit
  mehreren Werten.
- Bleibt `wert` bei einem Merkmal leer, zeigt die App den gefundenen Text selbst.
- Merkmale sucht die App nur, wenn das Material erkannt ist.

## Schreibweise der Stichworte

| Zeichen | Bedeutung | Beispiel |
|---|---|---|
| `*` | beliebige Buchstaben oder Ziffern | `beton*` trifft „Betonwand" |
| `#` | eine Zahl | `C#/#` trifft „C30/37" |
| Leerzeichen | beliebiger Abstand, auch Zeilenumbruch | `einschl. bewehrung` |

- Groß-/Kleinschreibung ist egal.
- Ein Stichwort trifft nur ganze Wörter: `beton` trifft nicht „Betonstahl".

## Bearbeiten in Excel

1. Datei in Excel öffnen. Steht alles in einer Spalte: **Daten → Aus Text/CSV**,
   Trennzeichen **Komma**.
2. Zeilen ändern oder ergänzen.
3. Speichern als **CSV UTF-8**. Sonst gehen Umlaute kaputt.
4. Die Datei an Claude geben oder in den Ordner `frontend/src/lib/classify/material/data/`
   kopieren — **gleicher Dateiname**.

Folge, wenn Schritt 4 fehlt: Die App nutzt die alte Tabelle, und ein Test schlägt fehl
(beide Kopien müssen gleich sein).

## Neues Material

Neue Datei anlegen, z. B. `mauerwerk.csv`, mit denselben Spalten. Ohne Zeile
„Erkennung" erkennt die App das Material nie — kein Fehler, nur kein Treffer.
