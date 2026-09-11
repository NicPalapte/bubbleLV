# Produkt-Scope — „Ein LV vollständig verstehen"

> **Status:** gültige Scope-Definition, ersetzt den bisherigen MVP-Scope.
> Begründung der Kursänderung: [`decisions/0006-fokus-lv-verstehen.md`](decisions/0006-fokus-lv-verstehen.md).
> Umsetzungsreihenfolge und Abnahmekriterien: [`implementation-plan.md`](implementation-plan.md).

## Der eine Satz

**Bubble macht ein Leistungsverzeichnis lesbar.** Es zeigt jede Information, die in der
Datei steckt, hebt das Wichtige hervor und macht die Beziehungen zwischen Positionen
sichtbar — im Browser, ohne Server, ohne dass die Datei den Rechner verlässt.

Das ist die einzige Aufgabe. Alles, was nicht dem Verstehen einer geladenen Datei dient,
gehört nicht in dieses Produkt.

**Weiterhin nicht verhandelbar:** kein Backend, keine Datenbank, kein Login, keine
Persistenz über die Session hinaus. Statische Fremd-Assets (Webfonts, npm-Pakete) sind
erlaubt, sie transportieren keine Nutzdaten.

---

## Anwendungsfälle

> **Vorschlag, vom Owner zu bestätigen oder zu korrigieren.** Sie sind aus der Sicht des
> Bieters/Auftragnehmers formuliert (Angebotsbearbeitung), nicht aus Sicht des
> ausschreibenden Büros. Jede Ansicht in diesem Dokument bedient mindestens einen
> dieser Fälle — Ansichten ohne Anwendungsfall werden nicht gebaut.

| Nr. | Anwendungsfall | Leitfrage | Ansichten |
|---|---|---|---|
| UC-1 | **Erster Überblick** (Tag 1 nach Erhalt) | Wie groß, welche Gewerke, wo liegen die Schwerpunkte? | Überblick, Graph |
| UC-2 | **Risiko-Durchsicht** vor der Abgabe | Wo lauern Bedarfspositionen, Stundenlohn, Wagnisse, Lücken? | Prüfung, Tabelle |
| UC-3 | **Paketbildung / Kalkulationsvorbereitung** | Was gehört fachlich zusammen, was wiederholt sich? | Ähnlichkeit, Matrix |
| UC-4 | **Mengengerüst verstehen** | Welche Mengen und Einheiten dominieren, ist das plausibel? | Überblick, Matrix, Tabelle |
| UC-5 | **Einzelne Position verstehen** | Was genau ist gefordert, welche Norm gilt, was ist anders als nebenan? | Eigenschaften, Vergleich |
| UC-6 | **Unklarheiten sammeln** (Grundlage für Bieterfragen) | Welche Stellen sind unvollständig, widersprüchlich oder auszufüllen? | Prüfung |

UC-6 liefert **nur die Liste**. Fragen verwalten, zuweisen oder versenden bleibt draußen
— das braucht einen Server (siehe Out of Scope).

---

## In Scope

### 1 · Import

- GAEB DA XML 3.0–3.3 per Drag & Drop oder Datei-Dialog, komplett clientseitig.
- **Neu: preisführende Phasen** (x84, x86) werden ebenso gelesen wie x83. Ohne sie
  bleiben alle Geld-Ansichten leer, weil x83 meist keine Einheitspreise enthält.
- **Neu: Hinweistexte und Textergänzungen** werden mit eingelesen statt verworfen
  (in realen Dateien hunderte Stück, siehe [`plans/issue-41-app-usage-review.md`](plans/issue-41-app-usage-review.md)).
- Eine Datei zur Zeit. Erneutes Laden ersetzt den Stand vollständig.

### 2 · Große Dateien

Richtwert: **10.000 Positionen** flüssig. Messbare Zielwerte, gültig für alle Ansichten:

| Was | Ziel |
|---|---|
| Laden bis erste Ansicht (10k Positionen) | < 5 s |
| Filter/Suche ändern → Ansicht aktualisiert | < 100 ms |
| Zoom/Pan im Graphen | flüssig (keine sichtbaren Ruckler) |
| Ansicht wechseln | < 200 ms, Filter und Auswahl bleiben erhalten |

Mittel dazu: flacher Positions-Index statt Baum-Traversierung bei jedem Render,
Aggregation im Web Worker, Virtualisierung in der Tabelle, Level-of-Detail und Culling
im Graphen.

### 3 · Klassifizieren und Hervorheben

Die Klassifizierung bleibt hinter der austauschbaren TS-Schnittstelle
(`frontend/src/lib/classify/`) und wird um **quellen- und gewerkeunabhängige**
Extraktoren erweitert. Sie greifen auch dort, wo kein STLB-Ruleset existiert:

| Merkmal | Beispiel | Wofür |
|---|---|---|
| Normen-Verweise | `DIN EN 206`, `DIN 18300`, `ZTV-ING` | Qualitätsanforderungen sichtbar machen |
| Maße und Mengengrößen | `d = 30 cm`, `bis 3,50 m`, `≥ 5 t` | Vergleich, Filter |
| Material | Beton, Stahl, Holz, Bitumen, Dämmstoff | Ähnlichkeit, Matrix |
| Platzhalter / Textergänzungen | „vom Bieter einzutragen" | UC-6 |
| Verweise | „siehe Pos. 01.020", „gemäß Baugrundgutachten" | Vollständigkeit |
| Fristen und Randbedingungen | Bauzeit, Winterbau, Arbeiten unter Verkehr | UC-2 |

**Hervorhebung im Text:** Der Klassifizierer liefert künftig **Textstellen**
(Zeichen-Positionen) statt nur Werte. Nur so lässt sich im Langtext markieren, *woher*
ein Merkmal stammt. Das ist eine Erweiterung des `attributes`-Schemas, siehe
[`architecture/data-model.md`](architecture/data-model.md).

**Vier Kategorien von „wichtig"** (vom Owner bestätigt), jede als eigene, abschaltbare
Hervorhebung:

1. **Geld- und Mengentreiber** — Anteil an der Gesamtsumme, auffällige Mengen,
   Einheitspreis-Ausreißer gegenüber ähnlichen Positionen.
2. **Risiko und Unschärfe** — Bedarfs-/Alternativ-/Zulageposition, Stundenlohn, fehlende
   Menge oder Einheit, offene Platzhalter, unklare Formulierungen.
3. **Normen und Qualitäten** — DIN/EN-Verweise, Betongüte, Expositions- und
   Feuchtigkeitsklassen, Sichtbeton- und Toleranzklassen, Brandschutz.
4. **Fristen und Randbedingungen** — Termine, Bauzeiten, Vorleistungen, Winterbau,
   Arbeiten unter Verkehr.

### 4 · VOB-Check

Eigene Säule, weil sie als einzige **bewertet** statt nur beschreibt. Bubble prüft die
geladene Datei gegen einen Katalog von Regeln und zeigt Hinweise — jede Regel mit
Norm-Verweis, jeder Hinweis mit Sprung zur Fundstelle.

- Regelkatalog, Norm-Verweise und offene Bestätigungen: [`domain/vob-pruefungen.md`](domain/vob-pruefungen.md)
- **Kein Rechtsrat, keine Vollständigkeit.** Bubble sagt „hier lohnt ein Blick", nicht
  „das ist unzulässig". Die Formulierung im UI hält sich daran.
- Regeln sind einzeln abschaltbar und liefern nie einen Fehler, wenn Referenzdaten
  fehlen — sie greifen dann einfach nicht.

### 5 · Filter

- `matchPos` bleibt die **einzige** Quelle für Filter- und Suchlogik.
- Facetten entstehen weiterhin dynamisch aus den vorkommenden Werten.
- **Neu: fachliche Filter** über die Merkmale aus Abschnitt 3 — Norm, Material, Maß,
  Flag-Kategorie, Prüf-Hinweis, „hat Platzhalter", „ohne Preis", „ohne Menge".
- **Neu: Wertebereiche** für Menge, Einheitspreis, Gesamtpreis und Anteil an der Summe.
- Aktive Filter bleiben beim Ansichtswechsel erhalten. Modi Hervorheben und Ausblenden
  wie bisher.

### 6 · Ansichten — gleichrangig, ein Filterzustand

Alle Ansichten arbeiten auf **derselben gefilterten Menge** und **derselben Auswahl**.
Wechseln heißt: anderer Blick auf dasselbe, nie Neuanfang.

| Ansicht | Zeigt | Anwendungsfall | Stand |
|---|---|---|---|
| **Überblick** | Kennzahlen, Treemap nach Gewerk/Abschnitt, Pareto („20 % der Positionen = 80 % der Summe") | UC-1, UC-4 | neu |
| **Graph** | Struktur und Verortung als Bubble-Graph | UC-1 | vorhanden, Umbau offen |
| **Tabelle** | alle Spalten, Gruppierung, Summen | UC-2, UC-4 | vorhanden |
| **Matrix** | Heatmap Gewerk/Bauteiltyp × Merkmal, Zellen nach Anzahl/Menge/Summe | UC-3, UC-4 | neu |
| **Ähnlichkeit** | Gruppen inhaltlich ähnlicher Positionen, Dubletten, Varianten, Ausreißer | UC-3 | neu |
| **Vergleich** | 2–5 Positionen nebeneinander, Unterschiede in Text und Merkmalen markiert | UC-5 | neu |
| **Prüfung** | Liste aller Hinweise aus VOB-Check und Flags, gruppiert nach Regel | UC-2, UC-6 | neu |
| **Eigenschaften** | Details der gewählten Position mit hervorgehobenem Langtext | UC-5 | vorhanden |

Der Bubble-Graph ist damit **nicht mehr „der Kern"**, sondern eine von mehreren
gleichrangigen Ansichten. Er bleibt das Erkennungsmerkmal und die Einstiegsansicht.

### 7 · Beziehungen zwischen Positionen

Der Punkt, den Bubble heute gar nicht kann. Drei Ausprägungen, alle aus denselben
Merkmalen berechnet:

- **Ähnlichkeit** — Positionen mit ähnlichem Text und gleichen Merkmalen werden
  gruppiert. Findet Wiederholungen über Lose hinweg und Varianten derselben Leistung.
- **Unterschied** — innerhalb einer Gruppe wird markiert, was die Positionen
  auseinanderhält: eine Zeile Langtext, eine andere Betongüte, eine andere Dicke.
- **Ausreißer** — gleiche Leistung, abweichender Einheitspreis oder abweichende
  Mengenordnung. Nur bei Dateien mit Preisen.

Berechnet **einmalig beim Laden im Worker**, nicht bei jedem Render. Paarweiser
Vergleich aller Positionen ist bei 10.000 Positionen nicht bezahlbar — vorgeschaltet
wird eine Gruppierung (Gewerk, Einheit, Bauteiltyp) und ein Ähnlichkeits-Index, sodass
nur innerhalb kleiner Kandidatenmengen verglichen wird. Details im
[`implementation-plan.md`](implementation-plan.md) (WP-M).

### 8 · Ausgabe (neu erlaubt)

Bisher galt „kein Export". Das wird gelockert, weil es die Architektur nicht berührt:

- **Lokaler Download** der aktuellen Auswertung als CSV oder Markdown (gefilterte
  Positionsliste, Prüf-Hinweise, Kennzahlen). Erzeugt im Browser, kein Server beteiligt.
- **Druckansicht** der gefilterten Menge über das Browser-Drucken.
- **Kein GAEB-Export** — das bleibt draußen (Rückschreiben in die Vergabekette ist ein
  anderes Produkt).

---

## Out of Scope {#out-of-scope}

Bewusst **nicht** Teil dieses Produkts. Anfragen dazu werden abgelehnt oder vertröstet.

| Bereich | Anmerkung |
|---|---|
| Jede Server-Komponente, DB, Login, SSO | unverändert die härteste Regel |
| Persistenz über die Session hinaus | kein `localStorage`, keine Cookies, keine IndexedDB für Fachdaten |
| **Mehrere Dateien gleichzeitig** | Zwei LVs vergleichen (Versionsstände, Nachträge) und x83+x84 zusammenführen: **perspektivisch gewollt, jetzt draußen** |
| LLM-Klassifizierung | setzt einen Server voraus |
| Aufgaben, Notizen, Zuständigkeit, Vergabepakete, NU-Anfragen | braucht Persistenz |
| Bieterfragen **verwalten** | Bubble liefert nur die Liste der Unklarheiten (UC-6) |
| Status **ändern** | Status bleibt Filter-Facette, Default `OPEN` aus dem Import |
| EP-Kalkulation, Preisdatenbank | das ist iTwo, nicht Bubble |
| GAEB-Export, Excel-/Manuell-Import | Datenmodell bleibt offen dafür, Wege werden nicht gebaut |
| Multi-Tenant / SaaS | nie |

---

## Was sich gegenüber dem MVP-Scope ändert

| Punkt | Vorher | Jetzt |
|---|---|---|
| Zielsatz | LV-Viewer, der iTwo bei der Angebotskoordination ergänzt | Ein LV vollständig verstehen |
| Ansichten | Graph ist der Kern, Tabelle ist Beiwerk | acht gleichrangige Ansichten, ein Filterzustand |
| Beziehungen | gar nicht vorhanden | eigene Säule (Ähnlichkeit, Unterschied, Ausreißer) |
| Bewertung | nur beschreiben | VOB-Check und Flags bewerten (als Hinweis) |
| Klassifizierung | Rulesets je Gewerk, sonst dünner Fallback | zusätzlich gewerkeunabhängige Extraktoren mit Textstellen |
| Export | verboten | lokaler Download und Druck erlaubt |
| Preisdateien | nur x83 betrachtet | x84/x86 ausdrücklich mit |
