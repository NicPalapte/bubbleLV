"""Neutral write model for LV persistence — source-agnostic, no GAEB vocabulary.

Any importer (GAEB today, Excel/manual later) maps its own parsed structure
onto this model; `LVRepository.persist_lv` only ever consumes an `LVDraft`.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.lv import SourceType
from app.models.position import PositionType


class PositionDraft(BaseModel):
    """A single Leistungsposition awaiting persistence."""

    model_config = ConfigDict(frozen=True)

    oz: str
    short_text: str
    long_text: str = ""
    unit: str | None = None
    quantity: float | None = None
    unit_price: float | None = None
    position_type: PositionType = PositionType.NORMAL
    attributes: dict[str, Any] = {}


class SectionDraft(BaseModel):
    """An Abschnitt (section), self-nestable via `sections`."""

    model_config = ConfigDict(frozen=True)

    number: str
    label: str | None = None
    parent_number: str | None = None
    positions: list[PositionDraft] = []
    sections: list["SectionDraft"] = []


class LotDraft(BaseModel):
    """A Los (lot) within the LV."""

    model_config = ConfigDict(frozen=True)

    number: str
    label: str | None = None
    sections: list[SectionDraft] = []


class LVDraft(BaseModel):
    """Full neutral write model for one Leistungsverzeichnis."""

    model_config = ConfigDict(frozen=True)

    project_name: str | None = None
    client: str | None = None
    deadline: datetime | None = None
    source_type: SourceType
    source_metadata: dict[str, Any] = {}
    lots: list[LotDraft] = []
