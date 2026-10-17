# 0053 – Drei Marker, Kommentar-Verlauf, Mengenstufe, gelernte Begriffe

- **Status:** akzeptiert
- **Datum:** 2026-10-16
- **Betrifft:** eigene Notizen (`frontend/src/lib/annotations.ts`), Matrix
  (`frontend/src/lib/graph/layoutMap.ts`), Langtext-Hervorhebung
  (`frontend/src/lib/highlight/terms.ts`), Speicher (`frontend/src/lib/persist/lastLv.ts`)
- **Erweitert:** 0047 (Kommentare und Markierungen), 0046 (Speicher im Browser)

## Worum geht's

- Aus der Nutzung (Nico, 16.10.2026):
  - Eine Markierung an/aus reicht nicht. Gewünscht: Markiert, Wichtig, Erledigt.
  - Ein Kommentarfeld überschreibt sich. Gewünscht: Kommentare abschicken, Verlauf sehen.
  - In der Matrix nach Einheit soll man auch nach Menge gruppieren können.
  - Wichtige Textstellen (Material, Maße …) sollen markiert werden, und das lernfähig.
- Mockup: https://claude.ai/artifact/1jXrU7jYpicPBJ1FTwePTb (freigegeben).

## Entscheidung

- **Marker:** höchstens einer je Position: Markiert (⚑), Wichtig (!), Erledigt (✓).
  Ein eigener Marker, nicht der GAEB-Status (0051 bleibt). Filter je Marker und
  „Nicht erledigt“.
- **Verlauf:** „Senden“ hängt einen Kommentar mit Zeitpunkt an. Marker-Wechsel stehen
  dazwischen. Nur in diesem Browser, kein Versand an andere (kein Server).
  Alte Notizen aus v0.15 werden übernommen (Kommentar ohne Zeitpunkt).
- **Mengenstufe:** neue Achse der Matrix (unter 10 · 10–100 · 100–1.000 · 1.000–10.000 ·
  ab 10.000). Pauschal und ohne Menge: „ohne Angabe“. In jeder Gruppe liegt die größte
  Menge innen.
- **Gelernte Begriffe:** nur mit Admin-Zugang (Logo-Menü, Passwort). Text im Langtext
  markieren, Kategorie wählen: Material, Maße, Wichtig oder „Nicht hervorheben“.
  - Gelten sofort in diesem Browser, für jede Datei. Gespeichert in derselben IndexedDB
    wie die letzte Datei, aber unabhängig von ihr.
  - Für alle Nutzer: als CSV herunterladen und nach
    `docs/domain/reference/hervorhebungen.csv` übernehmen.
  - Schreibweise wie die Materialtabellen (`#` = Zahl, `*` = Buchstaben).
  - Färben nur ein. Kein Filter, kein Attribut, keine Prüfregel.
- **Maße** werden violett statt grau hervorgehoben.

## Verworfene Alternativen

- **Kommentare an andere schicken:** braucht einen Server. Außerhalb des Scopes.
- **Mehrere Marker gleichzeitig:** „Wichtig“ und „Erledigt“ zugleich ist kein
  sinnvoller Zustand; ein Marker bleibt eindeutig.
- **Echter Passwortschutz:** ohne Server nicht möglich. Das Passwort ist ein
  Sichtschutz: es versteckt die Funktion, schützt aber keine Daten.
- **Gelernte Begriffe in der Klassifizierung (Worker):** würde Filter und Attribute
  verändern. Sie wirken nur beim Anzeigen einer Position.

## Folgen

- Der Speicher im Browser hält jetzt zusätzlich die gelernten Begriffe.
  „Letzte Datei löschen“ lässt sie stehen.
- Owner: Begriffe aus dem Browser als CSV ins Repo übernehmen, sonst sieht sie nur
  der eigene Browser. Anleitung: [`../setup/admin-werkzeuge.md`](../setup/admin-werkzeuge.md).
- Später: Reiter „Material“ und „Prüfregeln“ im Admin-Fenster (heute ausgegraut).
