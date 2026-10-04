# 0030 – Filter „Material": ausblenden, solange es keine geprüfte Liste gibt

- **Status:** akzeptiert
- **Datum:** 2026-10-04
- **Betrifft:** Frontend, Filterleiste, Klassifizierung (Material), Issue #99

## Worum geht's

Der Filter „Material" war sichtbar, zeigte aber in jeder Datei nur „Keine Werte". Der
Kalkulator-Test (Frage „Welche Materialien?") hat das als größte Lücke gefunden.

Ursache ist gewollt: Material wird nur aus einer Wortliste erkannt, und die ist leer
([`0011`](0011-extraktoren-und-fundstellen.md)). Die Oberfläche sagte das nicht.

## Entscheidung

- **Der Filter „Material" ist ausgeblendet, solange er keine Werte hat.** Ein Knopf, der
  nichts tun kann, erzeugt nur Fragen.
- Die Regel hängt an der Facette (`hideWhenEmpty` in `lib/facets.ts`) und gilt **nur**
  für Material. Bei allen anderen Filtern sagt „keine Werte" etwas über die Datei
  (z. B. „dieses LV nennt keine Exposition"). Bei Material liegt es nicht an der Datei,
  sondern an der fehlenden Liste.
- **Die Materialliste bleibt Sache des Owners.** Ein Entwurf liegt unter
  `docs/domain/reference/entwuerfe/material-entwurf.csv`. Er wird **nicht geladen** und
  ist fachlich ungeprüft. Der Ablauf steht in
  [`docs/setup/materialliste.md`](../setup/materialliste.md).
- ADR 0011 bleibt gültig: Es gibt weiter keine Wortliste im Code.

## Verworfene Alternativen

- **Filter sichtbar lassen und erklären** („Keine Materialliste hinterlegt"). Passt zu
  den inaktiven Prüfregeln, wurde aber abgelehnt: die Kopfleiste ist ohnehin zu voll
  (#80), und ein Knopf mit Entschuldigung verbraucht Platz.
- **Entwurfsliste sofort aktivieren.** Der Filter wäre gefüllt, die Liste aber
  ungeprüft. Genau das hat ADR 0011 verworfen.
- **Die Wörter in die Spalte `keywords` des STLB-Katalogs schreiben.** Dieselbe Spalte
  steuert die **Gewerk-Erkennung** (`matchStlb`). „Beton" dort würde nebenbei ändern,
  welchem Gewerk eine Position zugeordnet wird. Für den Einbau empfiehlt sich eine
  eigene Datei nur für Material.

## Folgen

- **Für den Owner:** Liste prüfen und freigeben, siehe `docs/setup/materialliste.md`.
  Lässt er das aus, bleibt der Filter ausgeblendet. Nichts geht kaputt.
- Der Einbau der geprüften Liste ist ein eigener Schritt und braucht eine Ergänzung zu
  ADR 0011 (eigene Referenzdatei, getrennt vom Gewerk).
- **Nicht geändert:** In der Matrix bleibt „Material" als Achse wählbar. Dort ist eine
  leere Achse zwar auch wenig hilfreich, gehört aber nicht zu diesem Issue.
