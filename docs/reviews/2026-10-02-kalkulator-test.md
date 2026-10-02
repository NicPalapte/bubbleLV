# Kalkulator-Test: Bubble mit echten Fragen durchgespielt

Datum: 2026-10-02 · Stand: Branch `claude/admiring-lamport-k6mn6o`, App-Version 0.5.0
Rolle: Kalkulator im Bauunternehmen, erster Blick auf ein neues LV (x83 und x84).

## Kurzfazit

- Bubble beantwortet 3 von 5 Kalkulator-Fragen **ohne Klick oder mit einem Klick**.
- **Stark:** Überblick (Gewerke, Geld, Pareto), Prüfung mit Norm-Verweis und Fundstelle,
  Suche (sofort, Link-fähig), Fehlermeldungen beim Laden (nie eine leere Seite).
- **Schwach:** Materialien. Der Filter „Material" ist in **allen** getesteten Dateien leer
  („Keine Werte"). Ohne Erklärung sieht das nach Defekt aus. Ursache: die Referenzliste
  fehlt (im Code so gewollt).
- **Größtes Risiko:** Ansicht „Tabelle" braucht bei ca. 9.500 Positionen **7 bis 14 Sekunden**.
  Zielwert laut `docs/scope.md`: unter 200 ms. Alle anderen Ansichten schaffen das.
- **Zwei echte Fehler:**
  - Die Auswahl geht verloren, sobald man den Graph besucht und danach die Ansicht wechselt.
  - Bei 0 Treffern zeigt der Überblick „Diese Datei führt keine Preise" — bei einer Datei mit Preisen.
- Konsole: in allen Läufen **keine** Errors oder Warnings. Netzwerk: nur Anfragen an die eigene Seite.

## Ampel-Tabelle: die 5 Fragen

| # | Frage | Ampel | Klicks bis zur Antwort | Beleg |
|---|---|---|---|---|
| 1 | Welche Arten von Arbeiten stecken drin? | **gut** | 0 (Überblick), 1 (Matrix) | [Überblick](screenshots/02-ueberblick.png), [Matrix](screenshots/05-matrix.png) |
| 2 | Wo sind Risiken? | **mittel bis gut** | 1 (Prüfung) | [Prüfung](screenshots/07-pruefung.png), [Eigenschaften](screenshots/08-eigenschaften-hinweise.png) |
| 3 | Wo sind Chancen? | **mittel bis gut** | 0 (Pareto), 1 (Prüfung, Ähnlichkeit) | [Überblick](screenshots/02-ueberblick.png), [Ähnlichkeit](screenshots/06-aehnlichkeit.png) |
| 4 | Welche Materialien? | **schwach** | nicht beantwortbar über Material; 2 Klicks über Besonderheiten/Normen | [Material leer](screenshots/10-material-keine-werte.png) |
| 5 | Schnell nach Stichwort suchen | **gut** | 0 (Tastatur `/`), 1 Klick | [Suche Beton](screenshots/09-suche-beton-tabelle.png) |

Messbasis: Demo mit Preisen (x84, 78 Positionen, 1.648.418 €), dazu BVBS-Musterdatei (x83).

## Stärken und Schwächen je Frage

### 1 · Arten von Arbeiten — gut

- Stark:
  - Überblick zeigt sofort: 78 Positionen, 16 Gewerke, Summe, Treemap nach Gewerk und Abschnitt.
  - Mengen je Einheit (m², m, m³, Stück …) stehen daneben.
  - Klick auf ein Gewerk filtert alle Ansichten.
  - Matrix „Gewerk × Bauteiltyp" mit Anzahl, Menge oder Summe.
- Schwach:
  - Größte Kachel heißt **„Ohne Gewerk"** (525.068 €, 17 Positionen, 32 %). Darin liegt
    z. B. § 001.003 Maurerarbeiten. Für Kalkulatoren ist das der größte Block und er ist
    unbenannt. Das ist eine Lücke der Klassifizierung (Gewerk kommt aus der STLB-Bau-Liste).
  - Matrix: Spalte „Ohne Angabe" bei Bauteiltyp hat 58 von 78 Positionen. Die Matrix sagt
    dadurch wenig. Zahl in der dunkelsten Zelle ist schlecht lesbar (heller Text auf Blau).

### 2 · Risiken — mittel bis gut

- Stark:
  - Prüfung: 59 Hinweise aus 10 aktiven Regeln, jede mit **Norm-Verweis**
    (z. B. „VOB/A § 7 Abs. 1 Nr. 4") und dem Etikett „Verweis zu bestätigen".
  - Fundstelle ist im Langtext markiert (z. B. „gemäß Gutachten", „DIN 18300").
  - Regeln sind einzeln abschaltbar. Regeln ohne Referenzdaten stehen als **„inaktiv"**
    mit Grund (V3, V8, V9, V10) — kein Fehler.
  - Von der Position führt „In der Prüfung zeigen" zurück zur Regel.
  - Markdown-Export der Hinweise enthält Regel, Norm, Position und Fundstelle.
- Schwach:
  - In der Tabelle sieht man an einer Zeile **nicht**, ob sie einen Hinweis hat.
    Risiko zeigt sich erst in Prüfung oder im Eigenschaften-Panel.
  - Alternativposition (001.002.0050, Typ „ALTERNATIV") löst keinen Hinweis aus.
    Sichtbar nur über „Weitere Filter → Positionstyp". Bedarf ist dagegen abgedeckt (V1).
  - Orange Etikett „Verweis zu bestätigen" steht an fast jeder Regel. Ehrlich, aber laut.
  - Regel V4 „Risiko auf den Auftragnehmer übertragen" meldet 0 Hinweise in der Demo.
    Ob das stimmt oder die Regel zu eng ist, habe ich nicht geprüft.

### 3 · Chancen — mittel bis gut

- Stark:
  - Pareto: „27 Positionen (34,6 %) tragen 80 % der Summe".
  - Prüfung G1 „Kostentreiber" (Rang 1–10 mit Prozent der Gesamtsumme) und G2 „Mengentreiber".
  - Ähnlichkeit: 4 Gruppen mit Median, Spanne und **Streuung** des EP
    (z. B. Kalksandstein-Innenwand: 68,40 € bis 82,90 €, Streuung 10 %).
  - Vergleich: nebeneinander mit markierten Unterschieden (Dicke, Menge, EP).
- Schwach:
  - Regel G4 „Einheitspreis fällt aus der Gruppe" (Ausreißer) meldet in der Demo 0.
    Dadurch konnte ich die Ausreißer-Funktion **nicht** an echten Treffern beurteilen.
  - Der Weg Ähnlichkeit → Vergleich geht über „Vergleichen" (1 Klick). Der Vergleich-Reiter
    selbst ist beim ersten Besuch leer und erklärt nur „Strg-Klick".

### 4 · Materialien — schwach

- Beobachtung:
  - Filter **Material** zeigt in allen 6 Dateien „Keine Werte" (BVBS, Demo x84, 4 Fixtures).
  - Im Code ist das gewollt: `frontend/src/lib/classify/extractors/material.ts` liest
    nur die Spalte `keywords` des STLB-Katalogs, und die ist leer. Keine erfundene Wortliste.
  - Die Oberfläche sagt das nicht. Der Kalkulator sieht einen leeren Filter ohne Grund.
- Was man stattdessen nutzen kann:
  - Filter **Besonderheiten** (z. B. Ortbeton, Sichtbeton, Wärmedämmung, Abdichtung, Schadstoff).
  - Filter **Normen** (z. B. DIN EN 206-1, DIN 1053-1) und **Druckfestigkeit** (C20/25, C35/45).
  - Freitextsuche im Langtext (z. B. „Kalksandstein" → 2 Treffer).
- Fazit: „Welche Materialien?" ist heute nur über Umwege beantwortbar.

### 5 · Stichwortsuche — gut

- Stark:
  - Suche wirkt live. Messung im Browser: ca. 10 ms bis zum nächsten Frame (auch bei 9.500 Positionen).
  - Taste `/` springt ins Suchfeld. `Strg+K` öffnet Befehle: Ansicht, Filter, OZ-Sprung, Export.
  - Suchwort steht im Link (`#v=table~q=Beton`).
  - Treffer: Beton 8, Mauerwerk 4, Dämmung 6, Kalksandstein 2, Bewehrung 0 (kommt in der Demo nicht vor).
  - In der Baumleiste und in der Tabelle sieht man Treffer 8/78. Nicht-Treffer sind gedämpft
    oder auszublenden. Im Graph werden Nicht-Treffer ausgegraut.
- Schwach:
  - **Das Suchwort wird im Text nicht hervorgehoben** (kein `<mark>`, keine Hintergrundfarbe).
    Man sieht Zeilen, aber nicht, wo das Wort steht. Bei Langtext-Treffern fehlt der Grund.
  - Keine Wortverwandtschaft: „Beton" findet auch „Betonpflaster". Für Kalkulatoren eher Lärm.
  - Tabelle: Bezeichnung wird bei normaler Fensterbreite abgeschnitten („…").

## Die acht Ansichten (alle durchgeklickt)

Hinweis: „Eigenschaften" ist **keine** eigene Registerkarte. Es ist das rechte Panel in der
Tabellen-Ansicht. Die Leiste hat 7 Reiter. Der Text „acht Ansichten" meint das einschließlich Panel.

| Ansicht | Eindruck |
|---|---|
| Überblick | Kennzahlen, Treemap, Pareto, Mengen je Einheit. Beste Einstiegsseite. |
| Graph | Zeigt zuerst nur 7 Knoten (Projekt, Los, 5 Abschnitte). Beschriftungen laufen über den Rand der Kreise. Beim Zoom/Aufklappen rutscht der Inhalt unter die Werkzeugleiste. Gewählte Position ist nicht sichtbar, solange der Abschnitt zu ist. |
| Tabelle | Baum links, Tabelle Mitte, Eigenschaften rechts. Langtext mit markierten Normen und Verweisen. Sortieren, Spalten wählbar. |
| Matrix | Zeilen, Spalten, Zellwert wählbar. Klick auf Zelle filtert und springt in die Tabelle. |
| Ähnlichkeit | Gruppen mit gemeinsamen und unterschiedlichen Merkmalen. Schwellen 2/3/5/10 Mitglieder. |
| Vergleich | Leer, bis man auswählt. Danach klare Gegenüberstellung mit „Nur Unterschiede". |
| Prüfung | Regelliste mit Norm-Verweis, Schalter „an", aufklappbare Fundstellen. |
| Eigenschaften | Position mit Langtext, Mengen, Preis, Klassifizierung, Hinweise. Sehr dicht, aber vollständig. |

## Filter, Suche und Auswahl beim Ansichtswechsel

- **Suche und Filter bleiben erhalten:** getestet über alle 7 Reiter (Suche „Beton" plus Facette
  Besonderheiten = Ortbeton). Zahl der Treffer passt in jeder Ansicht.
- **Auswahl geht verloren — Fehler.** Ablauf:
  1. Tabelle, Position 001.004.0020 anklicken (Link zeigt `p=001.004.0020`).
  2. Zum Graph wechseln: Auswahl bleibt.
  3. Zu Tabelle, Matrix oder jeder anderen Ansicht wechseln: `p=…` verschwindet, Panel zeigt „Projekt".
  - Ohne Graph-Besuch bleibt die Auswahl über Ähnlichkeit, Prüfung, Matrix erhalten.
  - Das widerspricht der Regel „Ein Ansichtswechsel ändert nie … Auswahl" aus `.claude/CLAUDE.md`.
  - Ursache nicht untersucht.
- **Reload:** Datei ist weg (Startseite wie versprochen). Die Adresse behält aber den Zustand.
  Lädt man danach irgendein LV, werden Ansicht und Suche darauf angewandt (auch bei anderer Datei).
  Das ist praktisch, kann aber überraschen.
- **Fehlbedienung im Link** (`#v=bogus`, unbekannte Facette, kaputte Prozent-Zeichen,
  `<script>` im Fragment, 5.000 Zeichen Suchtext, nicht vorhandene OZ): kein Absturz, kein Dialog,
  Ansicht fällt auf Überblick zurück. Unbekannter Facettenwert (`f.gewerk=Nichtda`) zeigt
  ein Filter-Etikett „Nichtda ✕" und „Zurücksetzen" — gut verständlich.
- **Teilen-Link:** Es gibt **keinen Knopf** „Link kopieren". Der Link ist die Adresszeile.
  Wer das nicht weiß, findet die Funktion nicht.

## Export und Druck

- **CSV** (Befehl `Strg+K` → „Positionen als CSV"): Semikolon, BOM, deutsche Dezimalzeichen,
  nur gefilterte Positionen (8 Zeilen bei Suche „Beton"), mit Langtext und Klassifizierung. Excel-tauglich.
- **Markdown** („Hinweise als Markdown"): Regel, Norm, Position, Fundstelle. Klar.
- **Druck:** Druckansicht ist eine saubere Liste der gefilterten Positionen mit Summe
  (402.160,00 € über 8 Positionen). Enthält **keine** Prüf-Hinweise. Die Summe zählt auch
  die Alternativposition mit.
- Beide Exporte sind **nur** über `Strg+K` zu finden, nicht als Knopf in der Leiste.
  Auffindbarkeit: schwach.

## Geschwindigkeit

Messort: Chromium headless, Produktions-Build (`vite preview`), Sandbox-Rechner. Grobe Werte.

| Messung | Ergebnis | Ziel (`docs/scope.md`) |
|---|---|---|
| Demo laden (78 Pos.) | ca. 0,4 s | < 5 s |
| Synthetisches LV, ca. 9.500 Pos., 17 MB | ca. 2,0 bis 2,6 s bis zur ersten Ansicht | < 5 s |
| Suche tippen (9.500 Pos.) | ca. 10 ms bis zum nächsten Frame | < 100 ms |
| Ansichtswechsel Graph/Matrix/Ähnlichkeit/Prüfung/Überblick (9.500 Pos.) | 20 bis 100 ms | < 200 ms |
| **Ansichtswechsel Tabelle (9.500 Pos.)** | **7 bis 14 s** (Seite eingefroren) | < 200 ms |
| 60 MB Textmüll als .x83 | Fehlermeldung nach unter 2,5 s, kein Absturz | — |

Wichtig zur Testdatei: ich habe das Demo-LV (78 Pos.) 130-fach vervielfältigt, einmal in einen
Abschnitt, einmal verteilt auf alle Abschnitte. Beide Varianten waren in der Tabelle langsam
(14 s bzw. 7–9 s). Echte 10k-Dateien könnten sich anders verhalten. Die Ursache habe ich nicht
untersucht. Im Dev-Server war es ebenfalls langsam (ca. 15 s).

## Fehlermeldungen

Alle Fälle über das Datei-Feld geladen. Meldung erscheint in einem roten Kasten unter den Knöpfen
mit `role="alert"`. Danach lässt sich ohne Neuladen sofort eine Demo oder weitere Datei laden.

| Fall | Meldung (gekürzt) | Bewertung |
|---|---|---|
| `unsupported-version.x83` | „GAEB-Version '1.0' wird nicht unterstützt (unterstützt: 3.0, 3.1, 3.2, 3.3). Bitte … exportieren." | **gut**: klar, mit nächstem Schritt ([Screenshot](screenshots/12-fehler-version.png)) |
| leere Datei | „empty.x83 ist kein wohlgeformtes XML: This page contains the following errors: error on line 1 at column 1: Document is empty …" | **mittel**: Browser-Englisch durchgereicht; „Datei ist leer" wäre klarer |
| Textdatei als .x83 | gleiche Form, „Start tag expected, '<' not found" | **mittel**: wie oben |
| kaputtes XML (abgeschnitten) | „… Premature end of data in tag image line 325 …" | **mittel**: Zeile/Spalte sind nützlich, Text englisch und ohne Leerzeichen („…not foundBelow is a rendering…") |
| `.pdf` / `.png` | gleiche XML-Meldung ([Screenshot](screenshots/11-fehler-pdf.png)) | **mittel**: kein Hinweis auf falschen Dateityp; Endung wird beim Ziehen nicht geprüft (nur im Datei-Dialog gefiltert) |
| 60 MB Textmüll | gleiche XML-Meldung | **gut** genug: schnell, kein Absturz; keine Größenwarnung |
| 2 Dateien gleichzeitig droppen | erste Datei wird geladen, zweite **still ignoriert** | **schwach**: keine Meldung (Scope: eine Datei, aber der Nutzer erfährt es nicht) |
| Suche ohne Treffer | Tabelle: „Keine Positionen entsprechen den Filtern."; Baum: „Keine Position entspricht Suche/Filter." | **gut**; zwei verschiedene Sätze |
| Filter mit 0 Ergebnissen | Wie oben, Filter-Etikett und „Zurücksetzen" sichtbar | **gut** |
| 0 Treffer im Überblick | Karte „SUMME: **keine Preise** — Diese Datei führt keine Preise", Karte „OHNE MENGE" statt „OHNE PREIS" | **Fehler**: falsche Aussage bei Datei mit Preisen |
| ungültiger Teilen-Link | siehe oben | **gut**: nie Absturz |
| Reload nach Laden | Startseite, Hinweis steht schon vorab auf der Seite | **gut** |
| Worker-Fehler | Worker-Datei im Browser blockiert, 9.500 Pos. laden: App rechnet im Hauptthread weiter, Ergebnis nach ca. 2 s, keine Meldung, kein Konsolenfehler | **gut** (Rückfall im Code vorhanden) |

Konsole: in keinem Lauf Errors oder Warnings.
Netzwerk: nur GET auf die eigene Adresse (Seite, JS, CSS, Schriften, Worker, Favicon). Kein POST,
keine Fremdadresse. Das Favicon wird beim Arbeiten ca. 13-mal neu geladen (harmlos, aber auffällig).

## UI/UX-Note

| Kriterium | Note | Begründung |
|---|---|---|
| Auffindbarkeit | **mittel** | Reiter und Filterleiste klar. Export, Druck und Teilen-Link nur per `Strg+K` bzw. Adresszeile. „Eigenschaften" ist kein Reiter. Materialfilter leer ohne Grund. Startseite erklärt Nutzen, Datenschutz und Tastatur gut. |
| Geschwindigkeit | **gut, mit einer Ausnahme** | Alles flüssig, außer Tabelle bei ca. 9.500 Positionen (7–14 s). |
| Verständlichkeit | **gut** | Einfache deutsche Texte, Hinweise sagen „kein Urteil". Fachbegriffe wie „Streuung", „Pareto", „Kostentreiber" ohne Erklärung, aber für Kalkulatoren geläufig. |
| Lesbarkeit der Zahlen | **mittel** | Zahlen deutsch formatiert (1.648.418 €, 7.200, 52,40 €), rechtsbündig, Monospace. Aber: dominante Schriftgrößen sind 9 bis 10 px (Matrix ca. 190 Textstellen mit 10 px, vereinzelt 7 bis 8 px im Graph). Treemap-Beschriftungen werden abgeschnitten. Dunkle Matrix-Zelle: Zahl schwer lesbar. |
| Barrierefreiheit | **mittel** | Gut: `lang="de"`, Reiter als Radio-Gruppe, `role="alert"` bei Fehlern, sichtbarer Fokusring, `Tab`-Reihenfolge sinnvoll, Dateiwahl und Demo per Tastatur bedienbar, `/` und `Strg+K` funktionieren. Schwach: keine Überschriften (0 × h1/h2); Pfeiltasten wechseln den Reiter nicht (nur Tab); 6 Schaltflächen ohne Namen (vermutlich versteckte Mess-Elemente der Filterleiste, nicht geklärt); Kontrast der Nebenfarben `--dim` auf Weiß 4,2:1 und auf Papier 3,9:1 (unter 4,5:1 bei kleiner Schrift), Orange auf Weiß 3,2:1; keine `aria-live`-Region für Trefferzahl. |

Breite: bei 1024 px sind die Reiter „Ähnlichkeit/Vergleich/Prüfung" von der Leiste abgeschnitten
([Screenshot](screenshots/13-breite-1024.png)). Bei 390 px entsteht waagerechtes Scrollen (475 px).
Für ein Desktop-Werkzeug vertretbar, aber 1024 px ist ein üblicher Laptop-Fall.

## Out of Scope (kein Mangel)

Laut `docs/scope.md` bewusst nicht Teil von Bubble. Ein Kalkulator vermisst sie vermutlich, sie zählen hier nicht als Fehler:

- EP-Kalkulation, Zuschläge, Angebotspreis bilden
- mehrere Dateien gleichzeitig (Versionsvergleich, x83 + x84 zusammenführen)
- Notizen, Aufgaben, Zuweisung, Bieterfragen verwalten, NU-Anfragen, Vergabepakete
- Status ändern, Speichern über die Sitzung hinaus, Login
- GAEB-Export, Excel-Import, LLM-Klassifizierung

## Was ich nicht geprüft habe

- Echte, große Praxis-LVs (nur synthetisch vervielfältigte Demo-Datei).
- Browser außer Chromium; Touch-Bedienung; Screenreader.
- Ob die Prüfregeln inhaltlich richtig sind (Norm-Verweise tragen selbst das Etikett „zu bestätigen").
- Graph bei Bewegung (Flüssigkeit beim Zoomen/Ziehen) und Druck aus dem echten Druckdialog
  (nur PDF-Ausgabe im Druckmodus).
- Genaue Ursache der Tabellen-Langsamkeit und des Auswahlverlusts.
