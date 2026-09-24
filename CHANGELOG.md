# Änderungen

Was sich in Bubble von Version zu Version geändert hat — in der Sprache der Anwendung,
nicht in der des Codes. Neueste Version oben.

Die Nummern folgen [Semantic Versioning](https://semver.org/lang/de/): die **mittlere**
Zahl steigt bei neuen Funktionen, die **letzte** bei Korrekturen. Die **erste** bleibt
`0`, solange Bubble in der Beta ist.

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

| Ansicht | Wofür |
|---|---|
| Überblick | Kennzahlen, Verteilung nach Gewerk und Abschnitt, Pareto, Mengen je Einheit |
| Graph | Das LV als Bubbles; Größe nach Anzahl, Gesamtpreis, Menge oder einheitlich |
| Tabelle | Baum, Positionsliste und Eigenschaften nebeneinander |
| Matrix | Heatmap über zwei Merkmale |
| Ähnlichkeit | Ähnliche Positionen, ihre Unterschiede, Ausreißer |
| Vergleich | Bis zu fünf Positionen nebeneinander, Abweichungen markiert |
| Prüfung | Hinweise der VOB-Prüfregeln mit Norm-Verweis und Fundstelle |
| Eigenschaften | Langtext mit Hervorhebungen, Attribute, Menge und Preis |

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
