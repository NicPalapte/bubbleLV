"""Repository for async DB access to Leistungsverzeichnis records.

Consumes only the source-agnostic `LVDraft` write model — this module stays
free of any adapter- or parser-specific dependency.
"""

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lv import LV, Lot, Section
from app.models.position import Position, PositionStatus
from app.models.wbs_node import WBSNode, WBSNodeKind
from app.schemas.lv_draft import LotDraft, LVDraft, PositionDraft, SectionDraft

log = structlog.get_logger(__name__)


class LVRepository:
    """All DB operations for LV, Lot, Section, and Position."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialise with an active async session."""
        self._session = session

    async def persist_lv(self, project_id: str, draft: LVDraft) -> LV:
        """Upsert the full LV tree; preserve status/notes on re-import.

        Args:
            project_id: External business key (from the URL).
            draft: Neutral write model produced by an importer's mapper.

        Returns:
            The persisted LV ORM instance (refreshed from DB).
        """
        lv = await self._upsert_lv(project_id, draft)
        await self._session.flush()

        for lot_draft in draft.lots:
            lot = await self._upsert_lot(lv.id, lot_draft)
            lot_wbs = await self._upsert_wbs_node(
                project_id=project_id,
                kind=WBSNodeKind.LOT,
                parent_id=None,
                code=lot_draft.number,
                label=lot_draft.label,
            )
            await self._session.flush()

            for section_draft in lot_draft.sections:
                await self._persist_section(
                    lv.id, lot.id, None, lot_wbs.id, project_id, section_draft
                )

        await self._session.flush()
        await self._session.refresh(lv)
        log.info("lv.persisted", project_id=project_id, lv_id=str(lv.id))
        return lv

    # ------------------------------------------------------------------
    # Private upsert helpers
    # ------------------------------------------------------------------

    async def _upsert_lv(self, project_id: str, draft: LVDraft) -> LV:
        stmt = (
            pg_insert(LV)
            .values(
                id=uuid.uuid4(),
                project_id=project_id,
                project_name=draft.project_name,
                client=draft.client,
                deadline=draft.deadline,
                source_type=draft.source_type,
                source_metadata=draft.source_metadata,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            .on_conflict_do_update(
                index_elements=["project_id"],
                set_={
                    "project_name": draft.project_name,
                    "client": draft.client,
                    "deadline": draft.deadline,
                    "source_type": draft.source_type,
                    "source_metadata": draft.source_metadata,
                    "updated_at": datetime.now(UTC),
                },
            )
            .returning(LV.id)
        )
        result = await self._session.execute(stmt)
        lv_id: uuid.UUID = result.scalar_one()
        lv_row = await self._session.get(LV, lv_id)
        assert lv_row is not None
        return lv_row

    async def _upsert_lot(self, lv_id: uuid.UUID, draft: LotDraft) -> Lot:
        stmt = (
            pg_insert(Lot)
            .values(
                id=uuid.uuid4(),
                lv_id=lv_id,
                number=draft.number,
                label=draft.label,
                sort_order=0,
            )
            .on_conflict_do_update(
                constraint="uq_lot_lv_number",
                set_={"label": draft.label},
            )
            .returning(Lot.id)
        )
        result = await self._session.execute(stmt)
        lot_id: uuid.UUID = result.scalar_one()
        lot_row = await self._session.get(Lot, lot_id)
        assert lot_row is not None
        return lot_row

    async def _persist_section(
        self,
        lv_id: uuid.UUID,
        lot_id: uuid.UUID,
        parent_id: uuid.UUID | None,
        parent_wbs_id: uuid.UUID,
        project_id: str,
        draft: SectionDraft,
    ) -> None:
        """Recursively upsert a section, its WBSNode, positions, and children."""
        section = await self._upsert_section(lot_id, parent_id, draft)
        section_wbs = await self._upsert_wbs_node(
            project_id=project_id,
            kind=WBSNodeKind.SECTION,
            parent_id=parent_wbs_id,
            code=draft.number,
            label=draft.label,
        )
        await self._session.flush()
        await self._upsert_positions(
            lv_id, section.id, section_wbs.id, project_id, draft.positions
        )

        for child_draft in draft.sections:
            await self._persist_section(
                lv_id, lot_id, section.id, section_wbs.id, project_id, child_draft
            )

    async def _upsert_section(
        self,
        lot_id: uuid.UUID,
        parent_id: uuid.UUID | None,
        draft: SectionDraft,
    ) -> Section:
        stmt = (
            pg_insert(Section)
            .values(
                id=uuid.uuid4(),
                lot_id=lot_id,
                parent_id=parent_id,
                number=draft.number,
                label=draft.label,
                sort_order=0,
            )
            .on_conflict_do_update(
                constraint="uq_section_lot_number",
                set_={"label": draft.label, "parent_id": parent_id},
            )
            .returning(Section.id)
        )
        result = await self._session.execute(stmt)
        section_id: uuid.UUID = result.scalar_one()
        section_row = await self._session.get(Section, section_id)
        assert section_row is not None
        return section_row

    async def _upsert_positions(
        self,
        lv_id: uuid.UUID,
        section_id: uuid.UUID,
        section_wbs_id: uuid.UUID,
        project_id: str,
        positions: list[PositionDraft],
    ) -> None:
        now = datetime.now(UTC)
        for p in positions:
            position_wbs = await self._upsert_wbs_node(
                project_id=project_id,
                kind=WBSNodeKind.POSITION,
                parent_id=section_wbs_id,
                code=p.oz,
                label=p.short_text or None,
            )
            stmt = (
                pg_insert(Position)
                .values(
                    id=uuid.uuid4(),
                    lv_id=lv_id,
                    section_id=section_id,
                    wbs_node_id=position_wbs.id,
                    oz=p.oz,
                    short_text=p.short_text,
                    long_text=p.long_text,
                    unit=p.unit,
                    quantity=p.quantity,
                    unit_price=p.unit_price,
                    position_type=p.position_type,
                    status=PositionStatus.OPEN,
                    assignee_id=None,
                    attributes=p.attributes,
                    search_vector=None,
                    created_at=now,
                    updated_at=now,
                )
                .on_conflict_do_update(
                    constraint="uq_position_lv_oz",
                    set_={
                        "short_text": p.short_text,
                        "long_text": p.long_text,
                        "unit": p.unit,
                        "quantity": p.quantity,
                        "unit_price": p.unit_price,
                        "position_type": p.position_type,
                        "section_id": section_id,
                        "wbs_node_id": position_wbs.id,
                        "attributes": p.attributes,
                        "updated_at": now,
                    },
                )
            )
            await self._session.execute(stmt)

    async def _upsert_wbs_node(
        self,
        project_id: str,
        kind: WBSNodeKind,
        parent_id: uuid.UUID | None,
        code: str,
        label: str | None,
    ) -> WBSNode:
        """Upsert one WBSNode, deduplicated by (project_id, kind, parent_id, code).

        Root nodes (`parent_id is None`, i.e. `kind=LOT`) match via the partial
        unique index on `(project_id, kind, code) WHERE parent_id IS NULL` instead,
        since Postgres never treats two NULLs as conflicting under a regular
        unique constraint.
        """
        insert_stmt = pg_insert(WBSNode).values(
            id=uuid.uuid4(),
            parent_id=parent_id,
            kind=kind,
            code=code,
            label=label,
            sort_order=0,
            project_id=project_id,
        )
        if parent_id is None:
            stmt = insert_stmt.on_conflict_do_update(
                index_elements=["project_id", "kind", "code"],
                index_where=WBSNode.parent_id.is_(None),
                set_={"label": label},
            ).returning(WBSNode.id)
        else:
            stmt = insert_stmt.on_conflict_do_update(
                constraint="uq_wbs_node_parent_code",
                set_={"label": label},
            ).returning(WBSNode.id)
        result = await self._session.execute(stmt)
        wbs_node_id: uuid.UUID = result.scalar_one()
        wbs_node_row = await self._session.get(WBSNode, wbs_node_id)
        assert wbs_node_row is not None
        return wbs_node_row

    async def get_lv_by_project_id(self, project_id: str) -> LV | None:
        """Return the LV for a given project_id, or None if not found."""
        result = await self._session.execute(
            select(LV).where(LV.project_id == project_id)
        )
        return result.scalar_one_or_none()

    async def count_positions(self, lv_id: uuid.UUID) -> int:
        """Return the total number of positions for an LV."""
        from sqlalchemy import func

        result = await self._session.execute(
            select(func.count()).where(Position.lv_id == lv_id)
        )
        return result.scalar_one()
