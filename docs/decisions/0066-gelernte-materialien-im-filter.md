# 0066 – Als Material gelernte Begriffe stehen im Filter „Material"

- **Status:** akzeptiert (Begriffe kommen seit [0088](0088-gelernte-begriffe-als-regeln.md)
  aus den Regeln)
- **Datum:** 2026-10-22
- **Betrifft:** Filter „Material" (`frontend/src/components/filter/FilterBar.tsx`),
  `frontend/src/lib/index/learnedMaterials.ts`, `frontend/src/state/ViewerProvider.tsx`
- **Ändert:** 0053 (gelernte Begriffe waren nur Färbung, kein Filter)

## Worum geht's

- Der Filter „Material" kannte nur Materialien mit eigener Tabelle (Beton, Betonstahl).
- Begriffe wie „Stahl", im Admin-Werkzeug als Material gelernt, waren im Langtext grün,
  fehlten aber im Filter.
- Der Owner will alle Materialien unter diesem Filter (Auswahl am 2026-10-22).

## Entscheidung

- Jeder Begriff der Kategorie „Material" — aus `hervorhebungen.csv` oder im Browser
  gelernt — wird ein Wert im Filter „Material", wenn er im Kurz- oder Langtext vorkommt.
- Ein Begriff, der schon als Material erkannt ist (ohne Groß/klein), kommt nicht doppelt.
- Gerechnet wird im Viewer, einmal je LV und je Änderung der Begriffe — nicht in der
  Klassifizierung, weil der Worker die im Browser gelernten Begriffe nicht kennt.
- Andere Kategorien (Maße, Wichtig) bleiben reine Färbung.

## Warum

- Was der Langtext als Material zeigt, soll sich auch filtern lassen.
- Kein Umweg über eine Materialtabelle für jedes neue Material.

## Verworfene Alternativen

- **Je Material eine Tabelle (stahl.csv)** – bleibt möglich für Merkmale, ist aber für
  den Filter allein zu viel Aufwand.

## Folgen

- Ein gelernter Material-Begriff wirkt sofort im Filter, auch ohne neues Laden.
- Der Export (CSV-Spalte „Material") zeigt weiter nur die Materialien aus den Tabellen.
