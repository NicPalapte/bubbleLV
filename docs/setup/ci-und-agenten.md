# Einrichtung: Automatik im Repo

Diese Seite ist für den Repo-Owner. Sie beschreibt, was **einmalig von Hand** eingestellt
werden muss, damit Review-Agent und PR-Previews laufen – und wie man beides wieder stoppt.

Was danach automatisch passiert:

| Wann                     | Was                                                              |
|--------------------------|------------------------------------------------------------------|
| Pull Request geöffnet     | App wird gebaut, Preview-Link als Kommentar, Code-Review kommentiert |
| Push in den Pull Request  | Preview aktualisiert, Review erneut (max. 3× automatisch)          |
| Pull Request geschlossen  | Preview wird gelöscht                                            |
| Merge nach `main`         | Live-Seite wird neu veröffentlicht                                |

**Preview nur bei Code-Änderungen:** Gebaut wird nur, wenn der Pull Request etwas unter
`frontend/` ändert. Ein PR, der ausschließlich Doku anfasst, bekommt keinen Preview-Link –
das ist kein Fehler. Der Review-Agent und die übrige CI laufen weiterhin bei jedem PR.

---

## Schritt 1 – Zugang für den Review-Agenten anlegen

Ohne diesen Schritt läuft alles außer dem Review. Der Review-Workflow bricht dann nicht
ab, sondern überspringt sich selbst mit einem Hinweis – Pull Requests bleiben grün.

1. Im Terminal (dort, wo Claude Code installiert ist) ausführen:
   ```bash
   claude setup-token
   ```
   Der Befehl öffnet den Browser, nach der Anmeldung erscheint ein langer Token-Text.
   Diesen kopieren. Der Token gehört zum vorhandenen Claude-Abo – es entstehen keine
   zusätzlichen API-Kosten.
2. Auf GitHub: **Settings → Secrets and variables → Actions → New repository secret**
3. Eintragen:
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Secret: der kopierte Token
4. Speichern.

> Der Token läuft nach einiger Zeit ab. Wenn der Review-Schritt plötzlich mit einem
> Anmeldefehler abbricht: Schritt 1 wiederholen und das Secret überschreiben.

---

## Schritt 2 – GitHub Pages auf den Branch umstellen

Das ist die Voraussetzung für die Previews. **Reihenfolge beachten**, sonst zeigt die
Seite kurzzeitig einen Fehler:

1. Erst den Branch erzeugen lassen: **Actions → Deploy to GitHub Pages → Run workflow**
   (auf `main`). Warten, bis der Lauf grün ist. Danach existiert der Branch `gh-pages`.
2. Dann **Settings → Pages → Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **`gh-pages`** · Ordner: **`/ (root)`**
   - Speichern.
3. Nach ein paar Minuten prüfen: <https://nicpalapte.github.io/bubbleLV/>

Was hier passiert: Bisher hat GitHub den fertigen Build direkt aus dem Workflow
übernommen. Dabei kann immer nur *ein* Stand veröffentlicht sein. Ab jetzt liegen alle
Stände als Dateien in einem Branch – der Live-Stand im Hauptverzeichnis, jede Preview in
einem eigenen Unterordner.

---

## Schritt 3 – Schreibrechte für Workflows prüfen

Nur nötig, falls der Preview-Workflow mit „Permission denied“ abbricht:

- **Settings → Actions → General → Workflow permissions**
- auf **Read and write permissions** stellen, speichern.

---

## Schritt 4 – Einmal ausprobieren

1. Kleinen Test-Pull-Request öffnen. Er muss etwas unter `frontend/` ändern, sonst
   entsteht keine Preview – z. B. eine Zeile in `frontend/src/App.tsx`.
2. Erwartung im PR:
   - Kommentar mit dem Preview-Link (`.../pr-preview/pr-<nummer>/`)
   - Kommentare des Review-Agenten, falls er etwas findet
   - Kommentar mit dem Zählerstand „Automatische Code-Reviews: 1 von 3 verbraucht“
3. PR schließen → Preview verschwindet wieder.

---

## Im Alltag

**Noch ein Review anfordern (Budget aufgebraucht)**
Kommentar in den PR schreiben: `@claude review`. Diese Läufe zählen nicht mit.

**Zähler zurücksetzen**
Den Kommentar mit dem Zählerstand löschen. Danach stehen wieder 3 automatische Reviews
zur Verfügung.

**Review für einen einzelnen PR aussetzen**
PR auf *Draft* / Entwurf setzen. Entwürfe werden nicht automatisch geprüft.

**Automatik komplett stoppen**
**Actions →** Workflow in der linken Liste auswählen **→ „…“ → Disable workflow**.
Betrifft nur den gewählten Workflow, der Rest läuft weiter.

**Kosten im Blick behalten**
Jeder Review-Lauf verbraucht Kontingent des Claude-Abos. Kleine Änderungen laufen
automatisch auf dem günstigen Modell, größere und alles an Parser, Klassifizierung oder
Workflows auf dem starken Modell. Die getroffene Wahl steht im Log des Laufs unter
*Actions → Claude PR Review → Modell nach Umfang und Risiko wählen*.

---

## Wenn etwas nicht klappt

| Symptom                                          | Wahrscheinliche Ursache                                       |
|--------------------------------------------------|---------------------------------------------------------------|
| Kein Review, im Lauf steht „Review übersprungen" | Secret `CLAUDE_CODE_OAUTH_TOKEN` fehlt → Schritt 1            |
| Review-Schritt bricht mit Anmeldefehler ab       | Token abgelaufen → Schritt 1 wiederholen                      |
| Preview-Link führt auf eine leere weiße Seite    | Pages-Quelle noch nicht auf `gh-pages` umgestellt → Schritt 2 |
| Preview-Workflow: „Permission denied“            | Schreibrechte für Workflows → Schritt 3                       |
| Live-Seite bleibt auf altem Stand                | Pages-Quelle noch nicht umgestellt → Schritt 2                |
| Kein Review bei einem PR aus einem fremden Fork  | So gewollt: Fork-PRs bekommen weder Review noch Preview       |
| Kein Preview-Link am Pull Request                | So gewollt, wenn der PR nur Doku ändert – siehe Tabelle oben  |

Hintergrund und Begründungen: [`docs/decisions/`](../decisions/README.md).
