# Änderungen

Was sich in Bubble von Version zu Version geändert hat — in der Sprache der Anwendung,
nicht in der des Codes. Neueste Version oben.

Die Nummern folgen [Semantic Versioning](https://semver.org/lang/de/): die **mittlere**
Zahl steigt bei neuen Funktionen, die **letzte** bei Korrekturen. Die **erste** bleibt
`0`, solange Bubble in der Beta ist.

---

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
