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


# ---------------------------------------------------------------------------
# Edge case / warning tests
# ---------------------------------------------------------------------------


def _make_spec_item(**overrides: object) -> MagicMock:
    """Return a MagicMock that passes isinstance(item, Item)."""
    from pygaeb.models.item import Item

    item = MagicMock(spec=Item)
    item.oz = "0010"
    item.short_text = "Test position"
    item.long_text = None
    item.qty = 10.0
    item.unit = "m3"
    item.unit_price = 5.0
    item.item_type = MagicMock(value="Normal")
    for key, val in overrides.items():
        setattr(item, key, val)
    return item


def test_qty_invalid_warns_and_returns_none(adapter: PyGAEBAdapter) -> None:
    from structlog.testing import capture_logs

    item = _make_spec_item(qty="10.5.5")
    adapter._filename = "test.X83"

    with capture_logs() as cap:
        pos = adapter._map_item(item, ["01"])

    assert pos.quantity is None
    events = [e["event"] for e in cap]
    assert "gaeb.item.qty_invalid" in events
    warning = next(e for e in cap if e["event"] == "gaeb.item.qty_invalid")
    assert warning["oz"] == "01.0010"
    assert warning["raw_value"] == "10.5.5"


def test_unit_price_invalid_warns_and_returns_none(adapter: PyGAEBAdapter) -> None:
    from structlog.testing import capture_logs

    item = _make_spec_item(unit_price="not_a_number")
    adapter._filename = "test.X83"

    with capture_logs() as cap:
        pos = adapter._map_item(item, ["01"])

    assert pos.unit_price is None
    events = [e["event"] for e in cap]
    assert "gaeb.item.unit_price_invalid" in events
    warning = next(e for e in cap if e["event"] == "gaeb.item.unit_price_invalid")
    assert warning["raw_value"] == "not_a_number"


def test_unknown_item_type_warns_and_defaults_normal(adapter: PyGAEBAdapter) -> None:
    from structlog.testing import capture_logs

    item = _make_spec_item(item_type=MagicMock(value="FutureType"))
    adapter._filename = "test.X83"

    with capture_logs() as cap:
        pos = adapter._map_item(item, ["01"])

    assert pos.position_type == PositionType.NORMAL
    events = [e["event"] for e in cap]
    assert "gaeb.item.unknown_type" in events
    warning = next(e for e in cap if e["event"] == "gaeb.item.unknown_type")
    assert warning["raw_item_type"] == "FutureType"


def test_bad_item_skipped_section_survives(adapter: PyGAEBAdapter) -> None:
    from pygaeb.models.boq import BoQCtgy
    from structlog.testing import capture_logs

    good_item = _make_spec_item(oz="0010", short_text="Good item")
    bad_item = MagicMock()  # not an Item instance → _map_item raises GAEBParseError
    bad_item.oz = "0020"

    cat = MagicMock(spec=BoQCtgy)
    cat.rno = "01"
    cat.label = "Testabschnitt"
    cat.subcategories = []
    cat.items = [good_item, bad_item]
    adapter._filename = "test.X83"

    with capture_logs() as cap:
        sections = adapter._collect_sections(cat, [])

    assert len(sections) == 1
    assert len(sections[0].positions) == 1
    assert sections[0].positions[0].oz == "01.0010"
    events = [e["event"] for e in cap]
    assert "gaeb.item.map_failed" in events
    warning = next(e for e in cap if e["event"] == "gaeb.item.map_failed")
    assert warning["oz"] == "0020"


def test_unexpected_category_type_skips_and_logs(adapter: PyGAEBAdapter) -> None:
    from structlog.testing import capture_logs

    adapter._filename = "test.X83"
    with capture_logs() as cap:
        result = adapter._collect_sections(object(), ["01"])

    assert result == []
    events = [e["event"] for e in cap]
    assert "gaeb.section.unexpected_type" in events


def test_lot_body_none_warns_returns_empty(adapter: PyGAEBAdapter) -> None:
    from pygaeb.models.boq import Lot as PyLot
    from structlog.testing import capture_logs

    lot = MagicMock(spec=PyLot)
    lot.rno = "1"
    lot.label = "LOS 1"
    lot.body = None

    with capture_logs() as cap:
        parsed_lot = adapter._map_lot(lot)

    assert parsed_lot.sections == []
    events = [e["event"] for e in cap]
    assert "gaeb.lot.no_body" in events


def test_map_lots_wrong_doc_type_raises(adapter: PyGAEBAdapter) -> None:
    with pytest.raises(GAEBParseError, match="Expected GAEBDocument"):
        adapter._map_lots(object())
