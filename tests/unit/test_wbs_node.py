"""Tests for WBSNode: creation during import, idempotent re-import, and the
referential invariant that domain entities cannot exist without a wbs_node_id.
"""

import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.lv import SourceType
from app.models.position import Note, Position, PositionStatus, PositionType
from app.models.wbs_node import WBSNode, WBSNodeKind
from app.repositories.lv import LVRepository
from app.schemas.lv_draft import LotDraft, LVDraft, PositionDraft, SectionDraft


def _make_nested_draft() -> LVDraft:
    child_position = PositionDraft(oz="0020", short_text="Kinderposition")
    child_section = SectionDraft(
        number="01.01", label="Unterabschnitt", positions=[child_position]
    )
    parent_position = PositionDraft(oz="0010", short_text="Elternposition")
    parent_section = SectionDraft(
        number="01",
        label="Erdarbeiten",
        positions=[parent_position],
        sections=[child_section],
    )
    lot = LotDraft(number="1", label="Default", sections=[parent_section])
    return LVDraft(source_type=SourceType.GAEB, source_metadata={}, lots=[lot])


async def _count_wbs_nodes(session: AsyncSession) -> int:
    result = await session.execute(select(func.count()).select_from(WBSNode))
    return result.scalar_one()


async def test_persist_lv_creates_one_wbs_node_per_structure_and_position_node(
    db_session: AsyncSession,
) -> None:
    repo = LVRepository(db_session)
    draft = _make_nested_draft()

    await repo.persist_lv("proj-wbs-count", draft)

    # 1 lot + 1 parent section + 1 child section + 2 positions = 5
    assert await _count_wbs_nodes(db_session) == 5


async def test_persist_lv_sets_position_wbs_node_id_and_hierarchy(
    db_session: AsyncSession,
) -> None:
    repo = LVRepository(db_session)
    draft = _make_nested_draft()

    lv = await repo.persist_lv("proj-wbs-position", draft)

    result = await db_session.execute(
        select(Position).where(Position.lv_id == lv.id, Position.oz == "0020")
    )
    position = result.scalar_one()
    assert position.wbs_node_id is not None

    position_node = await db_session.get(WBSNode, position.wbs_node_id)
    assert position_node is not None
    assert position_node.kind == WBSNodeKind.POSITION
    assert position_node.code == "0020"

    child_section_node = await db_session.get(WBSNode, position_node.parent_id)
    assert child_section_node is not None
    assert child_section_node.kind == WBSNodeKind.SECTION
    assert child_section_node.code == "01.01"

    parent_section_node = await db_session.get(WBSNode, child_section_node.parent_id)
    assert parent_section_node is not None
    assert parent_section_node.kind == WBSNodeKind.SECTION
    assert parent_section_node.code == "01"

    lot_node = await db_session.get(WBSNode, parent_section_node.parent_id)
    assert lot_node is not None
    assert lot_node.kind == WBSNodeKind.LOT
    assert lot_node.parent_id is None


async def test_persist_lv_reimport_does_not_duplicate_wbs_nodes(
    db_session: AsyncSession,
) -> None:
    repo = LVRepository(db_session)
    draft = _make_nested_draft()

    await repo.persist_lv("proj-wbs-idempotent", draft)
    first_count = await _count_wbs_nodes(db_session)

    await repo.persist_lv("proj-wbs-idempotent", _make_nested_draft())
    second_count = await _count_wbs_nodes(db_session)

    assert second_count == first_count == 5


async def test_position_rejects_missing_wbs_node_id(db_session: AsyncSession) -> None:
    repo = LVRepository(db_session)
    lv = await repo.persist_lv(
        "proj-wbs-null-check", LVDraft(source_type=SourceType.GAEB)
    )

    position = Position(
        id=uuid.uuid4(),
        lv_id=lv.id,
        oz="9999",
        position_type=PositionType.NORMAL,
        status=PositionStatus.OPEN,
    )
    db_session.add(position)

    with pytest.raises(IntegrityError):
        await db_session.flush()


async def test_note_rejects_missing_wbs_node_id(db_session: AsyncSession) -> None:
    note = Note(id=uuid.uuid4(), content="ohne Anker")
    db_session.add(note)

    with pytest.raises(IntegrityError):
        await db_session.flush()


async def test_audit_log_rejects_missing_wbs_node_id(
    db_session: AsyncSession,
) -> None:
    repo = LVRepository(db_session)
    lv = await repo.persist_lv("proj-wbs-audit-null-check", _make_nested_draft())
    result = await db_session.execute(
        select(Position).where(Position.lv_id == lv.id, Position.oz == "0010")
    )
    position = result.scalar_one()

    audit_log = AuditLog(
        id=uuid.uuid4(),
        position_id=position.id,
        new_status=PositionStatus.OPEN,
    )
    db_session.add(audit_log)

    with pytest.raises(IntegrityError):
        await db_session.flush()
