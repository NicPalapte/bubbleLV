# 0055 – Positions-Hash und Datei-ID im Link

- **Status:** akzeptiert
- **Datum:** 2026-10-17
- **Betrifft:** `packages/core/src/hash/`, `buildTree`, geteilter Link
  (`frontend/src/lib/share/urlState.ts`, ergänzt 0023)

## Worum geht's

- Eine Position soll als Link teilbar sein. Wer dieselbe Datei hat, landet genau dort.
- Später sollen Änderungen zwischen zwei Fassungen nachvollziehbar sein: Text geändert,
  umnummeriert, neu oder entfallen.

## Entscheidung

- **Datei-ID:** die ersten 12 Zeichen des SHA-256 der Original-Bytes.
- **Je Position drei Teil-Hashes** (16 Zeichen): OZ · Text (Kurz- + Langtext) ·
  Menge + Einheit.
- **Positions-Hash** (10 Zeichen) aus den Teil-Hashes plus Positionsart. Bei zwei gleichen
  Positionen bekommt die zweite in Dateireihenfolge `-2`.
- Normiert: Leerraum zusammengefasst, Einheit klein und ohne Schlusspunkt.
- **Nicht im Hash:** Einheitspreis, Klassifizierung, Notizen. Damit teilen X83 und X84
  derselben Ausschreibung ihre Hashes.
- **Link:** `#lv=<Datei-ID>~pos=<Positions-Hash>`, wie bisher nur im Fragment.
  Alte Links mit `p=<OZ>` werden weiter gelesen und beim nächsten Schreiben ersetzt.
- Passt die Datei-ID nicht, der Hash aber schon: Position öffnen und sagen, dass der Link
  aus einer anderen Datei stammt.

## Warum

- Ein Inhalts-Hash verrät keinen Text, belegt aber „genau dieser Inhalt".
- Die Teil-Hashes erlauben den späteren Fassungsvergleich ohne die alte Datei:
  OZ gleich/Text anders = Text geändert, OZ anders/Text gleich = umnummeriert.
- Eigenes SHA-256 statt `crypto.subtle`: läuft synchron im Worker und auch ohne
  https (Dev-Server im LAN). Aufwand bei 10.000 Positionen rund 0,2 s.

## Verworfene Alternativen

- **OZ als Adresse (bisher):** bricht beim Umnummerieren und sagt nichts über den Inhalt.
- **Preis im Hash:** ein Link aus der X83 fände die Position in der X84 nicht.
- **Zufällige ID (UUID):** wäre bei jedem Laden neu, also nicht teilbar.

## Folgen

- Ändert sich der Text einer Position, ändert sich ihr Hash. Eine über Fassungen stabile
  Anker-ID kommt erst mit „zwei Dateien" (derzeit außerhalb des Scopes).
- Markierungen und Kommentare hängen noch an der Knoten-ID; der Umzug auf den Hash ist
  der nächste Schritt.
- Ändert sich die Normierung, ändern sich alle Hashes (`bubble-pos-v1` im Code).
