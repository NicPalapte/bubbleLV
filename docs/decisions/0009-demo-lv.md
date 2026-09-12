# 0008 – Demo-LV in der App

- **Status:** akzeptiert
- **Datum:** 2026-09-11
- **Betrifft:** Frontend (Startbildschirm), Auslieferung

## Worum geht's

Wer die Seite zum ersten Mal öffnet, braucht eine GAEB-Datei, um überhaupt etwas zu
sehen. Zum Zeigen und schnellen Ausprobieren ist das eine Hürde. Der Startbildschirm
bekommt deshalb einen zweiten Knopf: **Demo-LV laden**.

## Entscheidung

- Die frei verfügbare **BVBS-Musterdatei** (GAEB DA XML 3.3, 28 Positionen) wird mit der
  App ausgeliefert: `frontend/src/assets/demo/bvbs-gaeb-musterdatei.x83`.
- Sie wird **erst beim Klick** geholt (`?url`-Import, eigenes Asset im Bundle) — sie
  liegt also nicht im Start-Bundle jedes Besuchers.
- Der Ladeweg ist **derselbe** wie bei einer gewählten Datei: `loadLvFromBytes()`, inkl.
  Worker-Schwelle und Fehlermeldungen. Kein zweiter Pfad durch die Pipeline.
- Die Datei liegt **zusätzlich** zu `frontend/tests/fixtures/gaeb-xml-beispiel.x83` im
  Repo, nicht statt ihr.

## Warum

- **Der `fetch` geht an die eigene Auslieferung**, gleiche Herkunft wie die App. Er
  schickt nichts nach draußen und holt keine Fachdaten von irgendwo — die Regel „kein
  Request, der Fachdaten irgendwohin schickt" bleibt unberührt. Dasselbe gilt für
  Webfonts und Bundle-Chunks.
- **Bytes statt Text:** Über `fetch(...).arrayBuffer()` kommt die Datei so beim Parser
  an, wie eine hochgeladene auch ankäme — das Encoding liest der Parser aus der
  XML-Deklaration. Ein Text-Import (`?raw`) würde still eine UTF-8-Annahme einbauen.
- **Zwei Kopien mit Absicht:** Die Fixture gehört den Parser-Tests und darf sich für
  einen Testfall ändern. Das Demo-LV ist ausgelieferter Inhalt und muss stabil bleiben.
  Ein gemeinsamer Pfad würde beides koppeln.

## Verworfene Alternativen

- **Datei als Text ins Bundle** (`?raw`) – rund 100 kB in jedem Erstaufruf, auch für
  alle, die den Knopf nie drücken, plus die stille UTF-8-Annahme.
- **Datei von einer fremden Adresse laden** – wäre ein Fremdaufruf und würde die App an
  eine Quelle binden, die wir nicht kontrollieren.
- **Fixture direkt importieren** (`../../tests/fixtures/...`) – Testdaten im
  Auslieferungspfad; jede Änderung an einem Testfall würde die Demo verändern.

## Folgen

- Kommt eine andere Demo-Datei, muss sie **UTF-8 oder korrekt deklariert** sein und die
  Erwartungen in `frontend/tests/pipeline/loadDemoLv.test.ts` müssen mitgezogen werden —
  der Test prüft Positionszahl, Projektname und Umlaute.
- Für den Owner: nichts einzurichten. Der Knopf steht auf der Startseite.
