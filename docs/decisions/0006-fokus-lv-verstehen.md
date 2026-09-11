# 0006 – Fokus: ein LV vollständig verstehen

- **Status:** akzeptiert
- **Datum:** 2026-09-11
- **Betrifft:** Produkt-Scope, Frontend, Klassifizierung

## Worum geht's

Bubble war als LV-Viewer geplant, der iTwo bei der Angebotskoordination ergänzt. Das
Ziel wird enger gefasst: Bubble macht **eine** Sache, die aber vollständig — ein
Leistungsverzeichnis verstehen. Alles, was in der Datei steckt, soll sichtbar werden,
inklusive der Beziehungen zwischen den Positionen.

## Entscheidung

Ab jetzt gilt [`docs/scope.md`](../scope.md) statt des bisherigen MVP-Scopes.

- Der Zielsatz ist: **ein LV vollständig verstehen**, nicht „Angebotskoordination".
- Der Bubble-Graph ist **nicht mehr der Kern**, sondern eine von acht gleichrangigen
  Ansichten auf demselben Filterzustand.
- Neu dazu kommen: Überblick, Matrix, Ähnlichkeit, Vergleich, Prüfung.
- Neue Säule **Beziehungen**: Ähnlichkeit, Unterschiede und Ausreißer zwischen
  Positionen — berechnet beim Laden im Web Worker.
- Neue Säule **VOB-Check**: Regeln mit Norm-Verweis, als Hinweis formuliert, einzeln
  abschaltbar ([`docs/domain/vob-pruefungen.md`](../domain/vob-pruefungen.md)).
- Die Klassifizierung bekommt gewerkeunabhängige Extraktoren und liefert künftig
  **Textstellen**, damit im Langtext markiert werden kann, woher ein Merkmal kommt.
- **Lokaler Export und Druck sind erlaubt** (CSV, Markdown, Browser-Druck). Sie erzeugen
  keinen Request.
- Zielgröße bleibt 10.000 Positionen, jetzt mit messbaren Zeitvorgaben.

Unverändert: kein Backend, keine Datenbank, kein Login, keine Persistenz über die
Session hinaus, kein GAEB-Export, keine LLM-Klassifizierung.

## Warum

- „Viewer plus Koordination" hätte zwei Dinge halb gemacht. Koordination braucht
  Persistenz und damit einen Server — genau das, was das Produkt nicht haben will.
- Verstehen ist der Teil, der ohne Server vollständig funktioniert.
- Der Unterschied zu iTwo und jedem AVA-Programm liegt nicht im Anzeigen von Zeilen,
  sondern im Erkennen von Zusammenhängen. Das kann heute kein Werkzeug in der Kette.
- Ein einziger Filterzustand über alle Ansichten ist der Grund, warum sich das Werkzeug
  wie ein Werkzeug anfühlt und nicht wie fünf Tabs.

## Verworfene Alternativen

- **Graph bleibt der Kern, alles andere ordnet sich unter** – die neuen Fragen
  (Verteilung, Ähnlichkeit, Vergleich) lassen sich im Graphen nur schlecht beantworten.
  Der Graph zeigt Struktur, nicht Werteverteilung.
- **Tabelle wird der Kern** – dann wäre Bubble ein Tabellenprogramm mehr.
- **Mehrere Dateien vergleichen** (Versionsstände, x83 + x84 zusammenführen) – fachlich
  gewollt, aber ein eigener Zustandsraum. Bleibt bewusst für später.
- **LLM zum Klassifizieren** – braucht einen Server, bleibt draußen.

## Folgen

- Die Datei `docs/mvp-scope.md` heißt jetzt `docs/scope.md`; alle Verweise sind
  umgestellt.
- Der Review-Agent misst ab sofort an dieser Scope-Definition.
- Neue Commit-Scopes: `relate` (Beziehungen) und `check` (Prüfregeln).
- **Der Owner muss liefern**, sonst bleiben Funktionen inaktiv (kein Fehler, aber auch
  kein Nutzen):
  - Bestätigung der VOB-Paragraphen aus `docs/domain/vob-pruefungen.md`
  - Referenzdaten: Herstellerliste, Nebenleistungen je ATV
  - optional Richtwerte für Kennzahlen-Plausibilität
  - Beispieldateien mit Preisen (x84/x86) für Tests
