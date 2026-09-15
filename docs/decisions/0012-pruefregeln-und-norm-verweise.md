# 0012 – Prüfregeln: Norm-Verweise aus der Referenzdatei, Hinweis statt Urteil

- **Status:** akzeptiert
- **Datum:** 2026-09-14
- **Betrifft:** Frontend (Prüfregeln, Ansicht „Prüfung"), Domänen-Referenzdaten

## Worum geht's

Bubble soll auf Stellen im LV hinweisen, an denen ein Blick lohnt — Bedarfspositionen,
fehlende Mengen, offene Textergänzungen, Verweise auf Unterlagen, die nicht mitkommen.
Das berührt die VOB. Und der Regelkatalog sagt: die meisten Absatz-Nummern sind noch
nicht geprüft.

## Entscheidung

- **Prüfregeln liegen in `frontend/src/lib/check/`**, hinter einer Registry wie die
  Rulesets der Klassifizierung. Ergebnisse (`Flag`) hängen am geladenen LV, nicht
  an der Position: ein Hinweis ist keine Eigenschaft, sondern eine Bewertung.
- **Kein Norm-Verweis steht im Code.** Er kommt aus
  [`docs/domain/reference/pruefregeln.csv`](../domain/reference/pruefregeln.csv),
  zusammen mit einem Status je Regel.
- **Ein unbestätigter Verweis wird als unbestätigt gezeigt.** Der Fund erscheint
  (er ist eine Tatsache über die Datei), der Verweis daneben trägt sichtbar
  „Verweis zu bestätigen". Mit `status = aus` verschwindet die Regel ganz — ein
  Wort in der CSV, keine Code-Änderung.
- **Eine Regel ohne Referenzdaten verschwindet nicht**, sondern steht in der Liste
  mit ihrem Grund.
- **Kennzahlen arbeiten mit Rang, nicht mit Schwellwerten.** Und eine Rangliste
  erscheint erst, wenn sie auch jemanden auslässt.
- **Hinweise entstehen einmal beim Laden** im Worker, nie im Render.
- Die Ansicht **Prüfung** ist vorerst der dritte Ansichtsmodus neben Graph und
  Tabelle; WP-L verallgemeinert das zum Ansichts-Gerüst.

## Warum

- **Verweis in der Datei, nicht im Code:** Wenn der Owner eine Absatz-Nummer
  bestätigt oder eine Fassung wechselt, ändert er eine Zeile in einer CSV. Ein
  Verweis im Code würde bei jeder VOB-Novelle einen Entwickler brauchen.
- **Zeigen statt verstecken:** Der Katalog verlangt, dass ungeprüfte Verweise nicht
  als Tatsache auftreten. Sie zu markieren erfüllt das — sie ganz zu verstecken
  hätte auch die Funde verschluckt, obwohl „diese Position ist eine
  Bedarfsposition" mit der VOB gar nichts zu tun hat. Wer es strenger will,
  schaltet die Regel in der CSV ab.
- **Inaktive Regeln bleiben sichtbar:** Eine Regel, die still fehlt, sieht aus wie
  eine Regel, die nichts gefunden hat. Das ist der gefährlichere Irrtum.
- **Rang statt Schwellwert:** „Gehört zu den 10 teuersten" ist eine Tatsache.
  „Anteil über 5 %" wäre eine Grenze, die sich niemand überlegt hat.
- **Rangliste erst ab genug Kandidaten:** Ohne diese Bremse meldete die
  Beispieldatei 27 von 28 Positionen als „Mengentreiber". „Rang 3 von 4" ist kein
  Hinweis, sondern Rauschen.
- **Einmal beim Laden:** Eine Regel wie „Anteil an der Gesamtsumme" sieht das ganze
  LV. Je Render wäre das bei 10.000 Positionen nicht bezahlbar. Flags bestehen nur
  aus Text und Zahlen und überstehen den Weg aus dem Worker unbeschadet — anders
  als der Positions-Index.

## Verworfene Alternativen

- **Regeln erst zeigen, wenn alle Verweise bestätigt sind** – hätte die ganze
  Ansicht bis zu einer juristischen Prüfung leer gelassen, obwohl die Funde selbst
  schon nützlich sind.
- **Verweise ohne Kennzeichnung zeigen** – Bubble hätte eine Fundstelle in der Norm
  behauptet, die niemand geprüft hat. Genau das verbietet der Regelkatalog.
- **Flags in `attributes`** – ein Hinweis ist keine Eigenschaft der Position. In
  `attributes` wäre er automatisch eine Facette geworden.
- **Schwellwerte für Kostentreiber** – siehe oben: eine erfundene Grenze.
- **Risiko-Formulierungen im Code** – dieselbe Begründung wie beim Material in
  WP-J. Die Liste startet mit den zwei Formulierungen, die im Regelkatalog stehen,
  und wächst dort, nicht hier.

## Folgen

- Eine neue Regel = ein Eintrag in `CHECK_RULES` plus eine Zeile in
  `pruefregeln.csv`. Ohne die Zeile erscheint sie als inaktiv mit genau dieser
  Begründung.
- **Für den Owner, damit die Verweise ohne Zusatz erscheinen:** in
  `pruefregeln.csv` den Status von `zu_bestaetigen` auf `bestaetigt` setzen —
  betrifft V1, V2, V4, V5, V6. Die Fragen dazu stehen in
  [`domain/vob-pruefungen.md`](../domain/vob-pruefungen.md).
- **Für den Owner, damit V3, V8 und V9 laufen:** Herstellerliste und
  Nebenleistungs-Listen füllen. Bis dahin stehen die Regeln sichtbar als inaktiv da.
- Die Einheiten-Gruppen (`Stk` = `Stück`, `to` = `t`, `h` = `Std`) sind jetzt
  gepflegte Daten. Kommt eine Gruppe dazu, ändert sich nur die CSV.
