# 0084 – Eigene Suche im PDF

- **Status:** akzeptiert
- **Datum:** 2026-10-28
- **Betrifft:** Suchleiste (`frontend/src/components/layout/SearchPill.tsx`), Suchfeld im
  Bereich „Dokument“ (`frontend/src/components/docs/DocSearchField.tsx`,
  `DocumentsProvider.tsx`, `DocumentView.tsx`), Menü beim Markieren
  (`frontend/src/components/common/PaintBar.tsx`, `useTextSearches.ts`)
- **Ersetzt:** 0077 (eine Suche für LV und PDFs). „Begriff übernehmen“ aus 0077 bleibt,
  mit den Einträgen unten.

## Worum geht's

- Mit einer Suche für alles sah das Suchfeld im Dokument anders aus und tat doch dasselbe
  wie die Suchleiste oben. Wer im PDF tippte, änderte auch die Suche im LV.
- Nico wollte die PDFs mit einer eigenen Suche versehen. Mockup am 2026-10-28 freigegeben.

## Entscheidung

- **Suchleiste oben = nur LV.** Sie filtert Graph und Tabelle wie bisher (0058). Die Liste
  „Treffer je Quelle“ darunter fällt weg.
- **Suchfeld im Dokument = nur PDF.** Es filtert das LV nie. Treffer zählen und springen
  im PDF, das zu sehen ist (Enter, ▲ ▼).
- **Andere offene PDFs:** Beim Tippen zeigt eine kleine Liste, wie oft der Begriff in jedem
  offenen PDF steht. Ein Klick wechselt dorthin.
- **Der Begriff bleibt** beim Wechsel des PDFs stehen. Ein neues LV leert ihn; nach dem
  Neuladen ist er leer. Er wird nicht gespeichert.
- **Strg/Cmd + F** holt das Suchfeld, wenn zuletzt ins Dokument geklickt wurde. Im eigenen
  Browserfenster des Dokuments immer. Sonst bleibt Strg F beim Browser.
- **Menü beim Markieren:** Im Langtext und Kurztext „In Suche übernehmen“ (LV) und, wenn ein
  PDF offen ist, „Im PDF suchen“. Im PDF „Im PDF suchen“ und „Im LV suchen“.
- Suchen im PDF wie bisher: ohne Groß/klein und Leerraum, mindestens 2 Zeichen.

## Verworfene Alternativen

- **Eine Suche, PDFs per Schalter ausschließen:** bleibt verwirrend, weil ein Feld zwei
  Dinge tut.
- **Alles lassen, nur das Aussehen angleichen:** löst das Grundproblem nicht.

## Folgen

- Für den Owner gibt es nichts einmalig zu tun.
