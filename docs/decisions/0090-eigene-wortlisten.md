# 0090 – Eigene Wortlisten

- **Status:** akzeptiert
- **Datum:** 2026-11-02
- **Betrifft:** Reiter „Wortlisten“ (`frontend/src/components/admin/WordListsTab.tsx`),
  Wortlisten (`frontend/src/lib/rules/wordLists.ts`, `wissen.ts`), Admin-Zustand
  (`frontend/src/state/admin.tsx`), Speicher (`frontend/src/lib/persist/lastLv.ts`), Prüfung
  im Viewer (`frontend/src/state/ViewerProvider.tsx`, `frontend/src/lib/check/index.ts`)
- **Ergänzt:** [0085](0085-ein-regelformat-fuer-alles.md) (Schritt 5b von 5),
  [0089](0089-regeleditor-fuer-alle-regeln.md)

## Worum geht's

- Regeln suchen mit Wortlisten (z. B. Risiko-Formulierungen, Hersteller, Verweise auf
  Anlagen). Die Listen lagen nur als CSV im Repo; ändern ging nur über einen Commit.
- Owner hat im Plan entschieden: Wortlisten bleiben CSV und werden zusätzlich in der App
  bearbeitbar. Das Mockup hat er am 02.11.2026 freigegeben („Wortlisten sind so ok“).

## Entscheidung

- **Neuer Reiter „Wortlisten“** in den Admin-Werkzeugen, neben „Regeln“.
- **Grundstock-Listen** kommen weiter aus den CSV unter `docs/domain/reference/`. Ihre Wörter
  lassen sich nur abschalten (Klick auf das Wort), eigene Wörter kommen dazu.
- **Eigene Listen:** anlegen, umbenennen, löschen. Kennung `eigene-<name>`. Sie stehen im
  Regeleditor beim Baustein „Wortliste“ zur Auswahl.
- **Gespeichert** als Liste von Einträgen (eigene Liste · eigenes Wort · Wort aus) in der
  IndexedDB, Schlüssel `wortlisten`, unabhängig von der Datei. Kein LV-Text darin.
- **Alle Regeln suchen mit denselben Listen:** `useAdmin().context` geht an Langtext,
  Treffer-Vorschau, Verbindungen und Prüfung. Ohne eigene Einträge ist es genau der
  Grundstock.
- **Prüfung:** Der Viewer rechnet die Grundstock-Prüfregeln neu, die eine geänderte Liste
  benutzen (auch unter „nicht“), zusammen mit den eigenen. Ihr neues Ergebnis ersetzt das aus
  dem Laden an derselben Stelle (`mergeChecks`). Wie in 0089: im Effekt, verzögert, nie im
  Render.
- **Ausnahme `bieterangabe` und `offenes-feld`:** Diese Listen wirken schon beim Einlesen
  (Klassifizierung im Worker). Änderungen gelten dort noch nicht; der Reiter sagt das.
- **„Wortlisten exportieren“** gibt eine `wortlisten.csv` mit den geänderten und eigenen
  Listen, im Format der Datei im Repo.

## Verworfene Alternativen

- **Grundstock-Wörter in der App ändern oder löschen:** Dann gäbe es zwei Wahrheiten für den
  Grundstock. Wie bei den Regeln (0089): nur abschalten, für alle gilt es erst nach Eintrag
  in die CSV.
- **Jede Liste als eigenen Datensatz speichern:** Eine flache Liste nutzt dieselbe
  Speichermechanik wie eigene Regeln und abgeschaltete Grundstock-Regeln.
- **Prüfung bei jeder Wortänderung komplett neu:** zu langsam bei 10.000 Positionen (0089).

## Folgen

- Owner: Eigene Wörter wirken sofort in diesem Browser. Für alle übernehmen: „Wortlisten
  exportieren“, Zeilen in die passende CSV unter `docs/domain/reference/` übernehmen,
  committen. Ohne das bleiben sie nur in diesem Browser; Website-Daten löschen nimmt sie mit.
- Plan „Ein Regelformat“ damit komplett (Schritt 5 von 5).
