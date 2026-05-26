"""Integration tests for PyGAEBAdapter against the real sample fixture."""

import pathlib

import pytest

from app.adapters.gaeb_adapter import PyGAEBAdapter
from app.core.exceptions import GAEBVersionError
from app.models.position import PositionType
from app.schemas.gaeb import ParsedLV

FIXTURES_DIR = pathlib.Path(__file__).parent.parent / "fixtures"


@pytest.fixture(scope="module")
def adapter() -> PyGAEBAdapter:
    return PyGAEBAdapter()


@pytest.fixture(scope="module")
def sample_bytes() -> bytes:
    return (FIXTURES_DIR / "sample.X83").read_bytes()


@pytest.fixture(scope="module")
def parsed(adapter: PyGAEBAdapter, sample_bytes: bytes) -> ParsedLV:
    return adapter.parse_bytes(sample_bytes, "sample.X83")


def test_parsed_is_parsed_lv(parsed: ParsedLV) -> None:
    assert isinstance(parsed, ParsedLV)


def test_gaeb_version_extracted(parsed: ParsedLV) -> None:
    assert parsed.gaeb_version == "3.3"


def test_project_metadata_extracted(parsed: ParsedLV) -> None:
    assert parsed.project_name == "Testprojekt Umbau"
    assert parsed.client == "Muster AG"
    assert parsed.gaeb_project_id == "TEST-001"


def test_lots_present(parsed: ParsedLV) -> None:
    assert len(parsed.lots) == 1


def test_sections_present(parsed: ParsedLV) -> None:
    lot = parsed.lots[0]
    assert len(lot.sections) == 2
    labels = {s.label for s in lot.sections}
    assert "Erdarbeiten" in labels
    assert "Betonarbeiten" in labels


def test_positions_in_first_section(parsed: ParsedLV) -> None:
    erdarbeiten = next(s for s in parsed.lots[0].sections if s.label == "Erdarbeiten")
    assert len(erdarbeiten.positions) == 2
    ozs = {p.oz for p in erdarbeiten.positions}
    assert any(oz.endswith("0010") for oz in ozs)
    assert any(oz.endswith("0020") for oz in ozs)


def test_position_fields(parsed: ParsedLV) -> None:
    pos = next(
        p
        for s in parsed.lots[0].sections
        for p in s.positions
        if p.short_text == "Oberboden abtragen"
    )
    assert pos.unit == "m3"
    assert pos.quantity == pytest.approx(100.0)
    assert pos.unit_price == pytest.approx(12.5)
    assert pos.position_type == PositionType.NORMAL


@pytest.fixture(scope="module")
def deges_bytes() -> bytes:
    return (FIXTURES_DIR / "DEGES-Test.X83").read_bytes()


@pytest.fixture(scope="module")
def deges_parsed(adapter: PyGAEBAdapter, deges_bytes: bytes) -> ParsedLV:
    return adapter.parse_bytes(deges_bytes, "DEGES-Test.X83")


def test_deges_itwo_file_parses_without_error(deges_parsed: ParsedLV) -> None:
    assert isinstance(deges_parsed, ParsedLV)


def test_deges_all_positions_parsed(deges_parsed: ParsedLV) -> None:
    all_positions = [
        p for lot in deges_parsed.lots for s in lot.sections for p in s.positions
    ]
    assert len(all_positions) == 10


def test_deges_no_empty_oz(deges_parsed: ParsedLV) -> None:
    for lot in deges_parsed.lots:
        for section in lot.sections:
            for pos in section.positions:
                assert pos.oz.strip() != ""


def test_version_error_for_unsupported_version(adapter: PyGAEBAdapter) -> None:
    """Passing a document whose version resolves to GAEB 90 raises GAEBVersionError."""
    from unittest.mock import MagicMock, patch

    mock_doc = MagicMock()
    mock_doc.source_version = MagicMock(value="90")
    mock_doc.award = MagicMock()

    with (
        patch(
            "pygaeb.parser.gaeb_parser.GAEBParser.parse_bytes",
            return_value=mock_doc,
        ),
        pytest.raises(GAEBVersionError),
    ):
        adapter.parse_bytes(b"data", "old.D83")
