# Admin-Werkzeuge: Begriffe im Langtext lernen

Ergebnis: Du markierst wichtige Begriffe im Langtext (Material, Maße, Wichtig). Erst
nur in deinem Browser, nach dem Übernehmen ins Repo für alle.
Hintergrund: [Entscheidung 0053](../decisions/0053-marker-verlauf-und-gelernte-begriffe.md).

## Anmelden

1. Logo oben links → **Admin-Werkzeuge** → Passwort → **Öffnen**.
2. Neben dem Logo steht jetzt **Admin**. Nach einem Neuladen ist das wieder weg.

## Begriff lernen

1. Position öffnen, im Langtext einen Begriff mit der Maus markieren.
2. Kategorie wählen: **Material** (grün), **Maße** (violett), **Wichtig** (rot) oder
   **Nicht hervorheben** (nimmt eine falsche Markierung weg).
3. Enthält der Begriff eine Zahl, kannst du **als Muster** lernen: „C30/37“ wird
   „C#/#“ und trifft jede Festigkeitsklasse.

Der Begriff wirkt sofort, in jeder Datei, aber **nur in diesem Browser**.

## Für alle übernehmen

1. Logo → **Admin-Werkzeuge** → **Als CSV herunterladen**. Die Datei enthält die
   Tabelle aus dem Repo plus deine Begriffe.
2. Die Datei ersetzt `docs/domain/reference/hervorhebungen.csv` (per Pull Request
   oder auf GitHub hochladen).
3. Danach gelten die Begriffe für alle. Die Einträge „von dir“ kannst du im Fenster
   mit ✕ löschen.

Lässt du Schritt 2 aus, sieht nur dein Browser die Begriffe. Löschst du die
Website-Daten des Browsers, sind sie weg.

Spalten der Tabelle:

| Spalte      | Inhalt                                                       |
| ----------- | ------------------------------------------------------------ |
| `begriff`   | Wort oder Muster (`#` = Zahl, `*` = Buchstaben/Ziffern)      |
| `kategorie` | `material` · `masse` · `wichtig` · `aus` (nicht hervorheben) |
| `bemerkung` | frei, wird nicht ausgewertet                                 |

## Passwort ändern

Das Passwort ist ein Sichtschutz, kein echter Schutz: Die App hat keinen Server, wer
den Code liest, kommt vorbei. Es steht deshalb nicht im Repo, nur sein Fingerabdruck
(SHA-256).

1. Fingerabdruck des neuen Passworts erzeugen, z. B. im Terminal:
   `printf '%s' 'NeuesPasswort' | shasum -a 256`
2. Den Wert in `frontend/src/state/admin.tsx` bei `ADMIN_PASSWORD_SHA256` eintragen.
   Die Tests brauchen keine Änderung.
