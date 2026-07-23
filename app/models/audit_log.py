"""ORM model for the position-status audit log."""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.position import PositionStatus

if TYPE_CHECKING:
    from app.models.position import Position
    from app.models.wbs_node import WBSNode


class AuditLog(Base):
    """Immutable record of every PositionStatus transition.

    Keeps `position_id` (the transition is intrinsically PositionStatus-specific)
    and additionally carries the Pflicht-FK `wbs_node_id`, per the referential
    invariant in `.claude/CLAUDE.md#architektur-nicht-verhandelbar`.
    """

    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    position_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("position.id"), nullable=False
    )
    wbs_node_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("wbs_node.id"), nullable=False
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    old_status: Mapped[PositionStatus | None] = mapped_column(
        SAEnum(PositionStatus), nullable=True
    )
    new_status: Mapped[PositionStatus] = mapped_column(
        SAEnum(PositionStatus), nullable=False
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    position: Mapped["Position"] = relationship(back_populates="audit_logs")
    wbs_node: Mapped["WBSNode"] = relationship(back_populates="audit_logs")
