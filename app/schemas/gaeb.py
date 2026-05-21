"""Pydantic schemas for GAEB import — adapter boundary + API response."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.position import PositionType


class ParsedPosition(BaseModel):
    """Single GAEB position as returned by the adapter (pyGAEB-free)."""

    model_config = ConfigDict(frozen=True)

    oz: str
    short_text: str
    long_text: str
    unit: str | None
    quantity: float | None
    unit_price: float | None
    position_type: PositionType


class ParsedSection(BaseModel):
    """Abschnitt (section) within a Lot, may be nested one level."""

    model_config = ConfigDict(frozen=True)

    section_id: str
    label: str | None
    positions: list[ParsedPosition]


class ParsedLot(BaseModel):
    """Los (lot) within the parsed LV."""

    model_config = ConfigDict(frozen=True)

    lot_id: str
    label: str | None
    sections: list[ParsedSection]


class ParsedLV(BaseModel):
    """Full parsed Leistungsverzeichnis returned by the adapter."""

    model_config = ConfigDict(frozen=True)

    gaeb_project_id: str | None
    project_name: str | None
    client: str | None
    deadline: datetime | None
    gaeb_version: str | None
    lots: list[ParsedLot]


class PositionOut(BaseModel):
    """Position as returned in an API response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    oz: str
    short_text: str
    long_text: str
    unit: str | None
    quantity: float | None
    unit_price: float | None
    position_type: PositionType


class LVImportResponse(BaseModel):
    """Response body for POST /api/v1/gaeb/import/{project_id}."""

    model_config = ConfigDict(from_attributes=True)

    lv_id: uuid.UUID
    project_id: str
    project_name: str | None
    positions_total: int
    positions_created: int
    positions_updated: int
