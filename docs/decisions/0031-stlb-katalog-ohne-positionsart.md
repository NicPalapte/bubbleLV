# 0031 – STLB-Katalog ohne Spalte `positionsart_default`

- **Status:** akzeptiert
- **Datum:** 2026-10-04
- **Betrifft:** Klassifizierung (Stufe 0), `stlb-bau-leistungsbereiche.csv`

## Worum geht's

Der STLB-Katalog hatte eine Spalte `positionsart_default`. Sie sollte für
„eindeutig nicht-physische" Leistungsbereiche (z. B. Baustelleneinrichtung) die
Positionsart vorgeben. Der Owner braucht sie nicht.

## Entscheidung

- **Die Spalte entfällt.** Die CSV hat jetzt: `lb_nummer`, `lb_bezeichnung`,
  `keywords`, `quelle_version`.
- Die Positionsart kommt nur noch aus der Heuristik `detectPositionsart`
  (Stichworte/Einheit). Ein LB-Treffer im Positionstext gilt vorläufig als `bauteil`.
- Der Leistungsbereich ist die **Zuordnung** (Abschnitt oder Position → LB). Er sagt
  nichts über die Art der Position.
- Weitere Gliederungen (z. B. DIN 276) sind möglich, aber **nicht** Teil dieser
  Entscheidung. Sie bekommen eine eigene Referenzdatei und einen eigenen Eintrag.
- Keywords-Vorschlag liegt als Entwurf unter
  `docs/domain/reference/entwuerfe/stlb-keywords-entwurf.csv` (nicht geladen).

## Verworfene Alternativen

- **Spalte behalten, leer lassen** – totes Format, das Fragen erzeugt.
- **Keywords direkt in die produktive CSV** – die Spalte speist auch das
  Material-Vokabular (`extractors/material.ts`). Ungeprüfte Wörter würden dort als
  „Material" erscheinen (siehe [`0030`](0030-material-filter-ausblenden.md)).

## Folgen

- Owner prüft den Entwurf: [`docs/setup/stlb-keywords.md`](../setup/stlb-keywords.md).
- Vor dem Einbau der Keywords muss das Material-Vokabular von den LB-Keywords
  getrennt werden (sonst „Heizkörper", „Leuchte" als Material).
