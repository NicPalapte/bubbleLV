# Änderungen

Was sich in Conocto (bis Version 0.29: Bubble) von Version zu Version geändert hat — in der Sprache der Anwendung,
nicht in der des Codes. Neueste Version oben.

Die Nummern folgen [Semantic Versioning](https://semver.org/lang/de/): die **mittlere**
Zahl steigt bei neuen Funktionen, die **letzte** bei Korrekturen. Die **erste** bleibt
`0`, solange Conocto in der Beta ist.

---

## 0.42.1 — 27.10.2026 · Suche im eigenen Fenster, Graph auf kleinen Bildschirmen

- **Suche im eigenen Fenster:** Graph und Tabelle im eigenen Browserfenster haben jetzt die
  Suchleiste dabei, mit Filter-Chips, „dimmen/ausblenden“ und „+ Filter“. Suche und Filter
  gelten in beiden Fenstern; die Filterleiste klappt nur dort auf, wo man sie öffnet.
- **Nichts liegt mehr übereinander:** Legende und Zoom-Leiste teilen sich unten eine Zeile.
  Ist der Graph schmal (Tablet, schmaler Bereich), wird die Legende ein Knopf „Legende“, der
  sie aufklappt — vorher fehlte sie unter 1024 px ganz. „Keine Treffer“ und die
  Hervorhebung rücken dann unter die Kennzahlen.
- **Mehr Platz für die Suche:** Auf dem Tablet hochkant fällt der Dateiname in der
  Kopfleiste weg.

## 0.42.0 — 27.10.2026 · Aufgeräumtes Logo-Menü

- **Gruppen statt langer Liste:** Oben „Anderes LV öffnen“ und „PDF hinzufügen…“, darunter
  „Exportieren“, „Meine Notizen“ und „Hilfe & Feedback“ zum Aufklappen.
- **Exporte heißen klarer:** „Positionen als Tabelle (CSV)“, „Prüfhinweise als Text“,
  „Drucken / als PDF“.
- **Fußzeile:** Impressum, Datenschutz, Lizenzen und Admin klein unten im Menü.
- **Treffer-Protokoll** jetzt in den Admin-Werkzeugen. **„Was ist neu“** ist raus.

## 0.41.0 — 26.10.2026 · Schlanke Startansicht

- **Weniger zum Start:** Nach dem Laden stehen nur Graph und Positionskarte da. Tabelle,
  Überblick, Prüfung und Dokument öffnet „Ansicht“. Wer schon eine eigene Anordnung hat,
  sieht das nach „Ansicht → Anordnung zurücksetzen“.
- **Ein Schalter:** Ist ein Abschnitt hervorgehoben, stellt der Schalter in der Suchleiste
  ein, ob die übrigen Abschnitte blass oder ausgeblendet sind — derselbe wie bei Filtern.

## 0.40.0 — 26.10.2026 · Eine Suche für LV und PDFs, PDF direkt hinzufügen

- **Logo-Menü → „PDF hinzufügen…“:** PDF wählen, der Bereich „Dokument“ öffnet sich von
  selbst und zeigt es. Mehrere PDFs auf einmal gehen auch.
- **PDF auf die App ziehen:** irgendwo auf die Arbeitsfläche fallen lassen, auch wenn
  „Dokument“ zu ist. Andere Dateien nimmt die Fläche nicht an.
- **Begriff in die Suche:** Text im Kurztext, Langtext oder PDF markieren, Rechtsklick,
  „In Suche übernehmen“. Am Tablet erscheint das Menü von selbst, sobald die Auswahl
  ruht.
- **Eine Suche:** Der Begriff aus der Suchleiste sucht auch in allen offenen PDFs. Unter
  der Suchleiste steht, wo er vorkommt: Positionen im LV, Seiten und Zahl je PDF.
  „Zeigen ›“ springt hin. Gelb markiert ist er im PDF, das gerade offen ist.
- Das Suchfeld im Bereich „Dokument“ ist jetzt dasselbe wie oben. PDF-Treffer filtern
  das LV nicht.
- **Korrektur:** Eine PDF-Stelle mit mehreren verknüpften Positionen („OZ +2“) klappt
  auf Klick alle Positionen auf; jede springt zu ihrer Position.

## 0.39.1 — 26.10.2026 · Gemeinsames Designsystem

- **Gleiches Aussehen, neue Quelle:** Farben, Schriften und Logo kommen jetzt aus dem
  Conocto-Designsystem, das auch weitere Conocto-Produkte nutzen. Sichtbar ändert sich nichts.
- **Korrektur:** Eigene Marker (violett) sind im dunklen Thema auch dann gut lesbar, wenn
  „Dunkel“ im Logo-Menü fest gewählt ist.

## 0.39.0 — 25.10.2026 · Blasen nach Abschnitten, Abschnitt hervorheben

- **Geordnet statt zufällig:** Im Graphen „nach LV“ liegt jeder Hauptabschnitt als
  eigene Insel mit Titel. Die Inseln stehen in OZ-Reihenfolge, von links nach rechts.
- **Abschnitt anklicken:** Klick auf eine Insel wählt den Hauptabschnitt, Klick auf einen
  Kreis den Unterabschnitt. Einpassen geht über den Knopf unten.
- **Hervorheben:** Der gewählte Abschnitt bekommt einen roten Rand, alles andere wird
  blass oder ausgeblendet (oben rechts umschalten). ✕ oder Klick ins Leere hebt das auf.
  Filter und Suche bleiben dabei unverändert.

## 0.38.0 — 24.10.2026 · Nur noch Split, Knopf „Ansicht“

- **Kein Fenster-Modus mehr:** Graph, Tabelle, Position, Überblick, Prüfung und Dokument
  stehen immer nebeneinander im Split. Nichts liegt mehr über dem Graphen außer dem
  Vergleich.
- **Knopf „Ansicht ▾“** oben rechts statt der einzelnen Knöpfe: Haken setzen = Bereich
  zeigen, Haken weg = ausblenden. Dort auch „Anordnung zurücksetzen“ und „zurückholen“
  für einen Bereich im eigenen Browserfenster.
- **Kleiner Bildschirm:** links der Graph, rechts ein Platz mit allen anderen Bereichen
  als Reiter. Auf dem Handy untereinander. Breiter gezogen ist die eigene Anordnung wieder
  da.
- **Gestrichelte Linie** von der gewählten Position reicht bis an den Rand zur Karte.

## 0.37.0 — 23.10.2026 · Split frei anordnen

- **Frei teilen:** Einen Bereich am Griff ⠿ an einen Rand eines anderen Bereichs ziehen
  (links, rechts, oben, unten): Nur dieser Platz wird geteilt. So stehen z. B. Graph,
  Tabelle und Position nebeneinander.
- **Durchlaufend:** Am äußeren Rand der Fläche (links, rechts, unten) loslassen: Der
  Bereich läuft über die volle Höhe bzw. Breite.
- **Vorschau:** Beim Ziehen zeigt eine farbige Fläche, wo der Bereich landet.
  Kopfzeile = Reiter, Mitte = tauschen bleiben wie bisher.
- **Merken:** Nach dem Neuladen sieht der Split aus wie zuletzt. ↺ oben setzt die
  Anordnung zurück.

## 0.36.0 — 23.10.2026 · Dokument (PDF)

- **Neues Fenster „Dokument“:** ein PDF (z. B. Baubeschreibung) neben dem LV lesen und
  durchsuchen. Im Split als Bereich, im Fenster-Modus schwebend, mit ↗ auf den zweiten
  Bildschirm.
- **Anstreichen:** Text markieren, Rechtsklick, Farbe wählen — wie im Langtext.
- **Verknüpfen:** im selben Menü „Mit Position verknüpfen…“. Die Positionskarte zeigt die
  Stellen unter „Im Dokument“; ein Klick springt hin.
- Gespeichert werden nur die Stellen, nicht das PDF. Nach dem Neuladen das PDF erneut
  öffnen, die Stellen sind wieder da. Auch in der Notiz-Datei enthalten.

## 0.35.0 — 23.10.2026 · Auswahl und Hinweise dezenter

- **Ausgewählte Position:** kein Ring mehr. Der Punkt wird ziegelrot und etwas größer.
  Die gestrichelte Linie zur Karte bleibt.
- **Prüfhinweise auf der Karte:** Oben steht nur noch die Zahl, z. B. „⚠ 2 Hinweise“.
  Ein Klick rollt zur Liste am Ende der Karte: je Regel eine Zeile mit Fundstelle und
  Norm-Verweis.

## 0.33.0 — 23.10.2026 · Kurzumfrage

- **Feedback:** Nach 4 Minuten mit geöffneter Datei fragt Conocto einmal unten rechts nach:
  Wie hilfreich? (1–5), Würdest du dafür zahlen?, Was fehlt dir?
- Die Auswahl zählt anonym mit, ohne Text. Freitext geht nur per E-Mail über dein
  Mailprogramm.
- **Nicht mehr fragen** merkt sich der Browser. Jederzeit wieder über das Logo-Menü:
  „Feedback geben“.

## 0.32.0 — 23.10.2026 · Splitscreen nahtlos

- **Nahtlos:** Die Bereiche im Split sind keine Karten mehr. Sie trennt nur noch eine feine
  Linie, ohne Rand und ohne Abstand.
- **Überblick und Prüfung** sind im Split eigene Bereiche, links neben Graph und Tabelle.
  Sie gehen über „+ Überblick“ / „+ Prüfung“ oben auf oder über die Kennzahlen am Graphen.
- **Tauschen und Stapeln:** Einen Bereich am Griff ⠿ ziehen:
  - auf eine Kopfzeile: Er kommt dort als Reiter dazu,
  - auf eine Fläche: Beide tauschen den Platz,
  - auf die eigene Fläche: Der Reiter löst sich wieder.
- Eine neue Auswahl holt die Position nicht vor einen anderen Reiter. So bleibt etwa die
  Prüfungsliste stehen.

## 0.31.0 — 22.10.2026 · Conocto

- **Neuer Name:** Bubble heißt jetzt **Conocto**. Con = Construction, Octo = die Krake,
  die mit acht Armen die Informationen aus dem LV greift.
- **Neues Logo:** die Krake von oben, in Ziegelrot. Auch im Browser-Tab.
- **Neuer Look:** hell reines Weiß, dunkel Schwarz und Grau. Ziegelrot zeigt Auswahl und
  Knöpfe, Hinweise sind bernsteinfarben.
- **Neue Schriften:** Titel in Hanken Grotesk, Text in Schibsted Grotesk, eine Stufe größer.
- Gespeicherte Datei, Notizen und geteilte Links funktionieren weiter.

## 0.30.0 — 22.10.2026 · Tabelle als Arbeitsliste

- **Fortschritt** und **„!"** (Wichtig) direkt in der Tabelle setzen, per Klick. Mit dem
  Griff unten rechts in der Zelle zieht man den Wert über mehrere Zeilen, wie in Excel.
  Die Spalte „Status" entfällt in der Tabelle.
- **Kommentar** über die Spalte eintragen. Die Zelle zeigt den neuesten, ein Klick öffnet
  den Verlauf, der neueste oben.
- **Abschnitte** stehen als eigene Zeilen je Ebene, mit Anzahl Positionen und wie viele
  erledigt sind. Oben bleibt beim Scrollen nur der aktuelle Abschnitt stehen.
- Abschnitte per Klick **zuklappen**, dazu „Alle zuklappen" / „Alle aufklappen".
- Menüs öffnen nach oben, wenn unten kein Platz ist.

## 0.29.0 — 22.10.2026 · Filterleiste und Rechtsklick

- **Filterleiste:** „+ Filter" klappt eine Leiste unter der Suche auf. Je Gruppe ein Knopf
  mit Auswahlliste und Anzahl. Das Filterfenster entfällt.
- **Filter „Material"** fasst Material und Merkmale zusammen: Material → Beton → Art,
  Druckfestigkeit, Exposition … Die eigenen Marker stehen unter **„Status"**.
- Im Filter „Material" stehen jetzt auch **gelernte Material-Begriffe** wie „Stahl".
- **Reihenfolge der Filter:** Menge, Einheit, Material, Besonderheiten, Normen, Offene
  Stellen, Positionsart, Positionstyp, Zeitbezug, Status.
- **Darstellung** (Größe, Gliederung) steckt jetzt im Knopf unten rechts am Graphen.
- **Positionskarte:** Fortschritt als Auswahlknopf, daneben „!" für Wichtig, beides neben
  dem Titel. „Fertig" heißt jetzt **„Erledigt"**.
- **Vergleichen** ist der hervorgehobene Knopf unter der Auswahl.
- **Langtext:** Markieren allein öffnet nichts mehr. **Rechtsklick** auf die Auswahl
  bietet Kopieren, Farben und „Anstreichung entfernen".
- **Rechtsklick auf eine Position** (Graph, Tabelle, Vergleich): Fortschritt, Wichtig,
  Vergleich, in der Tabelle zeigen, Link kopieren. In der Tabelle: **„Im Graph zeigen"**.
- Menüs wie „Spalten" bleiben am Knopf, wenn man die Tabelle verschiebt oder ihre Größe ändert.

## 0.28.1 — 22.10.2026 · Zoom bleibt beim Größenwechsel

- **Größe der Positionen umschalten** (gleich/Menge/Preis) behält jetzt Zoom und Ausschnitt.
  Eine gewählte Position bleibt an ihrem Platz auf dem Bildschirm.

## 0.28.0 — 22.10.2026 · Splitscreen

- **Splitscreen:** Graph, Tabelle und Positionskarte stehen nebeneinander, wie in iTWO.
  Oben rechts umschalten zwischen **Split** und **Fenster** (wie bisher).
- **Plätze tauschen:** einen Bereich am Kopf auf einen anderen ziehen.
- **Größe ändern:** Trennlinien ziehen, Doppelklick setzt zurück.
- **Bereiche schließen** mit ✕, über „+ …" oben wieder einblenden.
- **Graph im eigenen Fenster:** wie die Tabelle, z. B. für den zweiten Bildschirm (↗).

## 0.27.0 — 21.10.2026 · Eigene Textmarkierungen im Langtext

- **Text markieren:** Text im Langtext auswählen, dann eine von sechs Farben wählen. Über
  dem Langtext zeigt der Mauszeiger, dass sich markieren lässt.
- **Farben benennen:** jede Farbe kann eine Bedeutung bekommen, z. B. Gelb = wichtig,
  Grün = Maß. Gilt in diesem Browser für alle Dateien und kommt in die Notiz-Datei.
- **Meine Textmarkierungen:** eigene kleine Tabelle unter „Eigenschaften", ✕ entfernt eine.
- **Ausblenden:** Label „Meine Textmarkierungen" neben den Fundstellen blendet die Farben im
  Text aus und wieder ein.
- **Bleibt erhalten** wie Kommentare: zur letzten Datei in diesem Browser und in der
  Notiz-Datei. Der CSV-Export hat eine Spalte „Textmarkierungen" (mit dem Namen der Farbe).
- **Begriff lernen** (Admin) sitzt jetzt in derselben Leiste.
- **Positionskarte:** Die Zeile „Status" in den Eigenschaften entfällt. Den Stand zeigt der
  Fortschritt (0.26.0).

## 0.26.0 — 21.10.2026 · Fortschritt und „Wichtig"

- **Fortschritt je Position:** Offen · In Bearbeitung · Fertig, mit drei Knöpfen unten in
  der Positionskarte. Im Graphen zeigt ein dünner Ring den Stand: blau = in Bearbeitung,
  grün = fertig.
- **„Wichtig" ist ein eigener Knopf** und lässt sich zusätzlich setzen, auch bei „Fertig".
- **Filter oben:** Offen, In Bearbeitung, Fertig, Wichtig. „Offen" ersetzt „Nicht erledigt".
- **CSV-Export:** Spalten „Fortschritt" und „Wichtig" statt „Marker".
- **Notiz-Datei:** führt Fortschritt und „Wichtig". Ältere Notiz-Dateien lassen sich weiter
  laden.
- **Bisherige Marker bleiben erhalten:** Markiert und Wichtig werden „Wichtig", Erledigt
  wird „Fertig".

## 0.25.0 — 21.10.2026 · Notizen sichern und laden

- **Keine Notizen mehr still verlieren:** Öffnest du eine neue Datei und die gespeicherte
  hat Marker oder Kommentare, fragt Bubble erst: ersetzen oder die gespeicherte öffnen.
- **Beim Löschen** der gespeicherten Datei gibt es „Notizen sichern + löschen“.
- **Logo-Menü:** „Notizen sichern“ lädt alle Marker und Kommentare als Datei herunter.
  „Notizen laden…“ übernimmt sie wieder, auch in eine neue Fassung des LV.
- **Laden findet Positionen auch nach dem Umnummerieren** (gleicher Text) und zeigt,
  was gleich, umnummeriert, geändert oder nicht gefunden ist.

## 0.24.0 — 21.10.2026 · Matrix als Kacheln

- **Matrix mit Zeilen und Spalten** zeigt jede Zelle als Kachel. Je mehr Positionen darin
  liegen, desto kräftiger die Farbe. Leere Zellen bleiben blass stehen.
- **Maus über einer Kachel** hebt sie und ihre Zeile und Spalte blau hervor.
- **Beim Wechsel der Gliederung** gleiten die Punkte an ihren neuen Platz. Bei sehr großen
  LVs und bei „Bewegung reduzieren“ im System springt der Graph wie bisher.
- **Abschnitt** gibt es nur noch als Zeile, nicht mehr als Spalte. Lange Titel standen
  nebeneinander übereinander.

## 0.23.0 — 19.10.2026 · Nicht-Treffer in der Suche

- **Dimmen oder ausblenden** steht jetzt direkt in der Suchleiste, sobald Suche oder Filter
  aktiv sind. Vorher lag der Schalter im Seitenfenster „Filter".
- **Die Tabelle folgt dem Schalter:** beim Dimmen zeigt sie alle Positionen, Nicht-Treffer
  blass; beim Ausblenden nur die Treffer.

## 0.22.0 — 17.10.2026 · Notizen hängen am Inhalt der Position

- **Marker und Kommentare** werden jetzt unter dem Fingerabdruck der Position gespeichert
  (OZ, Text und Menge), wie der Positions-Link. Vorher hing die Zuordnung an der
  Reihenfolge, in der Bubble die Datei einliest.
- Vorhandene Notizen bleiben erhalten und werden beim nächsten Speichern umgestellt.

## 0.21.0 — 17.10.2026 · Anonyme Nutzungszählung

- **Bubble kann anonym zählen**, welche Funktionen genutzt werden: Seitenaufrufe, geöffnete
  Dateien und Demos, Seitenfenster, Tabelle, Vergleich, Suche, Markierung, Kommentar,
  Tour, Export und Druck. Dienst: GoatCounter, ohne Cookies.
- Nicht gezählt werden Dateinamen, LV-Inhalte, Suchtexte und Filterwerte. Die Datei
  verlässt den Browser weiterhin nie.
- Gezählt wird nur auf der Live-Seite, nicht in PR-Vorschauen und nicht, wenn der
  Browser „Do Not Track“ meldet.
- Die Zählung ist vorbereitet, aber noch aus. Sie startet erst, wenn die
  Datenschutzerklärung steht.

## 0.20.0 — 17.10.2026 · Marker, Verlauf, Mengenstufe

- **Drei Marker statt einer Markierung:** Markiert (⚑), Wichtig (!) und Erledigt (✓),
  unten in der Positionskarte als ein Knopf mit Pfeil. Der Knopf setzt die zuletzt
  gewählte Art oder nimmt einen gesetzten Marker weg; der Pfeil wechselt. Je Marker gibt es oben einen Filter, dazu „Nicht
  erledigt“ für die Kalkulation. Alte Markierungen werden zu „Markiert“.
- **Kommentar-Verlauf:** „Senden“ (oder Strg+Enter) hängt einen Kommentar mit Datum und
  Uhrzeit an. Marker-Wechsel stehen grau dazwischen. Bleibt in diesem Browser.
- **Matrix nach Mengenstufe:** neue Achse „Mengenstufe“ (unter 10 bis ab 10.000), zum
  Beispiel als Spalten neben „Einheit“. In jeder Gruppe liegt die größte Menge innen.
- **Maße violett:** benannte Maße im Langtext fallen jetzt auf.
- **Admin-Werkzeuge** im Logo-Menü, mit Passwort: Begriffe im Langtext als Material,
  Maße, Wichtig oder „nicht hervorheben“ lernen und als CSV fürs Repo herunterladen.
  Der Langtext in der Positionskarte lässt sich jetzt markieren und kopieren.
- **Normen:** Vornormen und Spezifikationen wie „DIN V 18580“ oder „DIN SPEC 91400“ werden
  jetzt erkannt.

## 0.19.0 — 17.10.2026 · Positionen als Link teilen

- **Link auf eine Position:** Ist eine Position gewählt, steht in der Adresszeile ein
  kurzer Code für genau diese Position (`#lv=…~pos=…`). Wer dieselbe Datei lädt, landet
  dort – auch wenn er die Datei unter anderem Namen gespeichert hat.
- **Andere Datei, gleiche Position:** Stammt der Link aus einer anderen Datei und die
  Position ist inhaltlich gleich (z. B. X83 und bepreiste X84), öffnet sie trotzdem, mit
  Hinweis.
- **Alte Links** mit OZ funktionieren weiter.
- **Unter der Haube:** Parser und Datenmodell liegen jetzt als eigener Kern in
  `packages/core/` – Grundlage für BIM und Terminplan.

## 0.17.0 — 15.10.2026 · Prüfung aufgeräumt

- **V3 läuft:** Hersteller- und Produktnamen aus `hersteller-produktnamen.csv` werden
  gefunden. Steht „gleichwertig“ oder „o. glw.“ in der Position, gibt es keinen Hinweis.
  Die Zusätze stehen in `pruefregeln-stichworte.csv`.
- **M1 ist aus:** Der Hinweis zur Bewehrung erscheint nicht mehr. Mit `bestaetigt` in
  `pruefregeln.csv` kommt er zurück.
- **Kein „kein Norm-Bezug“ mehr:** Regeln ohne Norm zeigen keine Verweiszeile.
- **Prüfkarte kompakt:** eine Zeile je Regel mit Schalter und Anzahl, nach Kategorie
  gruppiert. Ein Klick auf die Regel öffnet Hinweistext, Verweis und Funde in einer Karte
  rechts daneben. Regeln ohne Treffer stehen gesammelt in einer Zeile.
- **Klick auf einen Fund** in der Prüfung wählt die Position im Graphen aus. Die Tabelle
  öffnet sich nicht mehr.
- **Filter „Status“ entfernt:** Er hatte immer nur den Wert „offen“.
- **Bauteiltyp entfernt:** Die Erkennung kannte nur zwölf Typen. Filter, Tabellenspalte,
  Export-Spalte, Matrix-Achse und der Import-Hinweis „Bauteil ohne Bauteiltyp“ fallen weg.

## 0.16.0 — 13.10.2026 · Material Beton

- **Material wird erkannt.** Bubble erkennt Beton und Betonstahl an Stichworten und
  Klassen wie „C30/37" oder „XC4". Neuer Filter „Material".
- **Merkmale von Beton:** Art, Bauweise und Bewehrung. Sie stehen in der Positionskarte,
  als Filter und im Export. Die Fundstellen sind im Langtext grün markiert.
- **Neuer Hinweis M1:** Betonposition ohne Angabe zur Bewehrung. Er nennt den
  Betonstahl im selben Abschnitt.
- Das Wissen steht in Tabellen, die du in Excel pflegen kannst
  (`docs/setup/materialwissen.md`). Die Inhalte sind ein Entwurf.
- **Treffer-Protokoll:** Im Logo-Menü lädt „Treffer-Protokoll (CSV)“ eine Datei mit
  jedem Treffer der Materialtabellen: Stichwort, Tabellenzeile, Fundtext, Status und
  Auffälligkeiten. Damit findest du Fehler in den Tabellen.
- **Prüfung:** Bedarfs- und Alternativpositionen sind eine Regel (V1), der Hinweis nennt
  weiter, welche der beiden es ist. V6 heißt jetzt „Verweis auf ein anderes Dokument“ und
  bittet nur zu prüfen, ob das Dokument vorliegt. V8 bis V10 sind vorerst aus der
  Prüfung genommen. Die Norm-Verweise von V1 bis V7 sind bestätigt.
- **Prüfregeln in Tabellen:** Name, Hinweistext, Schwere, Schwellwerte und Suchwörter
  jeder Regel stehen jetzt in `docs/domain/reference/` und lassen sich in Excel ändern
  (`docs/setup/pruefregeln.md`).
- **Kostentreiber, Mengentreiber und Preisausreißer** (G1, G2, G4) sind keine Hinweise
  mehr. Die Listen im Überblick bleiben.
- **Offene Stellen genauer (V7):** Eingabefelder, die die GAEB-Datei selbst als
  Bieterangabe kennzeichnet, zählen immer („Textergänzung“). Punkte im übrigen Text
  zählen erst ab 5 Stück („Punktreihe“). Drei Punkte als Auslassung lösen keinen
  Hinweis mehr aus. Die Zahl steht in `pruefregeln-parameter.csv`.
- Einheiten mit Punkt am Ende („Psch.“) gelten als dieselbe wie ohne Punkt. Neue
  Einheiten-Gruppe „Pauschal“.

## 0.15.1 — 13.10.2026 · Markierung vorn

- Die Schilder ⚑ und ✎ im Graphen liegen jetzt immer vor allen Punkten. Vorher
  verdeckte sie manchmal ein Nachbarpunkt.
- Der Knopf ⚑ zum Markieren steht unten in der Positionskarte neben „Vergleichen“
  und „In der Tabelle zeigen“. Das Feld „Kommentar“ bleibt ganz unten im Inhalt.

## 0.15.0 — 12.10.2026 · Kommentare

- **Markieren und kommentieren.** Die Positionskarte hat einen Knopf „⚑ Markieren“ und
  ein Feld „Kommentar“. Gespeichert wird beim Tippen.
- Im Graphen zeigt ein kleines Schild am Punkt, was markiert (⚑) oder kommentiert (✎) ist.
- Oben neben der Suche filtern „Markiert“ und „Mit Kommentar“ auf genau diese Positionen.
- Die Tabelle hat die Spalten „Markiert“ und „Kommentar“, der CSV-Export auch.
- In der Tabelle lässt sich jetzt **jede** Spalte ausblenden, auch OZ und Bezeichnung.
- Markierungen und Kommentare bleiben zur letzten Datei in diesem Browser gespeichert.
  Die Startseite zeigt, wie viele es sind. Eine neue Datei beginnt leer, ✕ löscht sie mit.
  Bei Demo-LVs gelten sie nur bis zum Reload.

## 0.14.0 — 12.10.2026 · Letzte Datei

- **Letzte Datei öffnen.** Die Startseite zeigt unter „Eigenes LV öffnen“ die zuletzt
  geöffnete Datei mit Anzahl der Positionen und Zeitpunkt. Ein Klick öffnet sie wieder,
  ohne sie neu zu suchen.
- Gespeichert wird nur diese eine Datei, und nur in diesem Browser. Eine neue Datei
  ersetzt sie, Demo-LVs werden nie gespeichert.
- **✕** neben „Öffnen“ löscht die gespeicherte Datei nach einer Rückfrage.

## 0.13.0 — 12.10.2026 · Tour

- **Kurze Tour.** Nach dem ersten LV fragt Bubble unten links „Neu hier?“. Die Tour zeigt
  in neun Schritten die wichtigsten Stellen: Punkt, Positionskarte, Suche, Filter,
  Gliederung, Kennzahlen, Hinweise, Tabelle und das Logo-Menü.
- Manche Schritte warten, bis man selbst klickt. Jeder Schritt lässt sich überspringen,
  Escape beendet die Tour.
- **Logo-Menü** hat den Eintrag „Tour“, um sie jederzeit neu zu starten.

## 0.12.0 — 11.10.2026 · Ohne Leistungsbereich

- **Gewerk entfernt.** Bubble ordnet Positionen keinem Leistungsbereich mehr zu. Die
  Zuordnung traf ohne gepflegten Katalog fast nie. Damit entfallen der Filter „Gewerk“,
  die Spalte „Gewerk“ im Export und der Import-Hinweis „ohne Gewerk“.
- **Filter „Material“ und die Merkmale „tragend“ und „Steinart“ entfallen.** Sie hingen
  am Leistungsbereich. Material kommt bald aus einer eigenen Tabelle, Beton zuerst.
- **Positionskarte** zeigt oben den Hauptabschnitt in seiner Farbe.
- Druckfestigkeit, Exposition und alle anderen Klassen aus dem Text bleiben.
- Alte Teilen-Links mit Gewerk-Filter laden weiter, der Filter fällt weg.

## 0.11.0 — 10.10.2026 · Farbe nach Abschnitt

- **Punkte nach Abschnitt eingefärbt.** Im Graphen hat jeder Punkt die Farbe seines
  Hauptabschnitts, wie in der Verteilung im Überblick. Bisher war es das Gewerk, das
  ohne Katalog meist fehlt.
- **Legende** nennt in der Matrix die Abschnitte statt der Gewerke.
- **Kachel „Abschnitte“** im Überblick zählt die Hauptabschnitte. Sie ersetzt die Kachel
  „Gewerke“.

## 0.10.0 — 08.10.2026 · Auswertung aus dem LV

- **Verteilung nach Abschnitt und Einheit.** Das Diagramm im Überblick zeigt die
  Hauptabschnitte, darin die Mengeneinheiten. Es braucht keine Gewerk-Erkennung mehr.
- **Größte Mengen.** Bei LVs ohne Preise steht statt Pareto je Einheit, welche
  Positionen die größte Menge haben. Ein Klick wählt die Position an. „Mengen je
  Einheit“ entfällt dann, die Einheiten stehen schon dort.
- **Matrix.** Die Gliederung „frei“ heißt jetzt „Matrix“ und kann auch nach Abschnitt
  ordnen, etwa Abschnitt × Einheit.
- **Mengenfilter** steht als Regler direkt im Filterfenster.

## 0.9.0 — 06.10.2026 · Zweiter Bildschirm

- **Tabelle im eigenen Fenster.** ↗ im Kopf der Tabelle öffnet sie in einem eigenen
  Browserfenster, etwa für den zweiten Bildschirm. Filter, Suche und Auswahl bleiben mit
  dem Graphen gleich.
- **Zurückholen** mit ↙ im Fenster. Schließt man es, ist die Tabelle zu.
- Blockiert der Browser das Fenster, steht kurz „Pop-up blockiert" im Tabellenkopf.

## 0.8.0 — 05.10.2026 · Vergleich

- **Positionen vergleichen.** Bis zu vier Positionen nebeneinander in einem Fenster über
  dem Graphen. Was von der ersten Spalte abweicht, ist gelb, im Langtext jedes Wort,
  das nicht in allen Texten steht.
- **Dazunehmen** über „⇄ Vergleichen" in der Positionskarte oder mit Shift + Klick auf
  einen Punkt im Graphen oder eine Zeile in der Tabelle. Unter „Ähnlich" schlägt das
  Fenster gleichartige Positionen vor.
- **Fenster zu, Vergleich bleibt.** Unten holt „⇄ Vergleich" es zurück, „leeren" nimmt
  alle Positionen heraus.
- **Export und Druck im Logo-Menü.** „Positionen als CSV", „Hinweise als Markdown" und
  „Drucken" stehen jetzt unter dem Logo.
- **Keine Befehlsliste mehr.** Der Knopf „Befehle" ist weg. Strg K und „/" setzen den
  Cursor jetzt direkt in die Suche.
- **Tastenkürzel nachschlagen.** Im Logo-Menü oder mit „?" öffnet sich eine Übersicht
  aller Tasten.
- **Größe unten rechts.** Tabelle und Vergleich zieht man jetzt an der Ecke unten rechts
  größer.

## 0.7.0 — 05.10.2026 · Neuer Graph

- **Alles auf einen Blick.** Jeder Abschnitt ist ein Kreis, jede Position ein Punkt
  darin. Je mehr Positionen, desto größer der Kreis. Lose sind eine gestrichelte Hülle.
  Aufklappen ist nicht mehr nötig.
- **Gliederung „nach LV" oder „frei"** im Seitenfenster unter „Filter". „frei" ordnet
  nach Merkmalen in Zeilen und Spalten, z. B. Einheit × Gewerk. Ein neuer Filter wird
  von selbst zur Spalte.
- **Hinweise im Graphen:** Ring am Punkt und ein Schild mit der Regel. Schilder
  überlappen sich nie. Der Schalter „⚠ Hinweise" unten rechts blendet sie aus.
- **Größe der Punkte:** gleich, nach Menge (nur innerhalb derselben Einheit) oder nach
  Preis. Der Schalter sitzt unten rechts.
- **Linie zur Karte:** Von der gewählten Position führt eine gestrichelte Linie zur
  Positionskarte.
- **Legende unten links:** Formen der Positionsarten, Hinweis-Ringe und Gewerk-Farben.
- **Steuerung unten rechts in einer Leiste:** Zoom, „⚠ Hinweise" und Größe.
- **Filterfenster wie im Entwurf:** Filterwerte als runde Chips, Zeilen und Spalten
  brechen um statt überzulaufen. Die Breite lässt sich am rechten Rand ziehen. Das
  Fenster endet über der Legende.
- **Runde Suche** in der Kopfleiste.
- **Eigenes Favicon:** das Bubble-Zeichen im Browser-Tab.
- **Entfallen:** „Alles auf-/zuklappen" und „Treffer isolieren". Beides braucht der
  neue Graph nicht mehr.

## 0.6.0 — 05.10.2026 · Der Graph ist der Hauptscreen

- **Neuer Einstieg.** Die Startseite bietet zwei Wege: „Eigenes LV öffnen" (Datei
  hineinziehen oder auswählen) und „Demo-LV ansehen".
- **Der Graph bleibt immer sichtbar.** Überblick, Filter und Prüfung öffnen sich als
  Seitenfenster links. Die Tabelle ist ein Fenster, das du verschieben und in der Größe
  ändern kannst. Unten mittig holst du sie zurück.
- **Import-Log im Überblick:** fehlende Einheit, Menge oder Preis, nicht klassifizierte
  Positionen, doppelte OZ und Positionen ohne Text — für die ganze Datei.
- **„Ohne Gewerk" ist ein echter Filterwert.**
- **Eine Zeile oben.** Logo-Menü, Datei, Suche, Befehle, „LV schließen". Gesetzte
  Filter stehen als Chips in der Suche, „+ Filter" öffnet die Auswahl.
- **Kennzahlen oben links:** Positionen, Abschnitte und Hinweise. Ein Klick öffnet den
  passenden Reiter.
- **Hell oder dunkel.** Bubble folgt der Einstellung deines Systems. Im Logo-Menü unter
  „Design" kannst du umschalten. Die Wahl gilt bis zum Neuladen.
- **Neuer Look:** gerundete Fenster mit weichem Schatten über dem Graphen.
- **Neue Positionskarte:** oben Menge, EP und Positionsart; Hinweise als Kästen;
  Fundstellen im Langtext mit Anzahl zum Ein- und Ausblenden; Eigenschaften als Tabelle.
  Fehlt der Preis, steht „–".
- Entfallen: der Ansichtsumschalter, die Baumspalte, Matrix, Ähnlichkeit und Vergleich.
  Die Eigenschaften einer Position zeigt die Karte im Graphen. Alte Links auf Matrix,
  Ähnlichkeit, Prüfung oder Vergleich öffnen den Graphen mit einem Hinweis.

## 0.5.0 — 28.09.2026 · Vergleich über dem Graphen

- **Zwei Bubbles mit Strg-Klick, und der Vergleich steht da.** Er öffnet sich als
  Fenster über dem Graphen — kein Ansichtswechsel, die Bubbles bleiben sichtbar, und
  eine dritte Position kommt mit dem nächsten Strg-Klick dazu.
- **Klick, dann Strg-Klick.** Ist schon eine Position angewählt, nimmt der erste
  Strg-Klick sie gleich mit in den Vergleich — zwei Positionen, ein Strg-Klick. Das gilt
  auch in Tabelle und Baum.
- **Rechtsklick auf eine Position** — als Bubble im Graphen oder als Zeile in Tabelle
  und Baum — bietet „Zum Vergleich hinzufügen" an (bzw. „Mit … vergleichen" oder „Aus
  dem Vergleich nehmen"). Der Weg ohne Strg-Taste.
- **Aussortieren im Fenster:** Wer Spalten herausnimmt, behält das Fenster — auch mit
  nur noch einer Position. Es geht erst zu, wenn der Vergleich leer ist.
- **Dieselben Zeilen wie die Ansicht „Vergleich".** Auch „Nur Unterschiede" ist
  derselbe Schalter: was du im Fenster umstellst, steht in der Ansicht genauso.
- **Fenster verschieben und aufziehen** wie die Auswahlkarte — am Griff oben, Größe
  unten links. Ort und Größe merkt sich Bubble getrennt von den Info-Panels; ein Reload
  setzt zurück, wie immer.
- **Ab drei Spalten** schlägt das Fenster vor, in die ganze Ansicht zu wechseln. Dort
  ist mehr Platz — eng wird es trotzdem nicht: das Fenster scrollt.
- **Das ✕ schließt nur das Fenster.** Die Positionen bleiben im Vergleich; oben im
  Graphen steht dann „Vergleich · 3 Pos. zeigen" und holt es zurück. Von selbst kommt
  es erst zurück, wenn eine Position dazukommt — Herausnehmen holt es nicht wieder.
- Korrektur: Im Vergleich standen die Spaltenköpfe und die Langtexte um eine
  Spaltenbreite versetzt zu den Werten darunter. Jetzt fluchten sie.

---

## 0.4.0 — 25.09.2026 · Ähnliche Positionen im Graphen

- **Gestrichelter Ring an der Bubble.** Gibt es zu einer Position ähnliche, sieht man das
  jetzt im Graphen — dezent, damit der Graph ruhig bleibt. Die Füllfarbe gehört weiter
  dem Gewerk.
- **„Ähnliche zeigen".** In den Positionsdetails steht, zu welcher Gruppe eine Position
  gehört und wie viele noch dazugehören. Ein Klick hebt die ganze Gruppe im Graphen
  hervor, alles andere tritt zurück.
- **Wieder aufheben** mit demselben Knopf, mit der Schaltfläche oben im Graphen oder mit
  Escape. Escape geht dabei eine Ebene nach der anderen zurück: steht noch eine Karte
  oder ein Fenster offen, schließt der erste Druck das — erst der nächste hebt die
  Gruppe auf. Filter, Suche und Auswahl bleiben unberührt.
- **Kopfzeile nennt die Zahl:** „8 mit Ähnlichen", mit dem Ring daneben als Legende.
- Außerhalb des Graphen führt derselbe Knopf in die Ansicht „Ähnlichkeit" — und zwar
  direkt zu dieser Gruppe: sie steht aufgeklappt da, statt irgendwo in einer nach
  Größe sortierten Liste.

---

## 0.3.0 — 25.09.2026 · Hinweise im Graphen

- **Ring an der Bubble.** Eine Position, an der eine Prüfregel etwas gefunden hat,
  bekommt im Graphen einen Ring. Die Ringfarbe sagt, wie schwer es wiegt — orange für
  „beachten", grau für „Hinweis". Die Füllfarbe bleibt unverändert: sie gehört dem
  Gewerk.
- **Der Ring erscheint erst, wenn du nah genug dran bist.** Weit draußen ist eine
  Position nur ein Punkt; ein Ring darum wäre ein Fleck.
- **Kopfzeile des Graphen nennt die Zahl:** „9 mit Hinweis", gerechnet im aktuellen
  Filter, mit dem Ring als Legende daneben.
- **Block „Hinweise" in den Positionsdetails.** Klickst du eine Bubble an, steht über
  dem Langtext, was an dieser Position auffällt — nach Regel gruppiert, mit Norm-Verweis
  und einem Knopf „In der Prüfung zeigen", der die Regel dort aufgeklappt ins Bild holt.
  Derselbe Block steht im Eigenschaften-Panel der Tabelle.
- **Eine abgeschaltete Regel markiert nichts mehr.** Was du in der Prüfung stumm
  stellst, verschwindet auch aus dem Graphen.

---

## 0.2.0 — 24.09.2026 · aufgeräumte Kopfleiste

- **Zwei Leisten statt einer.** Oben Logo, Projekt und die acht Ansichten; darunter
  Suche und Filter. Vorher passte bei 1440 px kein einziger Facetten-Knopf in die
  Zeile — jetzt stehen acht davon sichtbar da, der Rest unter „Weitere Filter".
- **Export, Druck und Melden sind Befehle geworden.** Die Knöpfe „Mitnehmen" und
  „Befehle" sind aus der Leiste verschwunden, die Funktionen nicht: **Strg/Cmd + K**
  öffnet die Palette, dort stehen sie unter „Mitnehmen". Die Filterleiste nennt die
  Taste, der Einstiegstext erklärt sie.
- **„Fehler melden"** erreichst du weiterhin auch hinter dem Logo.

---

## 0.1.0 — 24.09.2026 · erste öffentliche Beta

**Acht Ansichten auf einem Filterzustand.** Ein Ansichtswechsel fasst Filter, Suche und
Auswahl nicht an.

| Ansicht       | Wofür                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| Überblick     | Kennzahlen, Verteilung nach Gewerk und Abschnitt, Pareto, Mengen je Einheit |
| Graph         | Das LV als Bubbles; Größe nach Anzahl, Gesamtpreis, Menge oder einheitlich  |
| Tabelle       | Baum, Positionsliste und Eigenschaften nebeneinander                        |
| Matrix        | Heatmap über zwei Merkmale                                                  |
| Ähnlichkeit   | Ähnliche Positionen, ihre Unterschiede, Ausreißer                           |
| Vergleich     | Bis zu fünf Positionen nebeneinander, Abweichungen markiert                 |
| Prüfung       | Hinweise der VOB-Prüfregeln mit Norm-Verweis und Fundstelle                 |
| Eigenschaften | Langtext mit Hervorhebungen, Attribute, Menge und Preis                     |

**Neu in dieser Version**

- **Graph mit Mehrwert:** Anteil am Projekt in Prozent, Stichwort an jeder Positions-Bubble,
  Treffer wahlweise im ganzen Graphen hervorgehoben oder isoliert und neu gruppiert,
  Sprung von dort in die Tabellenzeile.
- **Vergleich und Matrix** als eigene Ansichten.
- **Mitnehmen:** Positionen als CSV, Hinweise als Markdown, Druck der gefilterten Liste —
  alles im Browser erzeugt, ohne einen einzigen Request.
- **Teilbarer Link:** Ansicht, Filter und Auswahl stehen hinter `#` in der Adresszeile.
  Der Empfänger braucht dieselbe Datei; das Fragment verlässt den Rechner nicht.
- **Kommandopalette** mit Strg/Cmd + K: Ansicht wechseln, filtern, zu einer OZ springen.
- **Tastatur** in Tabelle und Matrix: Pfeile, Pos1/Ende, Enter wählt.
- **Fehler melden** ohne GitHub-Konto: Text kopieren, als E-Mail öffnen oder als Issue.
  Der Text steht sichtbar da, bevor er das Haus verlässt, und trägt nichts aus der Datei.
- **Einstiegstext** auf der Startseite: was Bubble tut, wo die Datei bleibt, was es nicht ist.
- **Auffangnetz:** Ein Absturz zeigt eine lesbare Seite statt einer weißen Fläche; stürzt
  eine Ansicht ab, laufen die anderen weiter.
- **Diese Seite** — Version, Stand und Änderungen hinter dem Logo.

**Was Bubble weiterhin nicht tut:** kein Server, kein Konto, keine Speicherung über die
Sitzung hinaus, keine Nutzungsmessung. Ein Reload verwirft den Stand.
