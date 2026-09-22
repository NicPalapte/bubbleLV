# 0022 – Export, Druck und Fehlermeldung ohne einen einzigen Request

- **Status:** akzeptiert
- **Datum:** 2026-09-22
- **Betrifft:** Frontend, WP-P (Schritte 3, 4 und 6), Issue #57

## Worum geht's

Bubble soll das, was man gerade sieht, mitnehmbar machen: als Datei, auf Papier —
und einen Fehler soll man melden können. Alle drei Wege sind Stellen, an denen
Daten üblicherweise das Haus verlassen. Genau das darf hier nicht passieren.

## Entscheidung

- **Export als Blob.** CSV und Markdown entstehen im Browser
  (`frontend/src/lib/export/`), `URL.createObjectURL` erzeugt eine lokale
  Adresse, ein unsichtbares `<a download>` löst den Speichern-Dialog aus. Die
  Objekt-URL wird sofort wieder freigegeben.
- **CSV mit Semikolon und BOM.** Excel liest in deutscher Spracheinstellung nur
  `;` als Spaltentrenner, und ohne BOM wird aus „m³" ein „mÂ³".
- **Der Export trägt alle Spalten**, nicht die gerade sichtbaren. Zeilen sind
  die gefilterte Menge.
- **Eine fehlende Menge bleibt ein leeres Feld**, keine 0.
- **Formel-Starts werden entschärft**: ein Feld, das mit `=`, `+`, `-`, `@` oder
  einem Tabulator beginnt, bekommt ein führendes `'` (CSV-Injection, CWE-1236).
  Echte Zahlen bleiben Zahlen — ein negativer Einheitspreis soll in Excel als
  Zahl ankommen.
- **Druck über eine eigene, unvirtualisierte Tabelle**
  (`components/print/PrintView.tsx`), gezeichnet erst bei `beforeprint`.
- **Ohne Preise in der Datei fallen die Preisspalten weg**; mit Preisen steht
  eine Summe über genau die gedruckten Zeilen darunter. Zeilen ohne Preis
  stehen in der Liste, aber nicht in der Summe — die Fußzeile benennt sie
  („Summe über 77 Positionen von 78 · 1 ohne Preis"). Mengen werden nicht
  summiert (Entscheidung 0019).
- **Fehler melden** öffnet ein vorbefülltes GitHub-Formular in einem neuen Tab.
  Darin stehen ausschließlich: Bau-Stand, Ansicht, ob eine Datei geladen ist
  (ja/nein), Browser, Sprache, Fenstergröße. **Nichts** aus der Datei — kein
  Dateiname, keine OZ, kein Text, keine Zahl. Abgeschickt wird nichts
  automatisch; der Nutzer liest den Text und drückt selbst ab.

## Warum

- Ein Export, der über einen Server liefe, wäre der bequemste Weg — und würde
  die einzige harte Zusage des Produkts brechen: die Datei verlässt den Browser
  nicht (.claude/CLAUDE.md).
- **Die virtualisierte Tabelle ist die Falle beim Drucken:** im DOM stehen nur
  die sichtbaren Zeilen. Print-CSS darüber brächte je nach Scrollposition
  zwanzig Zeilen aufs Papier — und sähe vollständig aus. Der Fehler fiele erst
  auf, wenn das Blatt beim Empfänger liegt.
- Die Druckansicht wird erst bei `beforeprint` gezeichnet: 10k Zeilen dauerhaft
  im DOM würden jede Interaktion verlangsamen (Zielwerte in docs/scope.md).
- Eine Summe auf Papier lässt sich nicht nachträglich prüfen. Stünde dort nur
  ein Betrag, sähe er vollständig aus, obwohl unbepreiste Zeilen fehlen —
  auf dem Bildschirm weist der Überblick genau das mit „ohne EP" aus.
- Die GAEB-Datei kommt im Vergabeverfahren selten von dem, der sie liest —
  Planer, Bieter, Nachunternehmer liefern zu. Ein Kurztext `=HYPERLINK("…")`
  würde beim Öffnen der exportierten CSV in Excel als Formel ausgeführt. Die
  Abwehr kostet eine Zeile, der Schaden wäre der Rechner des Lesers.
- Beim Melde-Link ist die Versuchung groß, „zur besseren Analyse" ein bisschen
  Kontext mitzugeben. Deshalb steht die erlaubte Liste an **einer** Stelle im
  Code, und ein Test prüft nicht nur „diese Werte fehlen", sondern „mehr als
  diese sechs Angaben steht gar nicht drin".

## Verworfene Alternativen

- **Export über einen kleinen Server** (z. B. für XLSX mit Formatierung) – braucht
  einen Server; Fachdaten gingen hinaus. Out of Scope.
- **XLSX statt CSV** – bräuchte eine Bibliothek im Bundle; CSV öffnet dieselbe
  Tabelle und ist lesbar, auch ohne Excel.
- **Print-CSS auf der bestehenden Tabelle** – druckt nur das virtualisierte
  Fenster (siehe oben).
- **Druckansicht dauerhaft im DOM, nur per CSS versteckt** – kostet bei jedem
  Filterwechsel 10k Knoten, die niemand sieht.
- **Fehlermeldung per Formular an einen eigenen Endpunkt** – wäre ein Server und
  eine Sammelstelle für Fachdaten; abgelehnt wie die Nutzungsmessung
  ([`0017`](0017-keine-nutzungsmessung.md)).
- **Automatisch angehängter Stacktrace mit Dateiinhalt** – ein Stacktrace kann
  Positionstexte enthalten. Der Nutzer beschreibt lieber selbst.

## Folgen

- Neu: `__BUILD_ID__` in `frontend/vite.config.ts`. In GitHub Actions kommt der
  Wert aus `GITHUB_SHA`, lokal steht „dev". Bewusst kein Aufruf von `git` —
  der Build darf nicht daran scheitern, dass es kein Repo gibt.
- Für den Repo-Owner ändert sich nichts an der Einrichtung. Meldungen laufen
  über die normalen GitHub-Issues des Projekts.
