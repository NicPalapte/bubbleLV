# Keywords für die STLB-Leistungsbereiche prüfen

Diese Seite ist für den Repo-Owner.

**Stand:** Die Mappingtabelle `docs/domain/reference/zuordnung.csv` kennt je Leistungsbereich nur
ein Wort aus dem Namen. Bubble erkennt deshalb nur Leistungsbereiche, deren Name
„…arbeiten" oder „…anlagen" im Text steht.

## Was im Repo liegt

- [`entwuerfe/stlb-keywords-entwurf.csv`](../domain/reference/entwuerfe/stlb-keywords-entwurf.csv)
- Eine Zeile je Leistungsbereich, 78 Zeilen.
- **Von Claude vorgeschlagen, fachlich nicht geprüft. Nicht geladen.**
- Spalte `pruefhinweis`: dort steht, wo ein Wort zu viel trifft oder fehlt.

## Wie die Wörter wirken

- Alles klein geschrieben, mit `|` getrennt.
- Treffer ist **jedes Textstück**: `aufzug` trifft auch „Bauaufzug".
- Bei mehreren Treffern gewinnt das **längste** Wort.
- Deshalb fehlen absichtlich kurze Wörter wie `kran` (trifft „Krankenhaus").

## Deine Schritte

1. **Prüfen.** Streichen, was nicht passt. Ergänzen, was fehlt. Besonders:
   Zeile 087 (Entsorgung) und 084 (Abbruch) – die Wörter stehen oft in Nebensätzen.
2. **Freigeben.** In `status` bei geprüften Zeilen `entwurf` durch `bestaetigt` ersetzen.
3. **Bescheid geben.** Dann wird der Entwurf in die Mappingtabelle `zuordnung.csv`
   übernommen (Dimension `leistungsbereich`).

Lässt du die Schritte aus: Es ändert sich nichts. Alles läuft wie bisher.

## Spalte `quelle_version`

- Gemeint ist: **Welche Fassung des STLB-Bau-Katalogs** hat die Zeile geliefert?
- Beispiel: `2023` oder `STLB-Bau 2025-04`.
- Zweck: Ändert der Herausgeber Nummern oder Namen, sieht man, auf welchem Stand die
  Zeile ist.
- Der Code zeigt sie nirgends an. Sie ist reine Pflege-Info.
- Du trägst sie ein, sobald du die Liste aus deiner Lizenz/deinem Export abgleichst.
