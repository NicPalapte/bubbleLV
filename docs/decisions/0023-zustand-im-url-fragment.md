# 0023 – Ansicht, Filter und Auswahl im URL-Fragment

- **Status:** akzeptiert
- **Datum:** 2026-09-22
- **Betrifft:** Frontend, WP-P (Schritt 2)

## Worum geht's

Wer in Bubble etwas gefunden hat, will es zeigen können: „schau dir die
Betonarbeiten in der Matrix an". Dafür muss ein Link die Ansicht und den Filter
mitbringen. Gleichzeitig gilt die harte Zusage des Produkts: **Fachdaten
verlassen den Browser nicht.** Ein Link ist genau die Stelle, an der man diese
Zusage aus Versehen bricht.

## Entscheidung

- Der Zustand steht im **Fragment** (alles hinter `#`), nicht in der Query.
- **Im Link stehen:** Ansicht, Suche, Facetten, Mengenbereich, Umgang mit
  Nicht-Treffern und die **OZ** der gewählten Position.
- **Nicht im Link:** Dateiname, Projektname, Kurz- oder Langtexte, Mengen,
  Preise, Prüf-Hinweise. Ein Link ohne dieselbe Datei ist nutzlos — so gewollt.
- Geschrieben wird mit `history.replaceState`, entprellt (300 ms).
- Gelesen wird **einmal je Session**, sobald die erste Datei geladen ist: der
  Link kommt vor der Datei, und erst nach dem Laden gibt es etwas zu filtern.
- **Eine neue Datei leert den Link.** Beim Schließen des LV und beim Import
  einer zweiten Datei verschwindet das Fragment; der alte Link wird nicht auf
  die neue Datei angewendet.
- **Beim Lesen wird alles geprüft.** Unbekannte Ansicht, erfundene Facette,
  verdrehter Mengenbereich: fällt weg, der Rest des Links gilt weiter.
- Findet sich die OZ in dieser Datei nicht, bleibt die Auswahl leer — Ansicht
  und Filter gelten trotzdem.

## Warum

- **Ein Fragment sendet der Browser nie an einen Server** — weder beim Aufruf
  noch im `Referer`. Selbst wenn die App irgendwann unter einer fremden Adresse
  liegt, bleibt der Zustand lokal. Eine Query (`?filter=…`) stünde dagegen in
  jedem Server-Log.
- **Die OZ ist das einzige Stück Datei im Link,** und sie ist der Preis dafür,
  dass „schau dir das hier an" überhaupt teilbar ist. Sie steht ohnehin in dem
  Satz, den man danebenschreibt.
- **`replaceState` statt `pushState`:** jeder Tastendruck in der Suche erzeugte
  sonst einen History-Eintrag, und die Zurück-Taste führte durch hundert
  Zwischenstände statt aus der App heraus.
- **Nur Abweichungen landen im Link.** Ein unveränderter Zustand ergibt ein
  leeres Fragment — die Adresszeile bleibt sauber, solange nichts eingestellt
  ist.
- **Geprüft wird beim Lesen, nicht beim Schreiben:** ein Link kann aus einer
  älteren Fassung der App stammen oder unterwegs beschädigt werden. Er darf die
  App nicht in einen Zustand bringen, den ihre Oberfläche nicht kennt.

## Verworfene Alternativen

- **Query-Parameter** (`?v=matrix`) – stünden in Server-Logs und im Referrer.
  Für ein Werkzeug, das Vergabeunterlagen zeigt, ist das ein Nein.
- **Den kompletten Zustand in den Link** (Auswahl im Vergleich, aufgeklappte
  Knoten, Spaltenbreiten) – der Link würde lang und unleserlich, und je mehr
  drinsteht, desto mehr Datei steckt darin.
- **Den Dateinamen mitschicken**, um beim Öffnen zu prüfen, ob die richtige
  Datei geladen wurde – der Dateiname ist ein Fachdatum („Angebot Müller GmbH
  Los 3.x84"). Wer den Link bekommt, weiß ohnehin, welche Datei gemeint ist.
- **`localStorage` statt Link** – verboten für Fachdaten (.claude/CLAUDE.md) und
  löst die Aufgabe nicht: geteilt werden kann er nicht.
- **`pushState` je Änderung** – siehe oben, macht die Zurück-Taste unbrauchbar.
- **Den Zustand in die Datei schreiben** – Bubble verändert die geladene Datei
  nie.

## Folgen

- Für den Repo-Owner ändert sich nichts an der Einrichtung.
- Die Adresszeile ändert sich beim Arbeiten. Wer einen Link kopiert, teilt
  seinen Blick auf das LV — die Datei muss der Empfänger selbst haben.
- Neue Datei im selben Tab: die Adresszeile fängt leer an. Filter und Auswahl
  aus dem alten Link greifen nicht auf die neue Datei über — ein Import
  ersetzt den kompletten Stand, auch den im Link.
