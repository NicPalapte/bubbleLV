# 0024 – Fehler melden ohne GitHub-Konto

- **Status:** akzeptiert
- **Datum:** 2026-09-23
- **Betrifft:** Frontend, WP-P (Schritt 6); ersetzt den GitHub-Teil von
  [`0017`](0017-keine-nutzungsmessung.md) nicht, sondern ergänzt ihn

## Worum geht's

Der Melde-Knopf führte direkt auf ein vorbefülltes GitHub-Formular. Wer kein
GitHub-Konto hat, landet dort auf der Anmeldeseite und kommt nicht weiter —
GitHub kennt keine anonymen Meldungen. Für ein Werkzeug, das Kalkulatoren und
AVA-Fachkräfte benutzen, ist das die Mehrheit: die Meldung ist verloren, und
der Fehler bleibt unbekannt.

## Entscheidung

- Der Knopf öffnet ein **Fenster mit der fertigen Meldung**, nicht mehr direkt
  GitHub.
- Wer will, tippt oben hinein, **was passiert ist**; der Text darunter wächst
  mit. Beide Wege tragen denselben Inhalt.
- Drei Wege hinaus:
  - **Text kopieren** — in die Zwischenablage, weiter per Mail, Chat oder
    Ticketsystem des eigenen Hauses.
  - **Als E-Mail öffnen** — `mailto:` mit Betreff und Text. **Ohne Empfänger**,
    solange kein Postfach existiert; die Adresse trägt der Absender selbst ein.
    Sobald es eines gibt, steht es an genau einer Stelle im Code
    (`MELDE_MAIL` in `frontend/src/lib/export/issueLink.ts`).
  - **Als GitHub-Issue** — der bisherige Weg, beschriftet mit „Konto nötig".
- **Unverändert:** aus der geladenen Datei steht nichts in der Meldung. Kein
  Dateiname, keine OZ, kein Positionstext, keine Menge, kein Preis. Nur
  Bubble-Stand, Ansicht, ob eine Datei geladen ist, Browser, Sprache und
  Fenstergröße.
- Verschickt wird nichts von selbst. Jeder Weg ist ein Knopfdruck, und der
  Nutzer sieht den Text vorher.

## Warum

- **Kein Weg braucht einen Server.** Die Zwischenablage ist lokal, `mailto:`
  übergibt an das Programm, das der Rechner für Mail eingerichtet hat, der
  GitHub-Link öffnet einen Tab. Die Regel „kein eigenes Backend"
  (.claude/CLAUDE.md) bleibt unangetastet.
- **Keine Adresse im Quelltext, solange keine gebraucht wird.** Eine
  Mailadresse in einer öffentlichen App findet jeder Spam-Sammler. Ein
  `mailto:` ohne Empfänger öffnet trotzdem eine fertige Nachricht.
- **Der Text ist sichtbar, bevor er das Haus verlässt.** Das ist der
  eigentliche Schutz: niemand muss dem Programm glauben, dass nichts
  Vertrauliches mitgeht — es steht da.
- **Die eigene Beschreibung gehört in dasselbe Feld wie die Technik.** Wer erst
  auf GitHub tippt, tippt bei jedem Weg woanders; so entsteht eine Meldung,
  egal wohin sie geht.

## Verworfene Alternativen

- **Formulardienst** (Google Forms, Typeform, eigener Endpunkt) – braucht einen
  Empfänger, also einen Server. Damit wäre die Grundregel des Produkts gebrochen,
  und die Meldung liefe über einen Dritten.
- **Nur den Hinweis „GitHub-Konto nötig" an den alten Knopf schreiben** – ehrlich,
  löst aber nichts: der Fehler bliebe unbekannt.
- **Mailadresse fest eintragen** – erst, wenn es ein Postfach dafür gibt. Die
  private Adresse des Betreuers gehört nicht in eine öffentliche App.
- **Automatisch senden** (ohne Zutun, im Hintergrund) – das wäre die
  Nutzungsmessung, die [`0017`](0017-keine-nutzungsmessung.md) abgelehnt hat.

## Folgen

- Für den Repo-Owner: **ein manueller Schritt offen** — ein Postfach für
  Meldungen anlegen und die Adresse in `MELDE_MAIL` eintragen. Solange das
  fehlt, öffnet der Mail-Knopf eine Nachricht ohne Empfänger; wer sie schickt,
  muss die Adresse kennen.
- Meldungen kommen ab jetzt auf drei Wegen herein, nicht mehr nur als Issue.
  Was per Mail oder Chat ankommt, trägt der Owner selbst als Issue nach, wenn
  es eines werden soll.
