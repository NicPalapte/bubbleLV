# Wortlisten im Code – Übersicht zum Prüfen

Diese Seite ist für den Repo-Owner.

**Stand:** 2026-10-04. Erzeugt aus dem Code, nicht von Hand getippt. Ändert sich der Code,
ist die Seite veraltet. Die Zeilennummern gelten für diesen Stand.

## So liest du die Seite

- Alles klein geschrieben. Ein Wort trifft **jedes Textstück**: `polier` trifft auch „Polierplan".
- A–B: Wörter, die Bubble für **Nicht-Bauteile** nutzt. Hier liegen die Duplikate.
- C–D: Wörter für **Bauteile**.
- E: Dein Keyword-Entwurf, soweit er sich überschneidet.
- Duplikate sind in den Hinweisen genannt. Zusammenführen ist offen (siehe Chat/PR 116).

## A. Positionsart erkennen (nur Kurztext)

Entscheidet, ob eine Position ein Bauteil oder etwas anderes ist. **Reihenfolge ist Absicht:** Baustelleneinrichtung → Personal → Planung → Nebenleistung. Danach zählt die Einheit.

### A1 Baustelleneinrichtung

- Stelle: `frontend/src/lib/classify/positionsart.ts:8` (`BAUSTELLENEINRICHTUNG`)
- 13 Wörter

`baustelleneinrichtung`, `baustelle einrichten`, `baustelle räumen`, `bauzaun`, `baustrom`, `bauwasser`, `baustellenverkehr`, `bürocontainer`, `aufenthaltscontainer`, `sanitärcontainer`, `krananlage`, `turmdrehkran`, `sicherheitseinrichtung`

### A2 Personal

- Stelle: `frontend/src/lib/classify/positionsart.ts:24` (`PERSONAL`)
- 9 Wörter

`stundenlohnarbeit`, `stundenlohn`, `regiestunde`, `regiearbeit`, `vorarbeiter`, `facharbeiter`, `werker`, `polier`, `bauhelfer`

### A3 Planung

- Stelle: `frontend/src/lib/classify/positionsart.ts:36` (`PLANUNG`)
- 13 Wörter

`werkplanung`, `werk- und montageplanung`, `montageplanung`, `ausführungsplanung`, `schalplanung`, `bewehrungsplanung`, `statische berechnung`, `statischer nachweis`, `standsicherheitsnachweis`, `nachweisführung`, `gutachten`, `bestandsaufnahme`, `aufmaß erstellen`

### A4 Nebenleistung

- Stelle: `frontend/src/lib/classify/positionsart.ts:52` (`NEBENLEISTUNG`)
- 8 Wörter

`nebenleistung`, `besondere leistung`, `vorhalten`, `vorhaltung`, `andienung`, `baustellendokumentation`, `schlussreinigung`, `bauendreinigung`

### A5 Einheiten → Bauteil

- Stelle: `frontend/src/lib/classify/positionsart.ts:64` (`BAUTEIL_UNITS`)
- 17 Wörter

`m`, `m2`, `m²`, `m3`, `m³`, `mm`, `cm`, `km`, `stk`, `st`, `stck`, `stück`, `psch`, `t`, `to`, `kg`, `l`

### A6 Einheiten → Personal (Zeit)

- Stelle: `frontend/src/lib/classify/positionsart.ts:84` (`ZEIT_UNITS`)
- 9 Wörter

`h`, `std`, `std.`, `min`, `d`, `tag`, `wo`, `mon`, `mt`

## B. Eigenschaften bei Nicht-Bauteilen (Kurz- und Langtext)

Werden **nach** der Positionsart gesucht. Hier stehen die Duplikate zu A.

### B1 Qualifikation (Personal)

- Stelle: `frontend/src/lib/classify/rulesets/nonBauteil.ts:7` (`QUALIFIKATIONEN`)
- Doppelt zu A2: `polier`, `vorarbeiter`, `facharbeiter`, `werker`, `bauhelfer`.

| Wert         | Wörter                          |
| ------------ | ------------------------------- |
| Polier       | `polier`                        |
| Vorarbeiter  | `vorarbeiter`                   |
| Facharbeiter | `facharbeiter`, `geselle`       |
| Werker       | `werker`, `bauhelfer`, `helfer` |

### B2 Planungsart

- Stelle: `frontend/src/lib/classify/rulesets/nonBauteil.ts:29` (`PLANUNGSARTEN`)
- Doppelt zu A3: fast alle Wörter.

| Wert              | Wörter                                                           |
| ----------------- | ---------------------------------------------------------------- |
| Statik            | `statische berechnung`, `statischer nachweis`, `standsicherheit` |
| Bewehrungsplanung | `bewehrungsplanung`, `bewehrungsplan`                            |
| Schalplanung      | `schalplanung`, `schalplan`                                      |
| Werkplanung       | `werkplanung`, `ausführungsplanung`, `montageplanung`            |
| Gutachten         | `gutachten`, `bestandsaufnahme`                                  |

### B3 Einrichtungsart

- Stelle: `frontend/src/lib/classify/rulesets/nonBauteil.ts:49` (`EINRICHTUNGSARTEN`)
- Teils doppelt zu A4: `vorhalten`, `vorhaltung`.

| Wert       | Wörter                                                |
| ---------- | ----------------------------------------------------- |
| Einrichten | `einrichten`, `liefern und aufstellen`, `antransport` |
| Vorhalten  | `vorhalten`, `vorhaltung`                             |
| Räumen     | `räumen`, `abbauen`, `abtransport`                    |

## C. Bauteiltyp (nur Kurztext, nur bei Positionsart „bauteil")

### C1 Bauteiltypen

- Stelle: `frontend/src/lib/classify/bauteiltyp.ts:8`
- **Reihenfolge = Priorität**, erste Zeile mit Treffer gewinnt.

| Bauteiltyp  | Wörter                                                    |
| ----------- | --------------------------------------------------------- |
| Bodenplatte | `bodenplatte`, `sohlplatte`, `fundamentplatte`            |
| Fundament   | `fundament`, `streifenfundament`, `einzelfundament`       |
| Unterzug    | `unterzug`, `überzug`, `randbalken`                       |
| Balken      | `balken`, `riegel`                                        |
| Stütze      | `stütze`, `pfeiler`, `säule`                              |
| Wand        | `wand`, `wände`, `mauerwerk`, `schotte`                   |
| Decke       | `decke`, `geschossdecke`, `filigrandecke`, `deckenplatte` |
| Treppe      | `treppe`, `treppenlauf`, `podest`                         |
| Dach        | `dach`, `dachfläche`, `attika`                            |
| Stürze      | `sturz`, `stürze`                                         |
| Bewehrung   | `bewehrung`, `betonstahl`, `mattenstahl`                  |
| Gründung    | `bohrpfahl`, `rammpfahl`, `schlitzwand`, `spundwand`      |

### C2 Tragende Bauteiltypen

- Stelle: `frontend/src/lib/classify/bauteiltyp.ts:24` (`TRAGENDE_BAUTEILTYPEN`)
- Kopie der Typen aus C1, ohne Wörter.
- 10 Wörter

`Bodenplatte`, `Fundament`, `Unterzug`, `Balken`, `Stütze`, `Wand`, `Decke`, `Treppe`, `Stürze`, `Gründung`

### C3 Typen im Beton-Ruleset (LB 013)

- Stelle: `frontend/src/lib/classify/rulesets/beton.ts:12` (`BAUTEILTYPEN`)
- Dritte Kopie der Typnamen.
- 9 Wörter

`Bodenplatte`, `Fundament`, `Unterzug`, `Balken`, `Stütze`, `Wand`, `Decke`, `Treppe`, `Stürze`

### C4 Typen im Mauerwerk-Ruleset (LB 012)

- Stelle: `frontend/src/lib/classify/rulesets/mauerwerk.ts:9` (`BAUTEILTYPEN`)
- 2 Wörter

`Wand`, `Stürze`

### C5 „nicht tragend"

- Stelle: `frontend/src/lib/classify/rulesets/beton.ts:24` (`NICHT_TRAGEND`)
- 3 Wörter

`nichttragend`, `nicht tragend`, `nicht-tragend`

## D. Eigenschaften je Fach-Ruleset

### D1 Steinarten (Mauerwerk, LB 012)

- Stelle: `frontend/src/lib/classify/rulesets/mauerwerk.ts:12` (`STEINARTEN`)
- Überschneidet sich mit den Material-Wörtern.

| Wert             | Wörter                                  |
| ---------------- | --------------------------------------- |
| Kalksandstein    | `kalksandstein`, ` ks-`, `ks-plan`      |
| Porenbeton       | `porenbeton`, `gasbeton`                |
| Leichtbetonstein | `leichtbetonstein`, `leichtbeton-stein` |
| Ziegel           | `ziegel`, `hochlochziegel`, `klinker`   |
| Betonstein       | `betonstein`, `vollstein aus beton`     |

## E. STLB-Keywords (Entwurf, nicht geladen)

Quelle: `docs/domain/reference/entwuerfe/stlb-keywords-entwurf.csv` – 78 Zeilen, 1209 Wörter. Hier nur die Zeilen, die sich mit A–B überschneiden. Alle anderen stehen in der Datei.

| LB  | Bezeichnung                                       | Wörter                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Prüfhinweis                                                                                                                                   |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 000 | Baustelleneinrichtungen, Sicherheitseinrichtungen | `baustelleneinrichtung`, `bauzaun`, `absturzsicherung`, `bauschild`, `baustellenwc`, `baustrom`, `bauwasser`, `baustellenbeleuchtung`                                                                                                                                                                                                                                                                                                                                                | Strom/Wasser der Baustelle evtl. auch Nebenleistung; einzeln prüfen                                                                           |
| 087 | Abfallentsorgung, Verwertung und Beseitigung      | `abfallentsorgung`, `entsorgung`, `abfall`, `abfallbeseitigung`, `abfallverwertung`, `abfallcontainer`, `baumischabfall`, `mischabfall`, `bauschutt`, `deponie`, `deponierung`, `deponiegebühr`, `deponieklasse`, `ablagerungsklasse`, `entsorgungsnachweis`, `verwertungsnachweis`, `wiegeschein`, `annahmegebühr`, `abfallschlüssel`, `recycling`, `belasteter boden`, `kontaminierter boden`                                                                                      | „entsorgung"/„abfall" auch in Nebenleistungstexten anderer LBs (ständiger Satz „Entsorgung ist einzurechnen") – Hauptrisiko für Fehlzuordnung |
| 090 | Baulogistik                                       | `baulogistik`, `baustellenlogistik`, `logistik`, `baustellenverkehr`, `baustellenzufahrt`, `zufahrtsregelung`, `zufahrtskontrolle`, `ladezone`, `umschlagplatz`, `materialumschlag`, `lagerfläche`, `lagerplatz`, `turmdrehkran`, `turmkran`, `mobilkran`, `baukran`, `autokran`, `krananlage`, `kranvorhaltung`, `kranstellung`, `bauaufzug`, `baustellenaufzug`, `materialaufzug`, `transportaufzug`, `vertikaltransport`, `horizontaltransport`, `schuttrutsche`, `abwurfschacht` | bewusst ohne „kran" allein (Krankenhaus!)                                                                                                     |
| 091 | Stundenlohnarbeiten                               | `stundenlohn`, `stundenlohnarbeiten`, `stundenverrechnungssatz`, `stundensatz`, `regiestunde`, `regiestunden`, `regiearbeiten`, `tagelohn`, `lohnstunde`, `lohnstunden`, `facharbeiter`, `vorarbeiter`, `bauhelfer`                                                                                                                                                                                                                                                                  | bewusst ohne „regie", „polier", „werker" (Regierung, Polierplan, Handwerker)                                                                  |
