"""Tests for LVRepository.persist_lv against a real DB session.

Covers the source-agnostic write path: LVDraft -> DB, idempotent re-import,
assignee_id preservation, nested sections, and Position.attributes.
"""

import uuid
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lv import Section, SourceType
from app.models.position import Position, PositionType
from app.repositories.lv import LVRepository
from app.schemas.lv_draft import LotDraft, LVDraft, PositionDraft, SectionDraft


def _make_draft(
    short_text: str = "Oberboden abtragen",
    attributes: dict[str, Any] | None = None,
) -> LVDraft:
    position = PositionDraft(
        oz="0010",
        short_text=short_text,
        long_text="",
        unit="m3",
        quantity=100.0,
        unit_price=12.5,
        position_type=PositionType.NORMAL,
        attributes=attributes or {},
    )
    section = SectionDraft(number="01", label="Erdarbeiten", positions=[position])
    lot = LotDraft(number="1", label="Default", sections=[section])
    return LVDraft(
        project_name="Testprojekt",
        client="Muster AG",
        deadline=None,
        source_type=SourceType.GAEB,
        source_metadata={"gaeb_version": "3.3"},
        lots=[lot],
    )


async def test_persist_lv_writes_source_type_and_metadata(
    db_session: AsyncSession,
) -> None:
    repo = LVRepository(db_session)
    draft = _make_draft()

    lv = await repo.persist_lv("proj-source", draft)

    assert lv.source_type == SourceType.GAEB
    assert lv.source_metadata == {"gaeb_version": "3.3"}


async def test_persist_lv_reimport_preserves_assignee_id(
    db_session: AsyncSession,
) -> None:
    repo = LVRepository(db_session)
    draft = _make_draft()

    lv = await repo.persist_lv("proj-assignee", draft)
    lv_id = lv.id
    result = await db_session.execute(
        select(Position).where(Position.lv_id == lv_id, Position.oz == "0010")
    )
    position = result.scalar_one()
    assigned_to = uuid.uuid4()
    position.assignee_id = assigned_to
    await db_session.flush()

    updated_draft = _make_draft(short_text="Oberboden abtragen, geändert")
    await repo.persist_lv("proj-assignee", updated_draft)
    db_session.expire_all()

    result = await db_session.execute(
        select(Position).where(Position.lv_id == lv_id, Position.oz == "0010")
    )
    position = result.scalar_one()
    assert position.assignee_id == assigned_to
    assert position.short_text == "Oberboden abtragen, geändert"


async def test_persist_lv_writes_position_attributes(
    db_session: AsyncSession,
) -> None:
    repo = LVRepository(db_session)
    draft = _make_draft(attributes={"beton": "C30/37", "tragend": True})

    lv = await repo.persist_lv("proj-attributes", draft)

    result = await db_session.execute(
        select(Position).where(Position.lv_id == lv.id, Position.oz == "0010")
    )
    position = result.scalar_one()
    assert position.attributes == {"beton": "C30/37", "tragend": True}


async def test_persist_lv_nested_sections(db_session: AsyncSession) -> None:
    repo = LVRepository(db_session)
    child_position = PositionDraft(
        oz="0020",
        short_text="Kinderposition",
        position_type=PositionType.NORMAL,
    )
    child_section_draft = SectionDraft(
        number="01.01", label="Unterabschnitt", positions=[child_position]
    )
    parent_section_draft = SectionDraft(
        number="01", label="Erdarbeiten", sections=[child_section_draft]
    )
    lot = LotDraft(number="1", label="Default", sections=[parent_section_draft])
    draft = LVDraft(
        source_type=SourceType.GAEB,
        source_metadata={"gaeb_version": "3.3"},
        lots=[lot],
    )

    lv = await repo.persist_lv("proj-nested", draft)

    result = await db_session.execute(
        select(Position).where(Position.lv_id == lv.id, Position.oz == "0020")
    )
    position = result.scalar_one()
    assert position.section_id is not None

    child_section = await db_session.get(Section, position.section_id)
    assert child_section is not None
    assert child_section.number == "01.01"
    assert child_section.parent_id is not None

    parent_section = await db_session.get(Section, child_section.parent_id)
    assert parent_section is not None
    assert parent_section.number == "01"


@pytest.mark.parametrize("source_type", list(SourceType))
async def test_persist_lv_accepts_every_source_type(
    db_session: AsyncSession, source_type: SourceType
) -> None:
    repo = LVRepository(db_session)
    draft = LVDraft(source_type=source_type, source_metadata={}, lots=[])

    lv = await repo.persist_lv(f"proj-{source_type.value.lower()}", draft)

    assert lv.source_type == source_type
