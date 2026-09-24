# 0027 – Versionsnummer, Changelog und „Über diese App" hinter dem Logo

- **Status:** akzeptiert
- **Datum:** 2026-09-24
- **Betrifft:** Frontend, `CHANGELOG.md`, Issues #71 und #80

## Worum geht's

Bubble zeigte als Stand nur das Commit-Kürzel (`6aa1512`) — rechts in der Kopfleiste,
genau dort, wo der Platz am knappsten ist. Eine Nummer, mit der ein Nutzer etwas
anfangen kann („v0.1.0"), gab es nicht, und was sich zwischen zwei Ständen geändert
hat, stand nirgends.

## Entscheidung

- **Zwei Angaben, zwei Zwecke.** `v0.1.0` sagt, **welcher Stand** das ist; das
  Commit-Kürzel mit Datum sagt, **welcher Bau**. In der Meldung stehen beide:
  `- Bubble-Stand: v0.1.0 (6aa1512 · 24.09.2026)`.
- **Die Nummer kommt aus `frontend/package.json`** und wird beim Bauen als
  `__APP_VERSION__` eingesetzt (`vite.config.ts` → `lib/version.ts`). Eine Quelle.
- **Semantic Versioning, erste Stelle bleibt `0`**, solange Bubble Beta ist: mittlere
  Zahl für neue Funktionen, letzte für Korrekturen.
- **`CHANGELOG.md` im Wurzelverzeichnis**, in der Sprache der Anwendung, neueste
  Version oben.
- **„Über diese App" öffnet sich hinter dem Logo** (`components/layout/AboutMenu.tsx`):
  Version, Stand, „Was ist neu", „Fehler melden" und die Plätze für Impressum und
  Datenschutz. Das `▾` am Logo zeigt, dass sich dort etwas öffnet.
- **„Fehler melden" zieht aus dem Menü „Mitnehmen" hierher.** Eine Meldung ist kein
  Export.
- **Das Stand-Schild rechts in der Kopfleiste entfällt.**

## Warum

- **Ein Commit-Kürzel ordnet nichts ein.** Für den Repo-Owner ist `6aa1512` eindeutig,
  für einen Kalkulator ist es eine zufällige Zeichenfolge. „v0.1.0, 24.09.2026" trägt
  über ein Gespräch hinweg.
- **Die Kopfleiste ist voll.** Gemessen bei 1440 px: dort passte schon vor dem Schild
  kein einziger Facetten-Knopf mehr hinein, das Wort „FILTER" wurde abgeschnitten
  (Issue #80: „kein Platz in der Topleiste"). Was selten gebraucht wird, darf dort
  keinen Dauerplatz haben — auffindbar muss es trotzdem sein, und am Logo suchen
  Nutzer so etwas.
- **Impressum und Datenschutz stehen als „folgt" da, nicht als Link.** Ein Link auf
  eine leere Seite wäre schlechter als der ehrliche Hinweis; die Texte hängen an
  Angaben des Betreibers (#75, #76).
- **Der Changelog liegt im Repo, nicht in der App.** Er wächst mit jeder Version; im
  Bundle würde er mitwachsen, ohne dass ihn jemand im Alltag liest. Der Eintrag
  „Was ist neu" öffnet ihn auf GitHub — erst auf Klick, in einem neuen Tab.

## Verworfene Alternativen

- **Versionsnummer im Code statt in `package.json`** – zwei Stellen, die auseinander
  laufen können.
- **Nur die Versionsnummer, kein Commit** – dann trifft eine Meldung den Stand nicht
  mehr genau; zwischen zwei Veröffentlichungen liegen viele Bauten.
- **Changelog als eigene Ansicht in der App** – kostet Bundle und Pflege; Bubble ist
  ein LV-Werkzeug, kein Blog.
- **Stand-Schild in der Kopfleiste behalten** – kostet dauerhaft Platz, den Filter und
  Ansichten brauchen.
- **Eigene Seiten für Impressum/Datenschutz schon jetzt anlegen** – ohne Inhalt wären
  es leere Seiten mit rechtlichem Anschein.

## Folgen

- Vor jeder Veröffentlichung: Nummer in `frontend/package.json` erhöhen und einen
  Abschnitt in `CHANGELOG.md` ergänzen. Ohne das zeigt die App weiter die alte Nummer.
- Sobald Impressum und Datenschutz stehen, ersetzen sie die beiden „folgt"-Zeilen.
