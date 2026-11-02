# 0089 – Regeleditor für alle Regeln

- **Status:** akzeptiert
- **Datum:** 2026-11-02
- **Betrifft:** Regeleditor (`frontend/src/components/admin/RulesTab.tsx`,
  `RuleEditor.tsx`, `RuleSwitch.tsx`), Admin-Zustand (`frontend/src/state/admin.tsx`),
  Speicher (`frontend/src/lib/persist/lastLv.ts`), Prüfung im Viewer
  (`frontend/src/state/ViewerProvider.tsx`, `frontend/src/lib/check/index.ts`)
- **Ergänzt:** [0085](0085-ein-regelformat-fuer-alles.md) (Schritt 5a von 5),
  [0081](0081-regeleditor-und-regelformat.md)

## Worum geht's

- Nach Schritt 1–4 sind Hervorhebungen, Prüfhinweise, Verbindungen und PDF-Vorschläge
  Regeln im Format `bubble-rule-v1`. Der Editor konnte aber nur Begriff/Menge/Norm und
  „hervorheben“ oder „verbinden“ bearbeiten, alles andere nur lesen.
- Owner hat das Mockup am 02.11.2026 freigegeben, mit drei Änderungen: Schalter an jeder
  Regel, kein „Entwurf“, Knöpfe „Regeln importieren/exportieren“.

## Entscheidung

- **Liste nach Wirkung gruppiert:** Hervorheben · Prüfhinweise · Verbindungen ·
  PDF-Vorschläge, mit Suche. Grundstock und eigene Regeln stehen gemischt; eigene tragen das
  Label „eigene“, gelernte Begriffe (0088) „gelernt“.
- **Jede Regel hat einen Schalter an/aus.** Den Status „Entwurf“ zeigt der Editor nicht mehr.
  Eine neue Regel startet aus; die Treffer-Vorschau zeigt sie trotzdem. Alte Entwürfe gelten
  als aus. Das Format behält `entwurf`, damit ältere Dateien lesbar bleiben.
- **Grundstock-Regeln:** nur abschalten oder „Als eigene kopieren“. Die Kopie ist an und
  ersetzt das Original: Das Original wird dabei abgeschaltet. Was schon im Grundstock aus ist
  (z. B. V8–V10 ohne Logik), lässt sich nicht anschalten, nur kopieren.
- **Abgeschaltete Grundstock-Regeln** stehen als Liste ihrer Kennungen in der IndexedDB,
  Schlüssel `grundstock-aus`, unabhängig von der Datei. `useAdmin().rules` liefert sie mit
  Status `aus` — Langtext, Prüfung, Verbindungen und Dokument lassen sie damit weg.
- **Neue Bausteine im Editor:** Wortliste, Einheit (Einheiten-Gruppe), Angabe (Menge,
  Einheit, Positionsart aus der Datei). Eingebaute Bausteine bleiben fest; in einer eigenen
  Kopie sind ihre Werte änderbar.
- **Ausnahme Punktreihe (V7):** Ihr Wert wirkt schon beim Einlesen der Datei
  (Klassifizierung im Worker). Der Editor zeigt ihn, ändern geht noch nicht.
- **Neue Wirkung im Editor: Prüfhinweis.** Art, Gewicht, Text, Norm-Verweis freiwillig. Ein
  Verweis gilt als „zu bestätigen“, bis man „Verweis geprüft“ anhakt. Eine Vorschau zeigt,
  wie der Hinweis in „Prüfung“ erscheint.
- **Eigene Prüfhinweise in „Prüfung“:** Der Worker prüft beim Laden nur mit dem Grundstock.
  Der Viewer nimmt danach abgeschaltete Grundstock-Regeln aus dem Ergebnis und rechnet nur
  die eigenen Prüfregeln dazu (`mergeChecks`). Das läuft im Effekt, 250 ms nach der letzten
  Änderung, nie im Render.
- **Import/Export:** Knöpfe heißen „Regeln importieren“ und „Regeln exportieren“; die Datei
  bleibt `regeln.json` mit den eigenen Regeln.

## Verworfene Alternativen

- **Prüfung bei jeder Regeländerung komplett neu im Viewer:** gemessen 250 ms bei 10.000
  Positionen, über dem Ziel „Fenster öffnen < 200 ms“. Nur eigene Regeln neu rechnen bleibt
  darunter (Test `frontend/tests/perf/regeln.test.ts`).
- **Prüfung im Worker neu rechnen:** Der Worker hat den Baum nach dem Laden nicht mehr; ihn
  erneut zu schicken kostet mehr als die eigene Rechnung.
- **Abgeschaltete Grundstock-Regeln als eigene Regel mit gleicher Kennung speichern:** Sie
  landeten dann im Export und überschrieben den Grundstock — gegen 0081 (Grundstock-Kennungen
  geschützt).
- **„Entwurf“ behalten:** Owner wollte nur an/aus.

## Folgen

- Owner: Grundstock-Regeln schaltet man jetzt direkt in der Liste ab. Für alle übernehmen
  geht weiter über „Regeln exportieren“ und einen Eintrag in
  `docs/domain/reference/regeln.json`.
- Schritt 5b: Reiter „Wortlisten“ (eigene Wörter ergänzen, Grundstock-Wörter abschalten,
  eigene Listen).
