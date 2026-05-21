"""Unit tests for PyGAEBAdapter – exception mapping and version gating."""

from unittest.mock import MagicMock, patch

import pytest

from app.adapters.gaeb_adapter import PyGAEBAdapter
from app.core.exceptions import GAEBParseError, GAEBValidationError, GAEBVersionError
from app.models.position import PositionType
from app.schemas.gaeb import ParsedLV


@pytest.fixture()
def adapter() -> PyGAEBAdapter:
    return PyGAEBAdapter()


def _make_mock_doc(version_value: str = "3.3") -> MagicMock:
    """Build a minimal fake GAEBDocument for mocking GAEBParser.parse_bytes."""
    from pygaeb.models.enums import SourceVersion

    version_map = {v.value: v for v in SourceVersion}
    source_version = version_map.get(version_value)

    doc = MagicMock()
    doc.source_version = source_version or MagicMock(value=version_value)

    award = MagicMock()
    award.prj_id = "TEST-001"
    award.project_name = "Testprojekt"
    award.client = "Muster AG"
    award.open_date = None

    item = MagicMock()
    item.oz = "0010"
    item.short_text = "Oberboden abtragen"
    item.long_text = "Oberboden abtragen, 30cm tief."
    item.qty = 100.0
    item.unit = "m3"
    item.unit_price = 12.5
    item.item_type = MagicMock(value="Normal")

    cat = MagicMock()
    cat.rno = "01"
    cat.label = "Erdarbeiten"
    cat.items = [item]

    lot = MagicMock()
    lot.rno = "1"
    lot.label = "Default"
    lot.body = MagicMock()
    lot.body.categories = [cat]

    boq = MagicMock()
    boq.lots = [lot]
    award.boq = boq
    doc.award = award

    return doc


async def test_parse_bytes_returns_parsed_lv(adapter: PyGAEBAdapter) -> None:
    mock_doc = _make_mock_doc("3.3")
    with (
        patch(
            "app.adapters.gaeb_adapter.PyGAEBAdapter._map_lots",
            return_value=[],
        ),
        patch(
            "pygaeb.parser.gaeb_parser.GAEBParser.parse_bytes",
            return_value=mock_doc,
        ),
    ):
        result = adapter.parse_bytes(b"<xml/>", "sample.X83")

    assert isinstance(result, ParsedLV)
    assert result.gaeb_project_id == "TEST-001"
    assert result.project_name == "Testprojekt"
    assert result.gaeb_version == "3.3"


async def test_parse_bytes_raises_version_error_for_gaeb90(
    adapter: PyGAEBAdapter,
) -> None:
    mock_doc = _make_mock_doc("90")
    with (
        patch(
            "pygaeb.parser.gaeb_parser.GAEBParser.parse_bytes",
            return_value=mock_doc,
        ),
        pytest.raises(GAEBVersionError, match="90"),
    ):
        adapter.parse_bytes(b"data", "old.D83")


async def test_parse_bytes_wraps_pygaeb_parse_error(
    adapter: PyGAEBAdapter,
) -> None:
    from pygaeb.exceptions import GAEBParseError as _PyParseError

    with (
        patch(
            "pygaeb.parser.gaeb_parser.GAEBParser.parse_bytes",
            side_effect=_PyParseError("malformed"),
        ),
        pytest.raises(GAEBParseError, match="malformed"),
    ):
        adapter.parse_bytes(b"bad", "bad.X83")


async def test_parse_bytes_wraps_pygaeb_validation_error(
    adapter: PyGAEBAdapter,
) -> None:
    from pygaeb.exceptions import GAEBValidationError as _PyValError

    with (
        patch(
            "pygaeb.parser.gaeb_parser.GAEBParser.parse_bytes",
            side_effect=_PyValError("invalid"),
        ),
        pytest.raises(GAEBValidationError, match="invalid"),
    ):
        adapter.parse_bytes(b"data", "sample.X83")


async def test_parse_bytes_wraps_unexpected_exception(
    adapter: PyGAEBAdapter,
) -> None:
    with (
        patch(
            "pygaeb.parser.gaeb_parser.GAEBParser.parse_bytes",
            side_effect=RuntimeError("unexpected"),
        ),
        pytest.raises(GAEBParseError, match="unexpected"),
    ):
        adapter.parse_bytes(b"data", "sample.X83")


def test_item_type_mapping_alternative(adapter: PyGAEBAdapter) -> None:
    from app.adapters.gaeb_adapter import _ITEM_TYPE_MAP

    assert _ITEM_TYPE_MAP["Alternative"] == PositionType.ALTERNATIV
    assert _ITEM_TYPE_MAP["Eventual"] == PositionType.BEDARF
    assert _ITEM_TYPE_MAP["Supplement"] == PositionType.ZULAGENPOSITION
    assert _ITEM_TYPE_MAP["Normal"] == PositionType.NORMAL
