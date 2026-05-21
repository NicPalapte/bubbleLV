"""Repository for async DB access to Leistungsverzeichnis records."""

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lv import LV, Lot, Section
from app.models.position import Position, PositionStatus, PositionType
from app.schemas.gaeb import ParsedLot, ParsedLV, ParsedSection

log = structlog.get_logger(__name__)


class LVRepository:
    """All DB operations for LV, Lot, Section, and Position."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialise with an active async session."""
        self._session = session

    async def persist_lv(self, project_id: str, parsed: ParsedLV) -> LV:
        """Upsert the full LV tree; preserve status/notes on re-import.

        Args:
            project_id: External business key (from the URL).
            parsed: Parsed LV returned by the adapter.

        Returns:
            The persisted LV ORM instance (refreshed from DB).
        """
        lv = await self._upsert_lv(project_id, parsed)
        await self._session.flush()

        for parsed_lot in parsed.lots:
            lot = await self._upsert_lot(lv.id, parsed_lot)
            await self._session.flush()

            for parsed_section in parsed_lot.sections:
                section = await self._upsert_section(lot.id, parsed_section)
                await self._session.flush()
                await self._upsert_positions(lv.id, section.id, parsed_section)

        await self._session.flush()
        await self._session.refresh(lv)
        log.info("lv.persisted", project_id=project_id, lv_id=str(lv.id))
        return lv

    # ------------------------------------------------------------------
    # Private upsert helpers
    # ------------------------------------------------------------------

    async def _upsert_lv(self, project_id: str, parsed: ParsedLV) -> LV:
        stmt = (
            pg_insert(LV)
            .values(
                id=uuid.uuid4(),
                project_id=project_id,
                project_name=parsed.project_name,
                client=parsed.client,
                deadline=parsed.deadline,
                gaeb_version=parsed.gaeb_version,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            .on_conflict_do_update(
                index_elements=["project_id"],
                set_={
                    "project_name": parsed.project_name,
                    "client": parsed.client,
                    "deadline": parsed.deadline,
                    "gaeb_version": parsed.gaeb_version,
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

    async def _upsert_lot(self, lv_id: uuid.UUID, parsed: ParsedLot) -> Lot:
        stmt = (
            pg_insert(Lot)
            .values(
                id=uuid.uuid4(),
                lv_id=lv_id,
                number=parsed.lot_id,
                label=parsed.label,
                sort_order=0,
            )
            .on_conflict_do_update(
                constraint="uq_lot_lv_number",
                set_={"label": parsed.label},
            )
            .returning(Lot.id)
        )
        result = await self._session.execute(stmt)
        lot_id: uuid.UUID = result.scalar_one()
        lot_row = await self._session.get(Lot, lot_id)
        assert lot_row is not None
        return lot_row

    async def _upsert_section(
        self, lot_id: uuid.UUID, parsed: ParsedSection
    ) -> Section:
        stmt = (
            pg_insert(Section)
            .values(
                id=uuid.uuid4(),
                lot_id=lot_id,
                parent_id=None,
                number=parsed.section_id,
                label=parsed.label,
                sort_order=0,
            )
            .on_conflict_do_update(
                constraint="uq_section_lot_number",
                set_={"label": parsed.label},
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
        parsed: ParsedSection,
    ) -> None:
        now = datetime.now(UTC)
        for p in parsed.positions:
            stmt = (
                pg_insert(Position)
                .values(
                    id=uuid.uuid4(),
                    lv_id=lv_id,
                    section_id=section_id,
                    oz=p.oz,
                    short_text=p.short_text,
                    long_text=p.long_text,
                    unit=p.unit,
                    quantity=p.quantity,
                    unit_price=p.unit_price,
                    position_type=PositionType(p.position_type),
                    status=PositionStatus.OPEN,
                    assignee_id=None,
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
                        "position_type": PositionType(p.position_type),
                        "section_id": section_id,
                        "updated_at": now,
                    },
                )
            )
            await self._session.execute(stmt)

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
