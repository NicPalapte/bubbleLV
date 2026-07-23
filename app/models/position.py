"""ORM model for Position and the PositionStatus enum."""

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.audit_log import AuditLog
    from app.models.lv import LV, Section


class PositionStatus(enum.StrEnum):
    """Workflow status of a single position; every change is audit-logged."""

    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"
    BLOCKED = "BLOCKED"


class PositionType(enum.StrEnum):
    """GAEB position type mapped from pyGAEB ItemType."""

    NORMAL = "NORMAL"
    ALTERNATIV = "ALTERNATIV"
    BEDARF = "BEDARF"
    ZULAGENPOSITION = "ZULAGENPOSITION"


class Position(Base):
    """A single Leistungsposition; oz + lv_id form the natural idempotency key."""

    __tablename__ = "position"
    __table_args__ = (UniqueConstraint("lv_id", "oz", name="uq_position_lv_oz"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    lv_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lv.id"), nullable=False)
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("section.id"), nullable=True
    )
    oz: Mapped[str] = mapped_column(String(64), nullable=False)
    short_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    long_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    unit: Mapped[str | None] = mapped_column(String(32))
    quantity: Mapped[float | None] = mapped_column(Numeric(15, 3))
    unit_price: Mapped[float | None] = mapped_column(Numeric(15, 5))
    position_type: Mapped[PositionType] = mapped_column(
        SAEnum(PositionType), nullable=False, default=PositionType.NORMAL
    )
    status: Mapped[PositionStatus] = mapped_column(
        SAEnum(PositionStatus), nullable=False, default=PositionStatus.OPEN
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    lv: Mapped["LV"] = relationship(back_populates="positions")
    section: Mapped["Section | None"] = relationship(back_populates="positions")
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        back_populates="position", cascade="all, delete-orphan"
    )
    notes: Mapped[list["Note"]] = relationship(
        back_populates="position", cascade="all, delete-orphan"
    )


class Note(Base):
    """Append-only user note attached to a Position."""

    __tablename__ = "note"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    position_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("position.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    position: Mapped[Position] = relationship(back_populates="notes")
