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
| VOB/A | Vergabeverfahren für Bauleistungen |
| VOB/B | Vertragsbedingungen für die Ausführung von Bauleistungen |
| VOB/C (ATV DIN 18299 ff.) | Allgemeine Technische Vertragsbedingungen je Gewerk |
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

## STLB-Bau-Leistungsbereiche als primäre Klassifizierungsquelle (WP-2)

Die Klassifizierung (siehe
[`architecture/backend.md`](../architecture/backend.md#klassifizierung-wp-2--austauschbar-regel--llm-mehrstufig-erweiterbar))
matcht Kurz-/Langtext **direkt gegen die STLB-Bau-Leistungsbereiche (LB)** — nicht erst
gegen ein internes Freitext-Gewerk-Vokabular. Das liefert `gewerk`/`gewerk_lb` **und**,
für die eindeutig nicht-physischen LBs (z. B. Baustelleneinrichtung), direkt
`positionsart` — beides normbasiert statt erfunden.

**Referenzdaten (vom Maintainer bereitzustellen, nicht zu erfinden):**
[`reference/stlb-bau-leistungsbereiche.csv`](reference/stlb-bau-leistungsbereiche.csv) —
eine Zeile je STLB-Bau-LB mit Spalten `lb_nummer`, `lb_bezeichnung`,
`positionsart_default` (nur gesetzt für eindeutig nicht-Bauteil-LBs, sonst leer),
`keywords` (Pipe-getrennte Stichworte für den Text-Abgleich) und `quelle_version`
(Version/Stand des STLB-Bau-Katalogs, aus dem die Zeile stammt). Solange diese Datei
nur das Format, aber keine echten LB-Zeilen enthält, bleibt die Zuordnung offen — der
Klassifizierer fällt dann für jede Position auf die heuristische Positionsart-/
Bauteiltyp-Erkennung zurück (kein Fehler, siehe `architecture/backend.md`).

**Warum nicht nur Freitext:** LB-Nummern sind stabil und normbasiert; ein Ruleset-Key
`(bauteiltyp, gewerk_lb)` bleibt gültig, auch wenn sich Bezeichnungen zwischen
Katalogversionen ändern. Details/Grenzen der LB-Granularität (ein LB deckt meist mehrere
Bauteiltypen ab, daher bleibt Bauteiltyp-Erkennung als eigene Stufe nötig) siehe
`architecture/backend.md`.

Bauteiltyp (`Wand`, `Decke`, `Fundament`, …) und die nicht-physischen `positionsart`-Werte
(`personal`, `planung`, …) ohne LB-Zuordnung bleiben interne, nicht-normative
Arbeits-Taxonomien — bewusst klein im MVP, inkrementell erweiterbar.
