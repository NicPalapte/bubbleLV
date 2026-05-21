"""PyGAEBAdapter – sole pyGAEB integration point; returns internal Pydantic models."""

from typing import Protocol, runtime_checkable

import structlog

from app.core.exceptions import GAEBParseError, GAEBValidationError, GAEBVersionError
from app.models.position import PositionType
from app.schemas.gaeb import ParsedLot, ParsedLV, ParsedPosition, ParsedSection

log = structlog.get_logger(__name__)

_SUPPORTED_VERSIONS = frozenset(["2.0", "2.1", "3.0", "3.1", "3.2", "3.3"])

_ITEM_TYPE_MAP: dict[str, PositionType] = {
    "Normal": PositionType.NORMAL,
    "LumpSum": PositionType.NORMAL,
    "Alternative": PositionType.ALTERNATIV,
    "Eventual": PositionType.BEDARF,
    "TextOnly": PositionType.NORMAL,
    "BaseSurcharge": PositionType.ZULAGENPOSITION,
    "Index": PositionType.NORMAL,
    "Supplement": PositionType.ZULAGENPOSITION,
    "Markup": PositionType.ZULAGENPOSITION,
}


@runtime_checkable
class GAEBParserProtocol(Protocol):
    """Contract for GAEB file parsing; only implementation is PyGAEBAdapter."""

    def parse_bytes(self, data: bytes, filename: str) -> ParsedLV:
        """Parse raw GAEB bytes and return a fully-mapped ParsedLV.

        Args:
            data: Raw file contents.
            filename: Original filename (used for format detection).

        Returns:
            ParsedLV with all lots, sections and positions mapped.

        Raises:
            GAEBParseError: File cannot be parsed.
            GAEBValidationError: File parsed but fails validation rules.
            GAEBVersionError: GAEB version is outside the supported range.
        """
        ...


class PyGAEBAdapter:
    """Wraps pyGAEB; the only place in the codebase that imports pygaeb."""

    def parse_bytes(self, data: bytes, filename: str) -> ParsedLV:
        """Parse raw GAEB bytes and return a fully-mapped ParsedLV."""
        try:
            from pygaeb.exceptions import GAEBParseError as _PyParseError
            from pygaeb.exceptions import GAEBValidationError as _PyValError
            from pygaeb.parser.gaeb_parser import GAEBParser
        except ImportError as exc:
            raise GAEBParseError("pyGAEB is not installed") from exc

        log.info("gaeb.parse_start", filename=filename, size=len(data))

        try:
            doc = GAEBParser.parse_bytes(data, filename=filename)
        except _PyParseError as exc:
            raise GAEBParseError(str(exc)) from exc
        except _PyValError as exc:
            raise GAEBValidationError(str(exc)) from exc
        except Exception as exc:
            raise GAEBParseError(f"Unexpected parse error: {exc}") from exc

        version = doc.source_version.value if doc.source_version else None
        if version not in _SUPPORTED_VERSIONS:
            raise GAEBVersionError(
                f"GAEB version '{version}' is not supported "
                f"(supported: {sorted(_SUPPORTED_VERSIONS)})"
            )

        award = doc.award
        parsed = ParsedLV(
            gaeb_project_id=award.prj_id if award else None,
            project_name=award.project_name if award else None,
            client=award.client if award else None,
            deadline=award.open_date if award else None,
            gaeb_version=version,
            lots=self._map_lots(doc),
        )
        log.info(
            "gaeb.parse_done",
            filename=filename,
            lots=len(parsed.lots),
        )
        return parsed

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _map_lots(self, doc: object) -> list[ParsedLot]:
        """Map pyGAEB Lot objects to ParsedLot instances."""
        from pygaeb.models.document import GAEBDocument

        assert isinstance(doc, GAEBDocument)
        if not doc.award or not doc.award.boq:
            return []

        return [self._map_lot(lot) for lot in doc.award.boq.lots]

    def _map_lot(self, lot: object) -> ParsedLot:
        """Map a single pyGAEB Lot to ParsedLot."""
        from pygaeb.models.boq import Lot as PyLot

        assert isinstance(lot, PyLot)
        sections: list[ParsedSection] = []
        for cat in lot.body.categories:
            sections.extend(self._collect_sections(cat, parent_rno_path=[]))
        return ParsedLot(
            lot_id=lot.rno,
            label=lot.label or None,
            sections=sections,
        )

    def _collect_sections(
        self, cat: object, parent_rno_path: list[str]
    ) -> list[ParsedSection]:
        """Recursively collect sections; leaf categories become ParsedSection instances.

        GAEB allows BoQCtgy to nest arbitrarily before reaching items.  A
        category with subcategories is structural only; a category with items
        (and no subcategories) is a leaf that maps to one ParsedSection.
        """
        from pygaeb.models.boq import BoQCtgy

        assert isinstance(cat, BoQCtgy)
        current_path = parent_rno_path + [cat.rno]

        if cat.subcategories:
            sections: list[ParsedSection] = []
            for sub in cat.subcategories:
                sections.extend(self._collect_sections(sub, current_path))
            return sections

        section_id = ".".join(current_path)
        positions = [self._map_item(item, current_path) for item in cat.items]
        return [
            ParsedSection(
                section_id=section_id,
                label=cat.label or None,
                positions=positions,
            )
        ]

    def _map_item(self, item: object, parent_rno_path: list[str]) -> ParsedPosition:
        """Map a pyGAEB Item to ParsedPosition.

        Args:
            item: pyGAEB Item instance.
            parent_rno_path: RNO number segments of ancestor categories
                (e.g. ['001', '002']).  The item's own oz is appended to
                produce a fully-qualified position number like '001.002.0010'.
        """
        from pygaeb.models.item import Item

        assert isinstance(item, Item)
        oz = ".".join(parent_rno_path + [item.oz])
        position_type = _ITEM_TYPE_MAP.get(
            item.item_type.value if item.item_type else "Normal",
            PositionType.NORMAL,
        )
        qty = float(item.qty) if item.qty is not None else None
        unit_price = float(item.unit_price) if item.unit_price is not None else None
        raw_lt = item.long_text
        if raw_lt is None:
            long_text = ""
        elif hasattr(raw_lt, "plain_text"):
            long_text = raw_lt.plain_text or ""
        else:
            long_text = str(raw_lt)
        return ParsedPosition(
            oz=oz,
            short_text=item.short_text or "",
            long_text=long_text,
            unit=item.unit or None,
            quantity=qty,
            unit_price=unit_price,
            position_type=position_type,
        )
