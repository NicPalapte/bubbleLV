# 0004 – Design-Kit bleibt JSX, App bleibt TSX

- **Status:** akzeptiert
- **Datum:** 2026-09-10
- **Betrifft:** Frontend, Design-System

## Worum geht's

Dieselben UI-Bausteine liegen zweimal im Repo: als `.jsx` im Design-Skill
(`.claude/skills/bubble-design/components/core/`) und als `.tsx` in der App
(`frontend/src/components/ui/`). Bisher stand nirgends, welche Fassung gilt.
Wer die falsche Datei änderte, sah keine Wirkung – und merkte es nicht.

## Entscheidung

- Die `.tsx` unter `frontend/src/components/ui/` sind die **gültige Fassung**.
  Was die App zeigt, wird dort geändert.
- Die `.jsx` im Skill sind **Vorlagen für Prototypen**. Sie laufen ohne Build-Schritt
  direkt im Browser – deshalb bleiben sie JavaScript.
- Ändert sich eine Vorlage, wandert die Änderung im selben Commit in die `.tsx` –
  oder die Commit-Nachricht sagt, warum nicht.
- Die `.tsx` weichen an drei Stellen bewusst ab (ARIA-Rollen in `DataTable`/`TreeRow`,
  eigenes `onToggle` in `TreeRow`, `type="button"` in `Chip`). Diese Abweichungen
  werden nicht zurückgebaut.
- Keine `.jsx` wird gelöscht, nur weil es eine `.tsx` dazu gibt.

## Warum

- Die Prototypen in `design/claude-design/` brauchen die JavaScript-Form. Sie laufen
  über Babel im Browser, ohne Bundler – TypeScript würde dort nie übersetzt.
- Beide Vorlagen-Sätze sind keine Altlast, sondern aktiv verlinkt (Stand 2026-09-10):
  - 16 Dateien unter `frontend/src/` nennen `design/claude-design/…` im Kopfkommentar
    als Quelle, dazu `docs/mvp-scope.md` und `docs/implementation-plan.md`.
  - 10 Dateien unter `frontend/src/components/ui/` nennen
    `.claude/skills/bubble-design/components/core/…`; `main.tsx` und `index.css`
    nennen zusätzlich `bubble-design/tokens/`. Dazu die Skills `wp4`/`wp6`.
  - Die beiden Mengen überschneiden sich nicht.
- Die Vorlagen kosten nichts. Sie liegen außerhalb von `tsconfig` und ESLint und
  landen nicht im ausgelieferten Bundle.
- Die App selbst ist damit weiterhin vollständig TypeScript – die Regel „strikte Types
  überall" bleibt unangetastet.

## Verworfene Alternativen

- **Die `.jsx` im Skill löschen und nur die `.tsx` behalten** – klingt aufgeräumt,
  nimmt dem Design-Skill aber die Grundlage: er könnte keine Prototypen mehr bauen.
  Außerdem liefen rund 26 Verweise in Code und Doku ins Leere.
- **Das Kit auf TypeScript umstellen** – die Prototypen laufen ohne Build-Schritt.
  TypeScript brächte dort keinen Nutzen, nur einen zusätzlichen Zwischenschritt.
- **Nichts festschreiben, im Einzelfall entscheiden** – genau daraus entstand das
  Problem. Die drei Abweichungen der `.tsx` waren ohne Notiz nicht als Absicht
  erkennbar.

## Folgen

- Für den Repo-Owner ändert sich nichts, es ist kein Handgriff nötig.
- Die Regeln stehen in `.claude/skills/bubble-design/components/USAGE.md`
  (Abschnitt „Source of truth") – dort schaut der Agent hin, bevor er das Kit anfasst.
- Die Inventar-Tabelle in derselben Datei nennt zu jedem Baustein die `.tsx` –
  oder den Grund, warum es keine gibt (`MemberAvatar`, `PackageTag`, `Checkbox`).
