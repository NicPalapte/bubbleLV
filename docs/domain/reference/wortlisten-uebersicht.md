# Wortlisten – wo sie stehen

Diese Seite ist für den Repo-Owner.

**Stand:** 2026-10-05, nach Umbau auf die Mappingtabelle
([`0032`](../../decisions/0032-zuordnung-per-mappingtabelle.md)).

## Ergebnis

- **Alle Stichwort-Listen stehen jetzt an einer Stelle:**
  [`zuordnung.csv`](zuordnung.csv). Die Listen im Code sind weg.
- Eine Zeile je Stichwort. Du prüfst, indem du Zeilen streichst, ergänzt oder in der
  Spalte `status` von `uebernommen` auf `bestaetigt` setzt.
- Dasselbe Wort kann in zwei Dimensionen stehen, z. B. `polier` bei `positionsart`
  (→ personal) und bei `qualifikation` (→ Polier). Es beantwortet zwei verschiedene
  Fragen. Du siehst es jetzt in einer Datei und kannst es streichen.

## Welche Dimension was beantwortet

| Dimension          | Frage                                                             | Wirkt auf                                | Gewicht                                                                 |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| `leistungsbereich` | Zu welchem STLB-Leistungsbereich gehört die Position?             | Kurz- und Langtext, danach Überschriften | alle 100, das längere Wort gewinnt                                      |
| `positionsart`     | Bauteil, Personal, Planung, Baustelleneinrichtung, Nebenleistung? | nur Kurztext                             | 400 Baustelleneinrichtung, 300 Personal, 200 Planung, 100 Nebenleistung |
| `bauteiltyp`       | Wand, Decke, Fundament, …?                                        | nur Kurztext                             | 1200 (Bodenplatte) bis 100 (Gründung): spezifisch vor allgemein         |
| `qualifikation`    | Welche Qualifikation steht bei Personal?                          | Kurz- und Langtext                       | Reihenfolge Polier, Vorarbeiter, Facharbeiter, Werker                   |
| `planungsart`      | Welche Art Planung?                                               | Kurz- und Langtext                       | Reihenfolge Statik … Gutachten                                          |
| `einrichtungsart`  | Einrichten, Vorhalten, Räumen?                                    | Kurz- und Langtext                       | Reihenfolge der Spalte                                                  |
| `steinart`         | Welche Steinart bei Mauerwerk?                                    | Kurz- und Langtext                       | Reihenfolge Kalksandstein … Betonstein                                  |
| `material`         | Welches Material?                                                 | Langtext                                 | noch keine Zeilen                                                       |
| `kostengruppe`     | DIN 276                                                           | –                                        | nur Format, keine Daten                                                 |

## Spalten

`dimension, code, stichwort, wo, gewicht, quelle, status, hinweis`

- `wo`: `kurztext` (nur der benennende Text) oder `alle`.
- `gewicht`: höher gewinnt, vor der Wortlänge.
- `quelle`: `katalog` (aus der LB-Bezeichnung abgeleitet), `code` (aus den früheren
  Code-Listen), `owner`, `lernregel`.
- `status`: `bestaetigt`, `uebernommen` (wirkt, noch nicht von dir geprüft), `entwurf` (wirkt nicht).
- `_` am Rand eines Stichworts steht für ein Leerzeichen.

## Was noch im Code steht

Das sind keine Stichwort-Zuordnungen:

- Einheiten, die auf Bauteil oder Zeit deuten: `frontend/src/lib/classify/positionsart.ts`
  (`BAUTEIL_UNITS`, `ZEIT_UNITS`).
- Welche Bauteiltypen ein Fach-Ruleset abdeckt: `rulesets/beton.ts`, `rulesets/mauerwerk.ts`.
- Welche Bauteiltypen tragen können: `bauteiltyp.ts` (`TRAGENDE_BAUTEILTYPEN`).
- Schreibweisen für „nicht tragend": `rulesets/beton.ts` (`NICHT_TRAGEND`).

## Auffällig beim Prüfen

- **`bauarbeiten`** (LB 096/097) ist aus der Bezeichnung abgeleitet und trifft jeden Text
  mit „Bauarbeiten". Das war schon vorher so. Wahrscheinlich streichen.
- Vier weitere abgeleitete Wörter zeigen auf zwei LB: `landschaftsbauarbeiten` (003/004),
  `wärmeversorgungsanlagen` (040/041), `entwässerungsanlagen` (045/046),
  `niederspannungsanlagen` (053/054). Der Hauptwert ist der erste in der Tabelle.
