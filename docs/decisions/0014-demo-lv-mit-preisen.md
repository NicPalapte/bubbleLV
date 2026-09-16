# 0014 – Zweites Demo-LV: Angebot mit Preisen

- **Status:** akzeptiert
- **Datum:** 2026-09-16
- **Betrifft:** Frontend, Demodaten

## Worum geht's

Das bisherige Demo-LV ist die BVBS-Musterdatei — eine Leistungsbeschreibung
(x83) **ohne Preise**. Damit lässt sich alles zeigen, was mit Geld zu tun hat,
gerade nicht: Angebotssumme, Treemap nach Summe, Pareto, Geldtreiber.

## Entscheidung

- Es gibt **zwei** Demo-LVs auf der Startseite:
  - „Demo ohne Preise" — die frei verfügbare BVBS-Musterdatei 3.3 (x83), unverändert.
  - „Demo mit Preisen" — `frontend/src/assets/demo/bubble-demo-angebot.x84`.
- Die neue Datei baut auf der Musterdatei auf:
  - Namespace und Datenaustauschphase auf **84** (Angebotsabgabe) umgestellt,
  - Einheitspreis (`UP`) und Gesamtbetrag (`IT`) je Position ergänzt,
  - drei weitere Titel unter „Bauhauptgewerke" sowie zwei neue Hauptbereiche
    („Ausbaugewerke", „Technische Gebäudeausrüstung") angehängt.
- Umfang: 78 Positionen, 16 Gewerke, Angebotssumme rund 1,65 Mio. €.
- **Alle Preise und alle zusätzlichen Positionen sind erfunden.** Die Datei ist
  Demomaterial — kein Angebot, kein Preisspiegel, keine zertifizierte
  BVBS-Datei. Das steht auch als Kommentar im Kopf der Datei.

## Warum

- **Zwei Dateien statt einer**, weil beide Fälle im Alltag vorkommen und Bubble
  sie unterschiedlich zeigt: ohne Preise sagt der Überblick ausdrücklich „keine
  Preise" und die Mengen übernehmen die Hauptrolle (WP-L). Ersetzte die neue
  Datei die alte, ließe sich dieser Fall nicht mehr vorführen.
- **Auf der Musterdatei aufgebaut** statt neu erfunden: die BVBS-Datei deckt
  Sonderfälle ab, die ein selbst geschriebenes LV nicht hätte — Bedarfs- und
  Alternativpositionen, Index-OZ, Zuschlagsposition ohne Menge, Umlaute,
  unterschiedliche Schreibweisen derselben Einheit („psch", „Psch", „PSCH").
- **Feste Preistabelle statt Zufallszahlen**: die Preise sollen fachlich
  plausibel sein (Oberboden abtragen 5,60 €/m², nicht 70 €/m²). Sie stehen
  als Tabelle je Ordnungszahl im Erzeugungsschritt und sind damit nachvollziehbar.
- **Prüfmengen korrigiert**: die Musterdatei enthält als Zertifizierungsdatei
  bewusst extreme Werte (12.345.678,012 m² Oberboden, 450.000 m Kabel). Mit
  Preisen daran trüge eine einzige Position 96 % der Summe — Pareto und Treemap
  wären wertlos. Diese drei Mengen stehen jetzt auf plausiblen Werten; alle
  anderen sind unverändert.

## Verworfene Wege

- **Die x83-Demo ersetzen.** Ein Demo-Knopf weniger, aber der preislose Fall —
  der häufigere in der Ausschreibungsphase — wäre nicht mehr vorführbar.
- **Preise per Zufallszahl je Einheit.** War der erste Versuch und liefert
  Zahlen, die numerisch passen und fachlich auffallen.
- **Ein Generator-Skript im Repo.** Die Datei entsteht einmal; ein Skript
  dafür wäre dauerhaft zu pflegen. Herkunft und Regeln stehen stattdessen hier
  und im Kopfkommentar der Datei.

## Offen für den Owner

Die Datei ist **nicht** gegen das offizielle GAEB-XSD geprüft — das Schema ist
kostenpflichtig und liegt dem Projekt nicht vor. Sie lädt in Bubble sauber;
ob iTwo sie annimmt, ist ungeprüft. Falls Du sie dort brauchst: einmal
importieren und Bescheid geben, dann wird nachgebessert.
