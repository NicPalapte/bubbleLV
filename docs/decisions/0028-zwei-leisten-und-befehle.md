# 0028 – Zwei Leisten, und „Mitnehmen" wandert in die Befehle

- **Status:** akzeptiert
- **Datum:** 2026-09-24
- **Betrifft:** Frontend (Kopfleiste, Kommandopalette), Issue #80

## Worum geht's

In einer einzigen 54-px-Leiste teilten sich Logo, Projektname, Suche, sieben Ansichten,
dreizehn Facetten-Knöpfe und drei Schaltflächen den Platz. Gemessen bei 1440 px:
**kein einziger Facetten-Knopf** war sichtbar, alle steckten im Überlauf-Menü, und
selbst das Wort „FILTER" wurde zu „FILTE" abgeschnitten.

## Entscheidung

- **Zwei Leisten.** Oben (46 px): Logo, Projektkontext, Ansichtsumschalter, „LV
  schließen". Unten (42 px): Suche, Facetten-Filter. Regel dahinter: oben steht,
  **wo** man ist und **was** man ansieht; unten, **wonach** gesucht und gefiltert wird.
- **Kein Knopf für Export, Druck, Melden oder die Palette in der Leiste.** Die
  Funktionen bleiben:
  - Export, Druck und Melden sind **Befehle** in der Kommandopalette (Gruppe
    „Mitnehmen"),
  - „Fehler melden" zusätzlich in „Über diese App" hinter dem Logo ([`0027`](0027-versionsnummer-und-ueber-diese-app.md)).
- **Die Palette hat selbst keinen Knopf mehr**, sondern öffnet mit Strg/Cmd + K. Damit
  sie auffindbar bleibt, nennt die Filterleiste rechts die Taste (`STRG/CMD + K ·
  BEFEHLE`), und der Einstiegstext auf der Startseite erklärt sie in einer Zeile.
- **Ein Befehl bleibt reine Daten.** Wirkungen außerhalb des Viewer-Zustands tragen
  eine Marke (`CommandEffect`: `export-csv`, `export-md`, `print`, `report`); die
  Palette setzt sie in den Aufruf um. So steht in einem Test, was ein Befehl tut,
  ohne dass er ausgeführt werden muss.
- **Die Export-Logik lebt in `components/common/useMitnehmen.ts`**, nicht mehr in
  einem Menü. `ExportMenu.tsx` ist entfallen.

## Warum

- **Gemessen statt geschätzt:** vorher 0 von 13 Facetten sichtbar, nachher 8 von 13
  plus „Weitere Filter". Die Enge war kein Gefühl, sondern ein Zustand.
- **Ein Filterzustand, alle Ansichten** (harte Regel des Projekts): wenn Suche und
  Filter den gemeinsamen Zustand tragen, gehören sie in eine eigene Zeile und nicht
  zwischen Projektnamen und Knöpfe.
- **Knöpfe für seltene Wege kosten dauerhaft Platz.** Export und Druck braucht man am
  Ende einer Arbeit, nicht dauernd; die Filter dagegen ständig.
- **Eine versteckte Funktion ist keine Funktion.** Deshalb der Tastenhinweis in der
  Leiste und die Zeile im Einstiegstext — beide kosten keinen Knopf.

## Verworfene Alternativen

- **„Mitnehmen" ins Logo-Panel** – dort steht, was über die **App** informiert;
  ein Export ist eine Handlung an den **Daten**. Zwei Sorten in einem Menü wären
  beliebig.
- **Knöpfe nur bei breiten Fenstern zeigen** – dann hängt die Bedienung von der
  Fensterbreite ab; niemand kann sich merken, wo etwas ist.
- **Palette ohne jeden Hinweis** – wer die Taste nicht kennt, verliert Export und
  Druck vollständig.
- **Befehle mit Funktionen statt Marken** (`run: () => void`) – ein Befehl wäre dann
  nicht mehr prüfbar, ohne ihn auszulösen.

## Folgen

- Die Kopfleiste ist 88 px hoch statt 54; mit aktiven Filtern kommt die bekannte
  Zeile „Aktive Filter" dazu (zusammen 127 px).
- Wer Export oder Druck sucht, drückt Strg/Cmd + K. Sollte sich das im Gebrauch als
  zu versteckt erweisen, ist der nächste Schritt ein Eintrag im Logo-Panel — nicht
  ein neuer Knopf in der Leiste.
