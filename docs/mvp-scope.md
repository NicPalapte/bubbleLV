# MVP-Scope & Feature-Specs

> **Status:** Ein einziges MVP-Release, **frontend-only** (kein eigenes Backend,
> keine DB, kein Login). Ziel: eine statische App, die frei im Internet erreichbar
> ist – eine geladene GAEB-Datei verlässt den Browser nie, es wird nichts
> gespeichert. Statische Fremd-Assets (Webfonts, CDN-Pakete) sind erlaubt; sie
> transportieren keine Nutzdaten.
> Umsetzungsreihenfolge und Abnahmekriterien: siehe [`implementation-plan.md`](implementation-plan.md).

Das MVP ist ein **LV-Viewer** auf einer **quellen-agnostischen** Datenstruktur, die im
Browser aus einer geladenen Datei aufgebaut wird. Es gibt genau eine Ansicht mit drei
Spalten: **Tree** (links) · **Viewer** mit den Modi **Bubble-Graph ⇄ Tabelle** (Mitte) ·
**Eigenschaften** (rechts).

---

## In Scope

### 1 · GAEB-Import im Browser

GAEB DA XML (Versionen 2.0–3.3) per Drag & Drop oder Datei-Dialog laden, im Browser
parsen und in ein neutrales Zwischenmodell (`LVDraft`) überführen, sodass dieselbe
Baum-Aufbau-Logik später auch aus Excel oder manueller Eingabe gespeist werden könnte
(nicht Teil des MVP). Details: [`architecture/data-model.md`](architecture/data-model.md).

- Alles passiert clientseitig via `File.arrayBuffer()`; kein Upload an einen Server.
- Erneutes Laden einer Datei ersetzt den aktuellen Session-Stand vollständig – es gibt
  keinen persistierten Vorzustand, den es zu erhalten gilt.
- Kein `source_type`-Tracking über eine Session hinaus nötig (nur GAEB als Quelle im MVP).

### 2 · Klassifizierung von Kurz- und Langtext

Direkt nach dem Parsen werden aus Kurz-/Langtext strukturierte Merkmale extrahiert und
in einem flexiblen `attributes`-Feld je Position abgelegt — **mehrstufig**: zuerst wird
der Text direkt gegen die **STLB-Bau-Leistungsbereiche (LB)** gematcht (Referenzkatalog,
siehe [`architecture/pipeline.md`](architecture/pipeline.md)); daraus ergeben sich
**Gewerk** (LB-Nummer + Bezeichnung, normbasiert statt Freitext) und — für eindeutig
nicht-physische LBs wie Baustelleneinrichtung — direkt die **Positionsart**. Fehlt ein
LB-Treffer (unvollständiger Referenzkatalog oder LV ohne STLB-Bezug), fällt die
Positionsart-Erkennung auf eine Stichwort-/Einheiten-Heuristik zurück
(`bauteil | personal | planung | baustelleneinrichtung | nebenleistung | sonstige`).
Für Bauteil-Positionen wird zusätzlich der **Bauteiltyp** (Wand, Decke, Fundament, …)
erkannt — ein LB deckt meist mehrere Bauteiltypen ab, daher bleibt das ein eigener
Erkennungsschritt. Die eigentliche Eigenschafts-Extraktion läuft über ein **Ruleset je
Bauteiltyp/LB-Kombination**, das sich schrittweise um weitere LBs ergänzen lässt, ohne
Bestehendes zu ändern. Die Klassifizierung liegt hinter einer austauschbaren
TS-Schnittstelle; im MVP arbeitet ein **regelbasierter** Extraktor (heuristisch,
deterministisch, synchron/Worker-fähig). Ein LLM-Klassifizierer ist **Post-MVP** und
setzt einen Server voraus, der im MVP bewusst nicht existiert.

Für Ortbeton-/Fertigteil-Bauteile erkannte Merkmale (Beispiel-Ruleset; weitere Gewerke
folgen inkrementell, siehe WP-B in [`implementation-plan.md`](implementation-plan.md)):

- **Betongüte** (`C25/30`, `C30/37`, `C35/45` …)
- **Expositionsklassen** (`XC1`–`XC4`, `XD1`–`XD3`, `XF1`–`XF4`, `XS1`–`XS3`, `XA1`–`XA3`)
- **tragend / nichttragend**
- **Maße** (Dicke, Höhe – soweit im Text erkennbar)
- **Stichworte / Besonderheiten** (z. B. „WA-Beton", „Sichtbeton SB2", „Schöck Tronsole")

Diese Merkmale speisen die Facetten-Filter und die Langtext-Hervorhebung im Viewer.

### 3 · LV-Viewer

**Tree (links):** Hierarchie Los → Abschnitt → Position, kollabierbar, filter- und
suchbewusst (leere Zweige werden je nach Modus ausgeblendet oder gedimmt).

**Bubble-Graph (Mitte, Kern des Produkts):** rekursiver Knowledge-Graph über den
gesamten Baum (Projekt → Los → Abschnitt → ggf. Unterabschnitt/Gruppe → Position).
Radiales Tidy-Tree-Layout, Zoom mit Level-of-Detail (Labels blenden bei kleinem
Zoom aus), Viewport-Culling, Cluster-Bubbles bei vielen Geschwistern. Bubble-Größe
über umschaltbare Modi: **Anz. Positionen · Gesamtpreis € · Einheitlich**.
Klick auf einen Knoten drillt hinein; auf Positionsebene öffnet sich die Tabelle.

**Tabelle (Mitte, alternativer Modus):** sortierbare Positionsliste des gewählten
Abschnitts bzw. der gefilterten Menge.

**Suche:** eine Suchleiste über Kurztext, OZ und Langtext, clientseitig über den
kompletten geladenen Baum.

**Facetten-Filter:** dynamisch aus den Daten erzeugt – Betongüte, Expositionsklasse,
tragend, Status, Mengen-Range. Aktive Filter als entfernbare Chips; Modus
**Hervorheben** (dimmt Nicht-Treffer) oder **Ausblenden**.

**Eigenschaften (rechts):** Details der gewählten Position – Kurz-/Langtext mit
Hervorhebung, klassifizierte Merkmale, Einheit/Menge/EP.

---

## Out of Scope {#out-of-scope}

Bewusst **nicht** im MVP. Alles hier wird abgelehnt oder auf „später" vertröstet.

| Bereich | Anmerkung |
|---|---|
| Jede Server-Komponente | Backend/DB der ursprünglichen Planung ist archiviert auf `archive/backend-mvp`, nicht Teil des aktiven MVP |
| Analytik-Seiten (`lv-analytics.jsx`) | nur Viewer |
| Aufgaben / `TasksBlock` | keine Task-Verwaltung |
| Notizen (`lv-notes.jsx`) | kein Server, an dem sie hängen könnten |
| Vergabepakete (`lv-vergabe.jsx`), NU-Anfragen, Bieterfragen | inkl. der Vergabepaket-Kanten im Graph |
| **Zuständigkeit** (Bearbeiter-Zuweisung) | ohne Server/Persistenz kein sinnvoller Mehrwert über einen Reload hinaus – bewusst raus, nicht nur „read-only" |
| Status **ändern** | Status ist nur Filter-Facette (Default `OPEN` aus Import), keine UI-Bearbeitung |
| Auth / Login / SSO | keine Nutzerverwaltung, keine Accounts |
| Persistenz über die Session hinaus | kein `localStorage`, keine Cookies, keine IndexedDB für Fachdaten – ein Reload verwirft den Stand bewusst |
| Server-Volltext | Suche/Filter sind immer clientseitig, es gibt keinen Server dafür |
| LLM-Klassifizierung | setzt einen Server für den Modellaufruf voraus – Post-MVP, außerhalb dieses Repos |
| Excel-/Manuell-Import | Datenmodell ist dafür offen, Import-Wege sind aber nicht Teil des MVP |
| Multi-Tenant / SaaS, GAEB-Export, EP-Kalkulation in der App | nie bzw. weit später |

---

## Datenmodell-Abgleich Design ↔ Frontend

Der Claude-Design-Prototyp ist 2-stufig (Abschnitt → Position) mit handgepflegten
Klassifizierungswerten. Die Ziel-Datenstruktur ist 3-stufig (Los → Abschnitt →
Position, Abschnitt selbst-verschachtelbar). Der Viewer rendert die volle Hierarchie;
die Klassifizierungswerte kommen im MVP aus dem client-seitigen Klassifizierer statt
aus Fixtures.
