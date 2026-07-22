# MVP-Scope & Feature-Specs

> **Status:** Ein einziges MVP-Release (keine Drei-Phasen-Staffelung mehr).
> Ziel: lokal lauffähiger Stand (Frontend ↔ FastAPI ↔ PostgreSQL im DevContainer).
> Umsetzungsreihenfolge und Abnahmekriterien: siehe [`implementation-plan.md`](implementation-plan.md).

Das MVP ist ein **LV-Viewer** auf einer **quellen-agnostischen** Datenbasis. Es gibt
genau eine Ansicht mit drei Spalten: **Tree** (links) · **Viewer** mit den Modi
**Bubble-Graph ⇄ Tabelle** (Mitte) · **Eigenschaften** (rechts).

---

## In Scope

### 1 · GAEB-Import in eine quellen-agnostische DB

GAEB DA XML (Versionen 2.0–3.3) hochladen, parsen und persistieren – aber **nicht**
mehr direkt aus dem GAEB-Parser in die Tabellen. Zwischen Parser und DB liegt ein
neutrales Schreibmodell (`LVDraft`), sodass dieselbe Persistenz später auch aus
Excel oder manueller Eingabe gespeist werden kann. Details:
[`architecture/data-model.md`](architecture/data-model.md).

- Re-Import ist idempotent über die **Ordnungszahl (OZ)** als natürlichem Schlüssel.
- Manuell gesetzte Zuständigkeiten bleiben beim Re-Import erhalten.
- Jede persistierte LV trägt eine `source_type`-Markierung (`GAEB | MANUAL | EXCEL`).

### 2 · Klassifizierung von Kurz- und Langtext

Beim Import werden aus Kurz-/Langtext strukturierte Merkmale extrahiert und in einem
flexiblen `attributes`-Feld je Position abgelegt. Die Klassifizierung liegt hinter einer
austauschbaren Schnittstelle (`ClassifierProtocol`); im MVP arbeitet ein **regelbasierter**
Extraktor (heuristisch), ein **LLM-Klassifizierer** kann später ohne Umbau eingehängt und
per Config aktiviert werden. Erkannte Merkmale:

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

**Suche:** eine Suchleiste über Kurztext, OZ und Langtext.

**Facetten-Filter:** dynamisch aus den Daten erzeugt – Betongüte, Expositionsklasse,
tragend, Status, Zuständigkeit, Mengen-Range. Aktive Filter als entfernbare Chips;
Modus **Hervorheben** (dimmt Nicht-Treffer) oder **Ausblenden**.

**Zuständigkeit:** Bearbeiter je Position setzen (Team-Roster), im Backend persistiert.

**Eigenschaften (rechts):** Details der gewählten Position – Kurz-/Langtext mit
Hervorhebung, klassifizierte Merkmale, Einheit/Menge/EP, Zuständigkeit.

---

## Out of Scope {#out-of-scope}

Bewusst **nicht** im MVP. Alles hier wird abgelehnt oder auf „später" vertröstet.

| Bereich | Anmerkung |
|---|---|
| Analytik-Seiten (`lv-analytics.jsx`) | nur Viewer |
| Aufgaben / `TasksBlock` | keine Task-Verwaltung |
| Notizen (`lv-notes.jsx`) | Modelle dürfen existieren, werden im UI aber nicht bespielt; hängen ab Schritt 2 der Roadmap am `WBSNode` (`wbs_node_id`), nicht an der Position — siehe [`vision.md`](vision.md) |
| Vergabepakete (`lv-vergabe.jsx`), NU-Anfragen, Bieterfragen | inkl. der Vergabepaket-Kanten im Graph |
| Status **ändern** | Status ist nur Filter-Facette (Default `OPEN` aus Import), keine UI-Bearbeitung |
| Auth / Azure AD SSO | lokaler Dev-Betrieb ohne Login; Auth-Schicht bleibt nur abstrahiert vorhanden |
| Server-Volltext (`tsvector`) | MVP filtert/sucht clientseitig; `tsvector` ist spätere Optimierung |
| LLM-Klassifizierung | Schnittstelle (`ClassifierProtocol`) ist vorbereitet, Anbindung ist Post-MVP |
| Excel-/Manuell-Import | DB ist dafür vorbereitet, Import-Wege sind aber nicht Teil des MVP |
| Multi-Tenant / SaaS, GAEB-Export, EP-Kalkulation in der App | nie bzw. weit später |

---

## Datenmodell-Abgleich Design ↔ Backend

Der Claude-Design-Prototyp ist 2-stufig (Abschnitt → Position) mit handgepflegten
Klassifizierungswerten. Das Backend ist 3-stufig (Los → Abschnitt → Position, Abschnitt
selbst-verschachtelbar). Der Viewer rendert die volle Backend-Hierarchie; die
Klassifizierungswerte kommen im MVP aus dem Import-Extraktor statt aus Fixtures.
