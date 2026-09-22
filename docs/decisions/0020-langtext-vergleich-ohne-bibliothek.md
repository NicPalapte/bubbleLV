# 0020 – Langtext-Vergleich: Wortmenge statt Teilfolge, ohne Bibliothek

- **Status:** akzeptiert
- **Datum:** 2026-09-22
- **Betrifft:** Frontend, Ansicht „Vergleich" (WP-N)

## Worum geht's

Der Vergleich legt bis zu fünf Positionen nebeneinander und soll zeigen, was
sie auseinanderhält — auch im Langtext. Dafür muss Bubble entscheiden, welche
Wörter es hervorhebt.

## Entscheidung

- **Markiert ist, was nicht in allen verglichenen Texten vorkommt.**
- Verglichen wird die **Wortmenge**, nicht die Häufigkeit: Ein Wort, das jede
  Spalte führt, bleibt überall unmarkiert — auch wenn eine Spalte es öfter
  führt als die andere.
- Groß-/Kleinschreibung und Satzzeichen am Wortrand zählen nicht.
- Zahlen und Einheiten werden **nicht** maskiert (anders als beim
  Ähnlichkeitsvergleich, `lib/relate/text.ts`): „24 cm" gegen „30 cm" ist hier
  genau der Unterschied, den man sehen will.
- **Keine Bibliothek.** Die Umsetzung sind rund vierzig Zeilen
  (`frontend/src/lib/compare/textDiff.ts`).

## Warum so

- Unterschiede zwischen zwei Positionstexten sind im LV fast immer Austausche
  an Ort und Stelle: eine andere Betongüte, eine andere Dicke, ein Satz mehr.
  Genau die findet die Mengenregel.
- Sie gilt unverändert für zwei bis fünf Spalten. Ein paarweises Verfahren
  müsste erst festlegen, gegen wen verglichen wird.
- Häufigkeiten zu zählen klang zuerst genauer, war in der Praxis aber Rauschen:
  Steht „mit" links zweimal und rechts dreimal, wäre rechts irgendein „mit"
  markiert — eines, das links wortgleich danebensteht. Wer zwei Positionen
  vergleicht, sucht das andere Wort, nicht das häufigere.

## Verworfene Wege

- **Längste gemeinsame Teilfolge (LCS), wortweise:** das klassische Diff-
  Verfahren. Es kennt die Reihenfolge und wäre bei zwei Spalten etwas genauer,
  hat aber bei drei bis fünf Spalten keine klare Antwort, und Bubble vergleicht
  bis zu fünf. Ein Verfahren für zwei und ein zweites für mehr wäre schwerer zu
  erklären als der kleine Gewinn wert ist.
- **Eine Diff-Bibliothek** (`diff`, `fast-diff` und ähnliche): eine
  Abhängigkeit für einen Wortvergleich, den man in vierzig Zeilen liest. Die
  Bibliotheken lösen zudem dasselbe Zwei-Texte-Problem wie LCS.
- **Zeichenweiser Vergleich:** markiert innerhalb von Wörtern und zerfasert den
  Text optisch; in Positionstexten mit Fachbegriffen unlesbar.

## Folgen

- Ein Wort, das in beiden Texten vorkommt, aber an anderer Stelle steht, gilt
  als gemeinsam. Umstellungen fallen damit nicht auf. Das ist gewollt: eine
  Umstellung ändert die Leistung nicht.
- Kommt später ein Vergleich zweier **Dateien** dazu (heute out of scope), ist
  diese Entscheidung neu zu prüfen — dort sind Umstellungen eine Aussage.
