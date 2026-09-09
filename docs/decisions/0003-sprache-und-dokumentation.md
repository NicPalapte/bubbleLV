# 0003 – Sprach- und Dokumentationsregeln

- **Status:** akzeptiert
- **Datum:** 2026-09-09
- **Betrifft:** Zusammenarbeit mit dem Coding-Agenten, Dokumentation

## Worum geht's

Der Repo-Owner ist kein Software-Experte. Texte, die für ihn geschrieben werden, müssen
ohne Fachjargon verständlich sein. Gleichzeitig braucht der Coding-Agent präzise, klar
strukturierte Anweisungen. Beides sind unterschiedliche Zielgruppen – und bisher gab es
dafür keine Regel.

## Entscheidung

Zwei Textsorten mit je eigenen Regeln, festgehalten in `.claude/CLAUDE.md`:

**Für den Repo-Owner** (Antworten im Chat, PR-Beschreibungen, Commit-Texte, `README.md`,
`docs/decisions/`, `docs/setup/`):

- einfache Sprache, kurze Sätze, Stichpunkte statt Absätze
- Fachbegriffe nur, wenn nötig – dann beim ersten Mal in einem Halbsatz erklärt
- immer zuerst das Ergebnis, dann der Weg dorthin
- offen benennen, was der Owner selbst tun muss und was passiert, wenn er es nicht tut

**Für die KI** (`.claude/CLAUDE.md`, `.claude/commands/`, `.claude/skills/`,
Prompts in Workflows):

- knapp und eindeutig, Regeln als Aufzählung, keine Erzählform
- absolute Dateipfade und exakte Symbolnamen statt Umschreibungen
- Verbote klar als Verbot formulieren, dazu die erlaubte Alternative
- keine Höflichkeitsfloskeln, keine Wiederholungen

Zusätzlich: Weichenstellungen werden in `docs/decisions/` festgehalten – eine Datei pro
Entscheidung, feste Gliederung, Übersichtstabelle im Index.

## Warum

- Erklärtexte und KI-Anweisungen ziehen in verschiedene Richtungen: einmal Verständnis,
  einmal Eindeutigkeit. Ein gemeinsamer Stil wäre für beide Seiten schlechter.
- Ein Vorgehen, das nirgends steht, wird beim nächsten Mal anders gemacht – gerade wenn
  abwechselnd Mensch und KI am Repo arbeiten.
- Eine Datei pro Entscheidung bleibt lesbar und ist für die KI gezielt auffindbar;
  eine wachsende Sammeldatei wird beides nicht.

## Verworfene Alternativen

- **Nur ein CHANGELOG** – hält fest, *was* geändert wurde, verliert aber das *Warum*.
- **Alle Entscheidungen in einer Datei** – anfangs bequem, nach 20 Einträgen unlesbar.
- **Ein einziger Sprachstil für alles** – entweder zu technisch für den Owner oder zu
  schwammig für die KI.

## Folgen

- `.claude/CLAUDE.md` enthält den Abschnitt „Sprache & Zielgruppen“; er gilt für jede
  Antwort und jeden erzeugten Text.
- Vor dem Abschluss einer Aufgabe prüfen: braucht es einen Eintrag in `docs/decisions/`?
  Kriterien stehen in `docs/decisions/README.md`.
- Bestehende Dokumente werden nicht rückwirkend umgeschrieben, nur bei Anfassen angeglichen.
