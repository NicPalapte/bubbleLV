# 0091 – Kennungen heißen conocto statt bubble

- **Status:** akzeptiert
- **Datum:** 2026-11-02
- **Betrifft:** Fingerabdruck (`packages/core/src/hash/positionHash.ts`), LV-Export
  (`packages/core/src/export/lvExport.ts`), Graph-Datei (`packages/core/src/model/graph.ts`),
  Regelformat, Notiz-Datei (`frontend/src/lib/notesFile.ts`), Speicher im Browser
  (`frontend/src/lib/persist/lastLv.ts`), Kern-Paket `packages/core`
- **Ersetzt teilweise:** [0069](0069-conocto-look.md) (Regel „Alt-Kennungen mit bubble
  bleiben“)

## Worum geht's

- Seit 0069 heißt das Produkt Conocto. Kennungen in Dateien und Code hießen weiter
  `bubble-…`, damit gespeicherte Notizen und Links gültig bleiben.
- Owner am 02.11.2026: Die App hat bisher nur er benutzt, es gibt keine Daten, die
  wiedererkannt werden müssen. Deshalb alles umbenennen, ohne Rücksicht auf alte Stände.

## Entscheidung

- Neue Kennungen: `conocto-pos-v1` (Fingerabdruck), `conocto-graph-v1`,
  `conocto-lv-export-v1`, `conocto-rule-v1`, `conocto-notizen`, Paket `@conocto/core`,
  Browser-Speicher (IndexedDB) `conocto`, Fenster-Namen `conocto-…`, Demo-Datei
  `conocto-demo-angebot.x84`.
- **Kein Lesen alter Formate.** Alte Notiz- und Regeldateien mit `bubble-…` werden abgelehnt.
- Der Name `conocto-pos-v1` fließt in jeden Fingerabdruck ein. Alle Fingerabdrücke ändern
  sich damit einmal.
- Bleibt: GoatCounter-Code `bubble` (externes Konto, ein neuer Code fängt bei null an),
  Repo-Name `bubbleLV` (benennt der Owner selbst um), „Bubble“ als Blase im Graphen.
- Alte Entscheidungen werden nicht umgeschrieben.

## Verworfene Alternative

- Neue Namen, aber den alten Wert im Fingerabdruck einfrieren: hält alte Links und Notizen
  gültig. Unnötig, weil es keine alten Daten gibt; hätte eine `bubble`-Zeile im Code gelassen.

## Folgen

- Alte Links `#lv=…~pos=…`, gespeicherte Notizen, eigene Regeln und die zuletzt geöffnete
  Datei in diesem Browser gehen einmal verloren. Die alte IndexedDB `bubble` bleibt liegen,
  wird aber nicht mehr gelesen (Browserdaten löschen räumt sie weg).
- bauonto und conocto-bim ziehen im selben Zug nach (eigene PRs). Erst alle drei mergen,
  dann neu exportieren.
