# Domänenwissen — Index

> **Disziplin-Hinweis:** Inhalte sind zu verifizieren und mit Quelle/Norm-Nummer zu
> belegen; nichts erfinden. Bei Unsicherheit über normative Inhalte nachfragen statt
> raten — siehe [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md#domänenwissen). Dieser
> Index ist ein Einstiegspunkt, keine Zusammenfassung der Normen selbst.

## Struktur / Austausch

| Norm/Standard | Zweck |
|---|---|
| GAEB DA XML + Phasenmodell (DA81–DA86) | Datenaustauschformat für Leistungsverzeichnisse zwischen den Phasen Ausschreibung/Vergabe/Abrechnung |
| REB-VB 23.003 | Regelung für die Aufmaßberechnung im Bauwesen |
| DIN 276 | Kostengruppen-Gliederung für Baukosten |
| STLB-Bau / StLB | Standardisierte Leistungsbeschreibungs-Taxonomie |

## Vertrag / Verfahren

| Norm/Standard | Zweck |
|---|---|
| VOB/A | Vergabeverfahren für Bauleistungen — Prüfregeln: [`vob-pruefungen.md`](vob-pruefungen.md) |
| VOB/B | Vertragsbedingungen für die Ausführung von Bauleistungen |
| VOB/C (ATV DIN 18299 ff.) | Allgemeine Technische Vertragsbedingungen je Gewerk — Nebenleistungen (4.1) und Besondere Leistungen (4.2) speisen den VOB-Check |
| HOAI (LPH 1–9) | Honorarordnung für Architekten und Ingenieure, Leistungsphasen-Gliederung |

## Technik / Klassifizierung

| Norm/Standard | Zweck |
|---|---|
| DIN EN 206 / DIN 1045 | Beton — Festlegung, Eigenschaften, Expositionsklassen |
| DIN 488 | Betonstahl / Bewehrung |
| DIN 18300 | ATV Erdarbeiten — siehe Gotcha unten |

---

## Muster-Beispiel: DIN 18300 — Bodenklassen vs. Homogenbereiche

**Gotcha:** Die früher gebräuchlichen **Bodenklassen** (1–7) sind seit der VOB/C-Fassung
2015 in DIN 18300 durch **Homogenbereiche** ersetzt worden. Ein Homogenbereich fasst
Boden-/Felsschichten mit vergleichbarem Verhalten für eine bestimmte Bauleistung
zusammen und wird über mehrere Kennwerte beschrieben statt über eine einzelne
Klassenziffer.

**Für die Klassifizierung relevant:** Alte LVs oder Textbausteine können noch
Bodenklassen-Begriffe enthalten. Diese Logik darf **nicht** als aktuelle Regel
zementiert werden — bei Erdarbeiten-Positionen ist zu prüfen, ob Homogenbereich- oder
(veraltete) Bodenklassen-Terminologie vorliegt, statt eine der beiden Systematiken
pauschal anzunehmen.

---

## Leistungsbereich (STLB-Bau) — derzeit nicht in der App

Bis 0.11 ordnete die Klassifizierung jede Position über einen STLB-Bau-Katalog einem
Leistungsbereich (Gewerk) zu. Ohne gepflegte Stichworte traf das fast nie; die
Zuordnung ist entfernt ([`decisions/0044`](../decisions/0044-leistungsbereich-entfernt.md)).
Eine neue Logik für Leistungsbereiche legt der Owner später fest.

Materialwissen (z. B. „C20/25" oder „XC4" ⇒ Beton) kommt künftig als eigene Tabelle je
Material unter [`reference/`](reference/). Rohstoff dafür:
[`reference/entwuerfe/material-entwurf.csv`](reference/entwuerfe/material-entwurf.csv).

Bauteiltyp (`Wand`, `Decke`, `Fundament`, …) und die nicht-physischen `positionsart`-Werte
(`personal`, `planung`, …) ohne LB-Zuordnung bleiben interne, nicht-normative
Arbeits-Taxonomien — bewusst klein im MVP, inkrementell erweiterbar.
