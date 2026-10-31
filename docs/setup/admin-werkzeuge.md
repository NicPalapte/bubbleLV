# Admin-Werkzeuge: Begriffe lernen und Regeln bauen

Ergebnis: Du markierst wichtige Begriffe im Langtext (Material, Maße, Wichtig). Jeder
gelernte Begriff ist eine eigene Regel. Erst gilt sie nur in deinem Browser, nach dem
Übernehmen ins Repo für alle.
Hintergrund: [Entscheidung 0053](../decisions/0053-marker-verlauf-und-gelernte-begriffe.md),
[0088](../decisions/0088-gelernte-begriffe-als-regeln.md).

## Anmelden

1. Logo oben links → **Admin-Werkzeuge** → Passwort → **Öffnen**.
2. Neben dem Logo steht jetzt **Admin**. Nach einem Neuladen ist das wieder weg.

## Begriff lernen

1. Position öffnen, im Langtext einen Begriff mit der Maus markieren.
2. Kategorie wählen: **Material** (grün), **Maße** (violett), **Wichtig** (rot) oder
   **Nicht hervorheben** (nimmt eine falsche Markierung weg).
3. Enthält der Begriff eine Zahl, kannst du **als Muster** lernen: „C30/37“ wird
   „C#/#“ und trifft jede Festigkeitsklasse.

Der Begriff wirkt sofort, in jeder Datei, aber **nur in diesem Browser**. Er steht als
eigene Regel im Reiter „Regeln“ unter „Eigene Regeln“. Dort kannst du ihn ändern,
abschalten oder löschen. Begriffe aus älteren Versionen zieht die App beim Start einmal
dorthin um.

Für alle übernehmen: wie jede Regel, siehe unten „Regel in den Grundstock übernehmen“.

## Regeln bauen (Reiter „Regeln“, Prototyp)

Ergebnis: Eine aktive Regel färbt den Langtext ein oder schlägt Verbindungen zwischen
Positionen vor. Hintergrund: Entscheidung 0081.

1. Logo-Menü → Admin-Werkzeuge → Reiter „Regeln“ → „+ Neue Regel“.
   Oder: im Langtext Text markieren, Rechtsklick → „Als Regel…“.
2. Bausteine zusammenstellen, Abstand und Text wählen. Unten stehen sofort die Treffer.
3. Oben auf „Aktiv“ stellen. Erst dann wirkt die Regel im LV.
4. Bei „Positionen verbinden“: Vorschläge mit „Ja“ oder „Nein“ beantworten, im Editor oder
   in der Positionskarte unter „Verbunden“.

Regel in den Grundstock übernehmen (gilt dann für alle):

1. „regeln.json herunterladen“.
2. Die gewünschten Einträge in `docs/domain/reference/regeln.json` kopieren und dort
   `"geltung": "allgemein"` setzen.
3. Datei committen.

Lässt du das aus, gilt die Regel nur in deinem Browser. Löschst du die Website-Daten,
ist sie weg; vorher „regeln.json herunterladen“ sichert sie.

## Passwort ändern

Das Passwort ist ein Sichtschutz, kein echter Schutz: Die App hat keinen Server, wer
den Code liest, kommt vorbei. Es steht deshalb nicht im Repo, nur sein Fingerabdruck
(SHA-256).

1. Fingerabdruck des neuen Passworts erzeugen, z. B. im Terminal:
   `printf '%s' 'NeuesPasswort' | shasum -a 256`
2. Den Wert in `frontend/src/state/admin.tsx` bei `ADMIN_PASSWORD_SHA256` eintragen.
   Die Tests brauchen keine Änderung.
