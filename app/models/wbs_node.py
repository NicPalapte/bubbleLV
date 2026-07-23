"""ORM model for WBSNode — the universal work-breakdown spine.

Concept: `docs/architecture/data-model.md#wbsnode--universelle-work-breakdown-spine`.
In the MVP mapping the import creates exactly one `WBSNode` per Los/Abschnitt/
Position node; the LV stays a projection onto this backbone, not the reverse.
"""

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.audit_log import AuditLog
    from app.models.position import Note


class WBSNodeKind(enum.StrEnum):
    """Node type within the work-breakdown spine."""

    PROJECT = "PROJECT"
    LOT = "LOT"
    SECTION = "SECTION"
    POSITION = "POSITION"


class WBSNode(Base):
    """Self-referential work-breakdown node; the attach point for domain entities.

    Idempotency mirrors the LV tree's natural keys: siblings are unique by
    `(project_id, kind, parent_id, code)`. Because Postgres treats NULLs as
    distinct in a regular unique constraint, root nodes (`parent_id IS NULL`,
    i.e. `kind=LOT`) are instead deduplicated via a partial unique index on
    `(project_id, kind, code)`.
    """

    __tablename__ = "wbs_node"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "kind", "parent_id", "code", name="uq_wbs_node_parent_code"
        ),
        Index(
            "uq_wbs_node_root_code",
            "project_id",
            "kind",
            "code",
            unique=True,
            postgresql_where=text("parent_id IS NULL"),
        ),
        Index("ix_wbs_node_parent_id", "parent_id"),
        Index("ix_wbs_node_project_id", "project_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("wbs_node.id"), nullable=True
    )
    kind: Mapped[WBSNodeKind] = mapped_column(SAEnum(WBSNodeKind), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str | None] = mapped_column(String(512))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    project_id: Mapped[str] = mapped_column(String(256), nullable=False)
    din276_kostengruppe: Mapped[str | None] = mapped_column(String(32), nullable=True)

    parent: Mapped["WBSNode | None"] = relationship(
        remote_side=[id], back_populates="children"
    )
    children: Mapped[list["WBSNode"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    notes: Mapped[list["Note"]] = relationship(
        back_populates="wbs_node", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="wbs_node")
