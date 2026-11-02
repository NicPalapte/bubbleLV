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

## Regeln bauen (Reiter „Regeln“)

Ergebnis: Eine Regel färbt den Langtext ein, zeigt einen Hinweis in „Prüfung“, schlägt
Verbindungen zwischen Positionen vor oder schlägt Stellen im Begleit-PDF vor.
Hintergrund: Entscheidungen 0081 und 0089.

1. Logo-Menü → Admin-Werkzeuge → Reiter „Regeln“ → „+ Neue Regel“.
   Oder: im Langtext Text markieren, Rechtsklick → „Als Regel…“.
2. Bausteine zusammenstellen: Begriff, Menge, Norm, Wortliste, Einheit oder Angabe aus der
   Datei (Menge, Einheit, Positionsart). Dazu Abstand und Text wählen. Unten stehen sofort
   die Treffer.
3. Bei „Dann“ die Wirkung wählen: hervorheben, Prüfhinweis oder Positionen verbinden.
   Beim Prüfhinweis: Art, Gewicht und Text. Einen Norm-Verweis nur eintragen, wenn du ihn
   geprüft hast; dann „Verweis geprüft“ anhaken.
4. Schalter oben rechts anschalten. Neue Regeln starten aus; erst angeschaltet wirkt die
   Regel im LV.
5. Bei „Positionen verbinden“: Vorschläge mit „Ja“ oder „Nein“ beantworten, im Editor oder
   in der Positionskarte unter „Verbunden“.

Grundstock-Regeln (gelten für alle Firmen):

- **Abschalten:** Schalter in der Liste. Gilt nur in diesem Browser.
- **Ändern:** „Als eigene kopieren“. Die Kopie ist an, das Original wird abgeschaltet. In
  der Kopie lassen sich auch Werte eingebauter Prüfungen ändern, z. B. wie viele
  Betonstahl-Positionen ein Hinweis nennt.
- Was im Grundstock schon aus ist (z. B. Regeln ohne fertige Logik), lässt sich nicht
  anschalten.

Regel in den Grundstock übernehmen (gilt dann für alle):

1. „Regeln exportieren“. Du bekommst die Datei `regeln.json` mit deinen eigenen Regeln.
2. Die gewünschten Einträge in `docs/domain/reference/regeln.json` kopieren und dort
   `"geltung": "allgemein"` setzen.
3. Datei committen.

Lässt du das aus, gilt die Regel nur in deinem Browser. Löschst du die Website-Daten,
ist sie weg; vorher „Regeln exportieren“ sichert sie. Mit „Regeln importieren“ holst du
eine `regeln.json` wieder herein; vorhandene Regeln werden dabei nie überschrieben.

## Passwort ändern

Das Passwort ist ein Sichtschutz, kein echter Schutz: Die App hat keinen Server, wer
den Code liest, kommt vorbei. Es steht deshalb nicht im Repo, nur sein Fingerabdruck
(SHA-256).

1. Fingerabdruck des neuen Passworts erzeugen, z. B. im Terminal:
   `printf '%s' 'NeuesPasswort' | shasum -a 256`
2. Den Wert in `frontend/src/state/admin.tsx` bei `ADMIN_PASSWORD_SHA256` eintragen.
   Die Tests brauchen keine Änderung.
