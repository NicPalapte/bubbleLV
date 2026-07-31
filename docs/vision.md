# Vision

> **Intern.** Dieses Dokument ist keine Außenkommunikation — die Positionierung nach
> außen bleibt bewusst schmal (siehe [`README.md`](../README.md)). Hier steht die
> längere Sicht, gegen die architektonisch entworfen wird (v. a.
> [`architecture/data-model.md`](architecture/data-model.md)).
>
> **Aktueller Stand:** Das MVP ist zu einer **reinen Frontend-Anwendung** ohne Server
> geworden (kein Login, nichts wird gespeichert) — siehe
> [`mvp-scope.md`](mvp-scope.md), [`architecture/pipeline.md`](architecture/pipeline.md).
> Schritte 2–6 unten setzen alle eine Server-Komponente mit Persistenz voraus (Notizen,
> Aufgaben, Termine hängen an einem `WBSNode`, der eine Session überlebt) und sind
> damit **pausiert**, solange das MVP frontend-only bleibt. Die frühere
> Backend-Planung ist auf `archive/backend-mvp` gesichert, falls dieser Weg später
> wieder aufgenommen wird.

## Roadmap in sechs Schritten (Post-MVP, setzt eine künftige Server-Komponente voraus)

Das MVP ist Schritt 1. Jeder weitere Schritt hängt Domänen-Daten an den `WBSNode`
(siehe [`architecture/data-model.md`](architecture/data-model.md#wbsnode--zurückgestellt-setzt-einen-server-voraus))
statt eine neue, isolierte Struktur zu bauen.

1. **LV-Viewer / Graph** — GAEB importieren, klassifizieren, als Bubble-Graph und
   Tabelle einsehen. *(= aktuelles MVP)*
2. **Aufgaben + Notizen am WBSNode** — erste Domänen-Entitäten mit Pflicht-FK auf
   `wbs_node_id`.
3. **Termininfos** — Zeit/Vorgang als weitere Zerlegung, per Kante an die WBS gehängt.
4. **Nachunternehmer / Vergabeleistungen** — Organisation/Firma-Zerlegung.
5. **Soll/Ist** — Abgleich gegen DIN-276-Kostengruppen (Slot ist am `WBSNode` bereits
   vorgesehen, im MVP ungenutzt).
6. **Weitere Domänen** — z. B. Ort/Bauteil/Geschoss, Gewerk/STLB, IFC-Objekt — jeweils
   nach der Erweiterungsregel: Attribut/Kante an Bestehendes, oder neuer Knotentyp mit
   typisierter Kante zur WBS. Das Rückgrat wird dafür nie umgebaut.

## Die KI-These — als Motivation, nicht als Arbeitspaket

Der langfristige Anreiz, strukturierte Daten so sorgfältig zu erfassen: Projektverläufe
(was wurde geplant, was geändert, was tatsächlich getan), die über die Schritte 2–6
append-only mit Provenienz und Zeitstempeln entstehen, sind die Voraussetzung, um
später ein Modell darauf zu trainieren oder darüber Auskunft geben zu lassen.

**Das ist jetzt kein Arbeitspaket.** Explizite Nicht-Ziele für die aktuelle Phase:

- Keine ML-Infrastruktur.
- Kein Feature-Store.
- Keine Graph-DB.

Aktuell wird ausschließlich strukturiertes, append-only, provenance- und
zeitstempel-reiches Ereignismaterial erfasst (z. B. wer hat wann welche Zuständigkeit
gesetzt, welcher Klassifizierer mit welcher Konfidenz), damit Verläufe **später**
rekonstruierbar sind — nicht, weil ein Trainingslauf ansteht.

## Identität / Reconciliation — bewusst aufgeschobenes Problem

„Alle Informationen verknüpfen" klingt nach einem Schema-Problem, ist im Kern aber ein
**Entity-Resolution-Problem**: dieselbe Wand heißt im LV „Pos 03.010", in der Statik
„W-12", im Modell eine IFC-GUID, räumlich „Achse C, EG". Ein kanonischer Identifier,
der all das zusammenführt, ist **nicht gelöst und wird jetzt nicht gebaut.**

Der `WBSNode` entschärft das Problem, löst es aber nicht: er gibt jedem Fakt ein
Zuhause, **bevor** dieser mit anderen Fakten reconciliet ist. Identität wird — falls
und wenn nötig — später inkrementell über explizite Mapping-Tabellen aufgelöst (analog
zur n:m-Zuordnung WBS ↔ LV-Position, siehe [`architecture/data-model.md`](architecture/data-model.md#wbs--lv)).

**Partielle Verknüpfung ist ausdrücklich wertvoll.** Ein Objekt, das nur an einem
`WBSNode` hängt und nie mit einem IFC-Element, einer Statik-Referenz oder einem
räumlichen Locator verbunden wird, ist trotzdem nützlich — es hat einen Anker, eine
Historie, eine Zuständigkeit. Weder Doku noch Agent sollen so tun, als sei die
Identitäts-Auflösung gelöst oder Voraussetzung für Nutzen. Das Fehlen einer
vollständigen Reconciliation ist kein Blocker für Schritt 2–6.
