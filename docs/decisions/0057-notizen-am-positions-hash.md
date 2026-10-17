# 0057 – Notizen hängen am Positions-Hash

- **Status:** akzeptiert
- **Datum:** 2026-10-17
- **Betrifft:** `frontend/src/lib/annotations.ts`, Speicher der letzten Datei
  (`frontend/src/lib/persist/lastLv.ts`); ergänzt 0047 und 0055

## Worum geht's

- Marker und Kommentare wurden unter der Knoten-ID gespeichert. Die entsteht beim Laden
  aus OZ und Reihenfolge, also aus dem Programmcode, nicht aus der Datei.
- 0055 hat jeder Position einen Hash gegeben (Fingerabdruck aus OZ, Text, Menge und Art).
  Der Link nutzt ihn schon. Die Notizen sollten folgen.

## Entscheidung

- Gespeichert wird unter dem Positions-Hash (`hashes.id`), Speicherform `v: 3`.
- In der laufenden Sitzung bleibt die Knoten-ID der Schlüssel. Umgeschlüsselt wird nur
  beim Laden und beim Speichern (`storageKeys`, `rekey`).
- Alte Notizen (Knoten-ID, bis v0.21) werden beim Öffnen gefunden und beim nächsten
  Speichern unter dem Hash abgelegt.
- Notizen ohne passende Position bleiben im Speicher stehen. Sie werden nicht gezeigt,
  aber auch nicht gelöscht.

## Warum

- Notizen, Link und später der Fassungsvergleich nutzen dieselbe Adresse.
- Der Hash hängt nur am Inhalt der Datei. Eine Änderung an `buildTree` kann die Notizen
  nicht mehr von ihren Positionen trennen.
- Grundlage für Export und Import der Notizen als Datei: sie finden ihre Position auch
  in einer anderen Datei, solange OZ, Text und Menge gleich sind.

## Verworfene Alternativen

- **Hash auch in der Sitzung als Schlüssel:** hätte Graph, Tabelle, Karte und Filter
  angefasst, ohne für den Nutzer etwas zu ändern.
- **Nur über den Text zuordnen (ohne OZ):** fände Notizen auch nach dem Umnummerieren,
  ordnet bei gleichlautenden Positionen aber falsch zu. Kommt erst mit dem
  Fassungsvergleich.

## Folgen

- Ändert sich OZ, Text oder Menge einer Position, findet ihre Notiz sie nicht mehr.
- Nichts für den Owner zu tun.
