"""ORM models for Leistungsverzeichnis (LV) and its hierarchy (Los, Abschnitt)."""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.position import Position


class SourceType(enum.StrEnum):
    """Origin of an LV's data, independent of its persisted structure."""

    GAEB = "GAEB"
    MANUAL = "MANUAL"
    EXCEL = "EXCEL"


class LV(Base):
    """Persisted Leistungsverzeichnis, keyed by project_id for idempotent re-import."""

    __tablename__ = "lv"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    project_name: Mapped[str | None] = mapped_column(String(512))
    client: Mapped[str | None] = mapped_column(String(512))
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_type: Mapped[SourceType] = mapped_column(SAEnum(SourceType), nullable=False)
    source_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    lots: Mapped[list[Lot]] = relationship(
        back_populates="lv", cascade="all, delete-orphan"
    )
    positions: Mapped[list[Position]] = relationship(
        back_populates="lv", cascade="all, delete-orphan"
    )


class Lot(Base):
    """A single Los (lot) within an LV."""

    __tablename__ = "lot"
    __table_args__ = (UniqueConstraint("lv_id", "number", name="uq_lot_lv_number"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lv_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lv.id"), nullable=False)
    number: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str | None] = mapped_column(String(512))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    lv: Mapped[LV] = relationship(back_populates="lots")
    sections: Mapped[list[Section]] = relationship(
        back_populates="lot", cascade="all, delete-orphan"
    )


class Section(Base):
    """An Abschnitt (section/category) within a Lot; self-nestable via parent_id."""

    __tablename__ = "section"
    __table_args__ = (
        UniqueConstraint("lot_id", "number", name="uq_section_lot_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lot.id"), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("section.id"), nullable=True
    )
    number: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str | None] = mapped_column(String(512))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    lot: Mapped[Lot] = relationship(back_populates="sections")
    positions: Mapped[list[Position]] = relationship(back_populates="section")
