# 0017 – Keine Nutzungsmessung, nur ein Melde-Knopf

- **Status:** akzeptiert
- **Datum:** 2026-09-21
- **Betrifft:** Frontend, Datenschutz, Issue #57

## Worum geht's

Gewünscht war: messen, wie oft die Seite benutzt wird, welche Ansichten laufen und wie
Nutzer klassifizieren — dazu eine Möglichkeit, Fehler zu melden (Issue #57).

Messen heißt: Daten verlassen den Browser. Das widerspricht der härtesten Regel des
Projekts — kein Server, kein Request mit Nutzdaten.

## Entscheidung

- **Keine Nutzungsmessung.** Auch keine anonyme, auch nicht über einen fremden Dienst.
- **Keine Sammlung von Klassifizierungen.** Das wären Inhalte aus der geladenen Datei.
- **Ein Melde-Knopf bleibt** (WP-P, Schritt 6): Er öffnet ein vorbefülltes GitHub-Issue
  in einem neuen Tab. Inhalt: Browser, App-Version, Fehlermeldung. Nichts aus der
  geladenen Datei — kein Dateiname, keine Positionstexte, keine Zahlen.
- Der Nutzer sieht den Text und schickt ihn selbst ab. Bubble sendet nichts.

## Warum so

- Ein Zähler braucht einen Empfänger. Ein Empfänger ist ein Server — egal, ob eigener
  oder fremder.
- Anonym ist nicht harmlos: Wer misst, welche Filter jemand setzt, misst mit, was in
  dessen LV steht.
- Ein Link, den der Nutzer selbst anklickt, ist kein Request der App. Er transportiert
  nur das, was sichtbar im Formular steht.

## Verworfene Wege

- **Fremder Analyse-Dienst** (Plausible, Umami und ähnliche): technisch einfach, aber
  ein Request mit Nutzungsdaten bleibt ein Request mit Nutzungsdaten.
- **Eigener Zähl-Endpunkt:** setzt genau den Server voraus, den es nicht geben soll.
- **Zählen im Browser und später exportieren:** braucht Persistenz über die Session
  hinaus — ebenfalls ausgeschlossen.
- **Automatisch abgeschickter Fehlerbericht:** der Nutzer sieht nicht, was rausgeht.
  Deshalb nur der vorbefüllte Link.

## Folgen

- Es gibt keine Zahlen darüber, wie Bubble benutzt wird. Rückmeldung kommt über Issues.
- Sollte es je einen Server geben, wird diese Entscheidung ersetzt, nicht umgeschrieben.
