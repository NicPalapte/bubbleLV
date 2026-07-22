Setze **WP-WBS · WBSNode einführen** um. **Geplant, noch nicht umgesetzt** — separates
Arbeitspaket nach dem MVP (WP-1…6). Nicht ohne explizite Freigabe starten.

Kontext lesen: @docs/architecture/data-model.md @docs/vision.md @.claude/CLAUDE.md

**Ziel:** Die universelle Work-Breakdown-Spine (`WBSNode`, self-referenzieller Baum)
als eigene Entität einführen. Domänen-Entitäten hängen danach per Pflicht-FK an
`wbs_node_id` statt an `position_id`. Konzept/Invarianten: siehe
[`architecture/data-model.md`](../../docs/architecture/data-model.md#wbsnode--universelle-work-breakdown-spine).

**Vorgehen:** Beginne mit einem kurzen Plan (3–5 Punkte), dann implementieren:

1. **WBSNode-Modell** (`app/models/wbs_node.py`): `id`, `parent_id` (self-ref),
   `kind` (`project | lot | section | position | …`), `code`, `label`, `sort_order`,
   `project_id`, `din276_kostengruppe` (nullable, im MVP-Nachfolger noch ungenutzt).
2. **Alembic-Migration** für `wbs_node` inkl. Index auf `parent_id` und `project_id`.
3. **Import erzeugt WBS 1:1**: `LVRepository.persist_lv` (oder ein nachgelagerter
   Schritt) legt pro Los-/Abschnitts-/Positionsknoten genau einen `WBSNode` an und
   verknüpft die LV-Position über eine neue FK-Spalte (`Position.wbs_node_id`) mit
   ihrem Knoten. Re-Import bleibt idempotent (OZ als natürlicher Schlüssel gilt
   weiterhin für die LV-Position; der zugehörige `WBSNode` wird beim Re-Import
   wiedergefunden, nicht dupliziert).
4. **Domänen-Entitäten auf `wbs_node_id` umstellen**: bestehende bzw. neu angelegte
   Tabellen (`Note`, `AuditLog`, spätere `Task`/`Termin`/`Vergabepaket`) erhalten
   einen **Pflicht**-FK auf `WBSNode` statt (oder zusätzlich zu) `Position`.
5. **Mapper/Service-Schicht**: `WBSRepository` bzw. Erweiterung des bestehenden
   Repositories, das **nichts** aus `app.adapters`/`pyGAEB` importiert (gleiche Regel
   wie beim `LVRepository`). API-Read-Pfade (`/tree`), die bisher über `Position`
   gehen, liefern zusätzlich `wbs_node_id` je Knoten.
6. **Tests**: Unit-Test, dass Import pro Struktur-/Positionsknoten genau einen
   `WBSNode` erzeugt; Test, dass Re-Import keine doppelten `WBSNode`s anlegt; Test,
   dass eine Domänen-Entität ohne `wbs_node_id` von der DB abgelehnt wird (NOT NULL
   FK) — Beleg für die referenzielle Invariante aus
   [`.claude/CLAUDE.md`](../CLAUDE.md#architektur-nicht-verhandelbar).

**Bewusst nicht Teil dieses WP:** n:m-Zuordnung WBSNode ↔ LV-Position (bleibt 1:1),
DIN-276-Controlling/Soll-Ist-Auswertung, neue Knotentypen jenseits der LV-Hierarchie.
Diese Pfade bleiben laut [`architecture/data-model.md`](../../docs/architecture/data-model.md#wbs--lv)
offen, werden hier nicht gebaut.

**Fertig, wenn:**
- `pytest -x --cov=app --cov-fail-under=80` grün.
- Import eines Fixtures erzeugt für jeden Los-/Abschnitts-/Positionsknoten genau
  einen `WBSNode`; jede importierte `Position` trägt eine gesetzte `wbs_node_id`.
- Re-Import verändert die Anzahl bestehender `WBSNode`s nicht (idempotent).
- Jede Domänen-Tabelle mit `wbs_node_id` verweigert `NULL` (DB-Constraint, nicht nur
  Anwendungslogik).
- `grep -R "pygaeb\|Parsed" app/repositories/` liefert weiterhin nichts.

Commit: `feat(db): WBSNode als eigene Entität, Domänen-Entitäten auf wbs_node_id umgestellt`
