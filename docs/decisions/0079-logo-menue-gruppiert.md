# 0079 – Logo-Menü gruppiert, Exporte gebündelt

- **Status:** akzeptiert
- **Datum:** 2026-10-27
- **Betrifft:** Logo-Menü (`frontend/src/components/layout/AboutMenu.tsx`),
  Admin-Werkzeuge (`frontend/src/components/layout/AdminDialog.tsx`)
- **Ersetzt:** in 0027 den Eintrag „Was ist neu“ im Menü

## Worum geht's

- Das Logo-Menü war auf 16 Einträge in einer Liste gewachsen.
- Exporte standen ohne Überschrift zwischen Öffnen und Notizen.
- Nico: Menü sortieren, Exporte bündeln, Überflüssiges raus. Mockup-Variante A gewählt.

## Entscheidung

- **Oben:** „Anderes LV öffnen“, „PDF hinzufügen…“.
- **Drei Gruppen, die im Menü aufklappen** (kein Seitenmenü):
  - Exportieren: „Positionen als Tabelle (CSV)“, „Prüfhinweise als Text“, „Drucken / als PDF“
  - Meine Notizen: sichern, laden
  - Hilfe & Feedback: Tour, Tastenkürzel, Fehler melden, Feedback geben
- Beim ersten Öffnen sind alle Gruppen zu. Eine aufgeklappte Gruppe bleibt es, bis man
  sie zuklappt oder neu lädt.
- **Unten:** Design hell/dunkel, dann Fußzeile mit Impressum, Datenschutz, Lizenzen, Admin.
- **Treffer-Protokoll (CSV)** sitzt im Fenster Admin-Werkzeuge (nach dem Passwort).
- **„Was ist neu“** ist raus. Der Changelog bleibt im Repo.

## Warum

- Kalkulatoren brauchen Öffnen und Exportieren, der Rest ist selten.
- Aufklappen an Ort und Stelle geht am Tablet; ein Seitenmenü auf Hover nicht.
- Das Treffer-Protokoll dient nur dem Prüfen der Materialtabellen.
- „Was ist neu“ führte auf GitHub — dort sucht ein Kalkulator nichts.

## Verworfene Alternativen

- **Variante B, flach mit Überschriften:** alles sofort sichtbar, aber das Menü bleibt lang.
- **Untermenü seitlich:** am Tablet nicht bedienbar.

## Folgen

- Export-Einträge heißen anders: „Positionen als Tabelle (CSV)“, „Prüfhinweise als Text“,
  „Drucken / als PDF“. Die Dateien selbst bleiben gleich.
- Nichts einmalig zu tun.
