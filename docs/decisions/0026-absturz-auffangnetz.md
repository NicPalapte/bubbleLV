# 0026 – Ein Absturz zeigt eine Seite, keine weiße Fläche

- **Status:** akzeptiert
- **Datum:** 2026-09-23
- **Betrifft:** Frontend, Public Beta (Issue #73), Meldetext aus `lib/export/issueLink.ts`

## Worum geht's

Wirft eine Komponente beim Zeichnen einen Fehler, hängt React den ganzen Baum aus:
der Nutzer sieht eine weiße Seite. Seine geladene Datei ist damit weg — Bubble
speichert nichts —, er muss sie neu hineinziehen und alle Filter neu setzen. Und er
kann nicht einmal melden, was passiert ist, weil der Melde-Knopf mit verschwunden ist.

## Entscheidung

- **Zwei Netze statt einem** (`components/common/ErrorBoundary.tsx`):
  - eines um die ganze App (`App.tsx`),
  - eines um die aktive Ansicht (`pages/ViewerPage.tsx`), mit dem Ansichtsmodus als
    `key` — ein Ansichtswechsel beginnt also mit einem frischen Netz.
- **Das äußere Netz liegt innerhalb des `ViewerProvider`.** Damit übersteht der
  geladene Stand einen Absturz: „Ansicht neu aufbauen" zeichnet neu, statt neu zu laden.
- **Die Fehlerseite sagt drei Dinge:** dass es ein Fehler im Programm ist und nicht in
  der Datei, dass die Datei den Browser nicht verlassen hat, und was genau schiefging
  (`name: message`).
- **Melden geht aus der Fehlerseite heraus** — dasselbe Fenster wie sonst. Die
  Fehlermeldung steht im **bearbeitbaren** Feld „Was ist passiert?", nicht im
  schreibgeschützten Meldetext.
- **Der Stacktrace geht nur in die Konsole des Nutzers**, nie in den Meldetext.
- **Der Bau-Stand hat eine Quelle** (`lib/version.ts`): Kopfleiste und Meldetext lesen
  denselben Wert.

## Warum

- Eine weiße Seite ist der teuerste aller Fehlerzustände: sie verliert die Arbeit des
  Nutzers **und** die Information, woran es lag.
- Das feinere Netz je Ansicht ist der eigentliche Gewinn. Stürzt der Graph ab, bleiben
  Tabelle, Filter und Suche bedienbar — das LV ist weiter lesbar, und genau dafür gibt
  es Bubble.
- **Die Fehlermeldung gehört ins bearbeitbare Feld.** Der Meldetext sagt zu: „Aus
  der geladenen Datei steht in dieser Meldung nichts." Diese Zusage gilt für alles,
  was Bubble selbst beiträgt — für eine Fehlermeldung aus fremdem Code kann sie
  niemand garantieren (ein künftiges `throw new Error(\`Ungültige Menge ${menge}\`)`
  genügte). Im schreibgeschützten Text wäre sie unentfernbar; im Beschreibungsfeld
  liest der Nutzer sie und kann sie löschen. Gefunden hat das der Review-Agent an
  der ersten Fassung dieses PRs.
- **Kein Stacktrace in der Meldung:** ein Stacktrace kann Werte tragen, die beim
  Absturz in der Zeile standen — Positionstexte, Mengen, Preise. Die Meldung eines
  Programmfehlers kann das nicht. Dieselbe Linie wie
  [`0022`](0022-export-und-druck-ohne-request.md) und
  [`0024`](0024-fehler-melden-ohne-konto.md): was hinausgeht, steht sichtbar da.
- **Der Stand gehört auf den Bildschirm** (Issue #71): „bei mir geht X nicht" lässt
  sich nicht einordnen, wenn niemand weiß, welcher Stand lief. Stünde er an zwei
  Stellen im Code, könnte der Nutzer etwas anderes lesen, als in seiner Meldung landet.

## Verworfene Alternativen

- **Nur ein Netz um die ganze App** – jeder Absturz nähme die Kopfleiste mit, obwohl
  meist nur eine Ansicht betroffen ist.
- **Netz außerhalb des Providers** – der Neuaufbau verlöre die geladene Datei; genau
  das, was die weiße Seite schon tat.
- **Stacktrace in die Meldung, „zur besseren Analyse"** – siehe oben.
- **Fehlermeldung in den festen Meldetext, Zusage entsprechend abschwächen** – die
  Zusage ist das Kernstück des Fensters; eine Einschränkung darin wöge schwerer als
  der Umweg über das Beschreibungsfeld.
- **Meldetext bearbeitbar machen** – dann könnten die drei Wege (Kopieren, Mail,
  Issue) auseinanderlaufen; außerdem soll sichtbar bleiben, was Bubble selbst
  beiträgt.
- **`window.onerror` statt Auffangnetz** – meldet den Fehler, repariert die Anzeige
  aber nicht: die Seite bliebe weiß.
- **Automatisch neu laden nach einem Absturz** – verliert die Datei und verbirgt den
  Fehler; bei einem dauerhaften Fehler entstünde eine Schleife.

## Folgen

- Für den Repo-Owner ändert sich nichts an der Einrichtung.
- In der Kopfleiste steht rechts `BETA · <Stand>`, auf der Startseite zusätzlich das
  Bau-Datum. In CI kommt der Stand aus `GITHUB_SHA`, lokal steht „dev".
