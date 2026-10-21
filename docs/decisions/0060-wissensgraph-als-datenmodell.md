# 0060 – Wissensgraph als Datenmodell, keine Graph-Datenbank

- **Status:** vorgeschlagen
- **Datum:** 2026-10-21
- **Betrifft:** Kern (`packages/core/src/model/graph.ts`), künftige Dokumentenlandkarte;
  ergänzt 0054 und 0055

## Worum geht's

- Bubble soll später mehrere Dokumente eines Angebots verbinden: LV, Baubeschreibung,
  Vorbemerkungen, Pläne. Ziel ist eine Landkarte, die zeigt, was wo verlangt wird und
  wo sich Angaben widersprechen.
- Das ist ein Wissensgraph (Knoten = Dinge, Kanten = Beziehungen zwischen ihnen).
- Bubble hat schon die Hälfte davon, nur verstreut: LV-Baum, erkannte Normen, Material,
  Fristen, Verweise auf andere Dokumente, ähnliche Positionen.
- Offen war: Graph nur als Datenmodell, oder gleich mit einer Graph-Datenbank
  (z. B. Neo4j, eine Datenbank für Knoten und Kanten)?

## Entscheidung

- **Graph als Datenmodell im Kern, keine Graph-Datenbank.** Typen in
  `packages/core/src/model/graph.ts` (`ProjectGraph`, `GraphNode`, `GraphEdge`),
  Schema-Kennung `bubble-graph-v1`.
- **Klein anfangen:** sieben Knotenarten (Dokument, Kapitel, Position, Anforderung, Norm,
  Material, Frist) und sieben Kantenarten (gehört zu, verweist auf, fordert,
  nennt Norm, betrifft, Ähnlichkeit, Abweichung). Eine neue Art nur mit Ergänzung dieser
  Entscheidung.
- **Jede Kante trägt ihre Herkunft:**
  - wer sie gefunden hat (Struktur, Regel, Ähnlichkeit, KI, Nutzer),
  - wie sicher sie ist (0 bis 1),
  - ob sie ein Vorschlag, bestätigt oder verworfen ist,
  - die Fundstelle im Text, die sie belegt.
- **Stabile IDs:** Positionen über den Positions-Hash (0055), Dokumente über die
  Datei-ID, Normen über ihre Bezeichnung in Großschreibung mit einfachem Leerraum. So überlebt der Graph ein neues
  Laden und passt zu Notizen und Links.
- **Läuft im Browser.** Ein Angebot mit 10.000 Positionen und einigen hundert Kapiteln
  ergibt grob einige zehntausend Kanten – das hält der Browser im Speicher.
- **Noch kein Code erzeugt Kanten.** Die ersten echten Kanten entstehen mit der ersten
  angedockten PDF (Verweise im LV auf Kapitel der Baubeschreibung).

## Warum

- **Widersprüche werden eine einfache Abfrage:** LV und Baubeschreibung nennen
  verschiedene Betonklassen am selben Material-Knoten.
- **Nachvollziehbar statt Black Box:** Jede Verknüpfung zeigt ihre Fundstelle. Der
  Kalkulator sieht, warum Bubble etwas verbindet.
- **Korrekturen werden Lerndaten:** Bestätigt oder verwirft ein Nutzer einen Vorschlag,
  bleibt das an der Kante stehen. Daraus lassen sich Regeln und später ein Modell
  verbessern.
- **Günstigere KI später:** Ein Sprachmodell bekommt nur den passenden Ausschnitt des
  Graphen statt aller Dokumente. Das senkt die Kosten und macht Antworten belegbar.
- **Fachwissen wird wiederverwendbar:** Materialtabellen und Prüfregeln (0045, 0049)
  sind schon Fachwissen für alle Projekte. Der Projekt-Graph hängt sich daran.
- **Übergabe in die Ausführung:** Der Graph eines gewonnenen Projekts ist genau das,
  was später in die Leistungsmeldung weiterwandert.

## Verworfene Alternativen

- **Neo4j oder eine andere Graph-Datenbank** – braucht einen Server. Bubble hat bewusst
  keinen. Erst sinnvoll, wenn Abfragen über viele Kanten hinweg das Produkt ausmachen.
- **RDF/OWL als internes Modell** (Standardformat für verknüpfte Daten im Web) – sehr
  mächtig, kostet aber Wochen Modellierung, ohne dass ein Kalkulator etwas davon merkt.
  Bleibt als Exportformat im Blick: ICDD (ISO 21597, Container für verknüpfte
  Dokumente) passt fast eins zu eins zur Landkarte.
- **Beziehungen weiter als lose Felder in `attributes`** – reicht für eine Datei, aber
  nicht für Kanten zwischen Dokumenten und nicht für Herkunft und Bestätigung.
- **Gleich alle Knotenarten der Vision** (Termin, Kosten, IFC-Objekt) – erst, wenn eine
  Funktion sie braucht.
- **Bauteil als Knotenart** (z. B. Bohrpfahl, Wand) – vorerst nicht. Die Bauteilerkennung
  läuft noch nicht verlässlich, der Bauteiltyp wurde deshalb schon entfernt (0052). Ein
  Bauteil-Knoten auf unsicherer Erkennung würde falsche Kanten erzeugen. Kommt zurück,
  sobald die Erkennung an echten LVs eine gemessene, gute Trefferquote hat.

## Folgen

- Für Nutzer ändert sich nichts. Es gibt nur das Modell und zwei Hilfsfunktionen
  (`graphNodeId`, `graphEdgeId`) mit Tests.
- **Scope-Konflikt:** `docs/scope.md` schließt „mehrere Dateien gleichzeitig“ noch aus.
  Die Dokumentenlandkarte braucht genau das. Vor der ersten Funktion, die Kanten
  erzeugt, muss der Scope angepasst werden (eigene Entscheidung).
- **Konflikt mit 0049:** Dort gibt es Beziehungen nur als ähnliche Positionen, ohne
  wertende Prüfregel. Die Kante „Abweichung“ ist deshalb bewusst als Hinweis benannt,
  nicht als Urteil („widerspricht“). Erzeugt eine Funktion sie, braucht es eine neue
  Entscheidung, die 0049 ablöst.
- **Quelle „KI“ ist ein Vorgriff:** KI-Klassifizierung ist heute out of scope. Das Modell
  hält nur den Platz frei. Kanten mit Quelle „KI“ erst nach eigener Entscheidung und nur
  als Vorschlag, den der Nutzer bestätigt.
- Wo der Graph gespeichert wird (IndexedDB, Projektdatei, später Server), entscheidet
  die jeweilige Funktion. Diese Entscheidung legt nur das Modell fest.
- Für den Owner: Status von „vorgeschlagen“ auf „akzeptiert“ setzen, wenn das Modell so
  passt.
