# Materialliste für den Filter „Material"

Diese Seite ist für den Repo-Owner.

**Stand:** Der Filter „Material" ist ausgeblendet. Er erscheint erst, wenn eine
**geprüfte** Materialliste aktiv ist. Solange das nicht so ist, passiert nichts
Kaputtes — der Filter fehlt nur.

## Warum es ihn heute nicht gibt

- Bubble erkennt Material nur anhand einer Wortliste (Beton, Mauerwerk, …).
- Die Liste ist Fachwissen. Eine ungeprüfte Liste im Code wäre eine Aussage, die niemand
  verantwortet. Deshalb hat ADR 0011 sie verworfen.
- Die Mappingtabelle `docs/domain/reference/zuordnung.csv` hat keine Zeilen für `material`. Damit gibt es keine Wörter.

## Was jetzt im Repo liegt

- [`docs/domain/reference/entwuerfe/material-entwurf.csv`](../domain/reference/entwuerfe/material-entwurf.csv)
- 55 Stichworte in 14 Gruppen (Beton, Mauerwerk, Dämmstoffe, …).
- **Von Claude vorgeschlagen, fachlich nicht geprüft.**
- **Nicht geladen.** Die App liest die Datei nicht. Sie ändert nichts.
- Spalte `pruefhinweis`: dort steht, wo ein Wort zu viel trifft (z. B. „holz", „stahl").

## Deine Schritte

1. **Liste prüfen.** Streichen, was nicht passt. Ergänzen, was fehlt. Die Hinweise
   in `pruefhinweis` helfen bei den unsicheren Wörtern.
2. **Freigeben.** In der Spalte `status` bei geprüften Zeilen `entwurf` durch
   `bestaetigt` ersetzen.
3. **Bescheid geben.** Dann bauen wir die Liste ein.

Lässt du die Schritte aus: Der Filter bleibt ausgeblendet. Alles andere läuft wie bisher.

## Vorsicht beim Einbau

- Die Wörter kommen als Zeilen der Dimension `material` in `zuordnung.csv`.
- Material ist damit **getrennt** von der Gewerk-Erkennung: „Beton" als Material ändert
  nicht, welchem Gewerk eine Position zugeordnet wird
  ([`0032`](../decisions/0032-zuordnung-per-mappingtabelle.md)).
