"""Unit tests for GAEBImportService – adapter and repo are mocked."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import GAEBParseError, GAEBValidationError, GAEBVersionError
from app.models.position import PositionType
from app.schemas.gaeb import (
    LVImportResponse,
    ParsedLot,
    ParsedLV,
    ParsedPosition,
    ParsedSection,
)
from app.services.gaeb import GAEBImportService


def _make_parsed_lv() -> ParsedLV:
    pos = ParsedPosition(
        oz="0010",
        short_text="Oberboden abtragen",
        long_text="",
        unit="m3",
        quantity=100.0,
        unit_price=12.5,
        position_type=PositionType.NORMAL,
    )
    section = ParsedSection(section_id="01", label="Erdarbeiten", positions=[pos])
    lot = ParsedLot(lot_id="1", label="Default", sections=[section])
    return ParsedLV(
        gaeb_project_id="TEST-001",
        project_name="Testprojekt",
        client="Muster AG",
        deadline=None,
        gaeb_version="3.3",
        lots=[lot],
    )


@pytest.fixture()
def mock_session() -> MagicMock:
    return MagicMock()


@pytest.fixture()
def mock_repo(mock_session: MagicMock) -> MagicMock:
    repo = MagicMock()
    lv = MagicMock()
    lv.id = uuid4()
    lv.project_id = "proj-1"
    lv.project_name = "Testprojekt"
    repo.get_lv_by_project_id = AsyncMock(return_value=None)
    repo.count_positions = AsyncMock(return_value=1)
    repo.persist_lv = AsyncMock(return_value=lv)
    return repo


async def test_import_file_returns_response(
    mock_session: MagicMock, mock_repo: MagicMock
) -> None:
    adapter = MagicMock()
    adapter.parse_bytes = MagicMock(return_value=_make_parsed_lv())

    with patch("app.services.gaeb.LVRepository", return_value=mock_repo):
        service = GAEBImportService(session=mock_session, adapter=adapter)
        result = await service.import_file("proj-1", b"data", "sample.X83")

    assert isinstance(result, LVImportResponse)
    assert result.project_id == "proj-1"
    assert result.positions_total == 1
    adapter.parse_bytes.assert_called_once_with(b"data", "sample.X83")


async def test_import_file_propagates_parse_error(
    mock_session: MagicMock,
) -> None:
    adapter = MagicMock()
    adapter.parse_bytes = MagicMock(side_effect=GAEBParseError("bad xml"))

    service = GAEBImportService(session=mock_session, adapter=adapter)

    with pytest.raises(GAEBParseError, match="bad xml"):
        await service.import_file("proj-1", b"bad", "bad.X83")


async def test_import_file_propagates_version_error(
    mock_session: MagicMock,
) -> None:
    adapter = MagicMock()
    adapter.parse_bytes = MagicMock(
        side_effect=GAEBVersionError("version '90' not supported")
    )

    service = GAEBImportService(session=mock_session, adapter=adapter)

    with pytest.raises(GAEBVersionError):
        await service.import_file("proj-1", b"data", "old.D83")


async def test_import_file_propagates_validation_error(
    mock_session: MagicMock,
) -> None:
    adapter = MagicMock()
    adapter.parse_bytes = MagicMock(
        side_effect=GAEBValidationError("missing required field")
    )

    service = GAEBImportService(session=mock_session, adapter=adapter)

    with pytest.raises(GAEBValidationError):
        await service.import_file("proj-1", b"data", "sample.X83")
