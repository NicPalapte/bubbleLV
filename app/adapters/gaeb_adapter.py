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

    _filename: str = ""

    def parse_bytes(self, data: bytes, filename: str) -> ParsedLV:
        """Parse raw GAEB bytes and return a fully-mapped ParsedLV."""
        self._filename = filename

        try:
            from pygaeb.exceptions import GAEBParseError as _PyParseError
            from pygaeb.exceptions import GAEBValidationError as _PyValError
            from pygaeb.parser.gaeb_parser import GAEBParser
        except ImportError as exc:
            raise GAEBParseError("pyGAEB is not installed") from exc

        data = self._strip_xml_comments(data, filename)
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

    def _strip_xml_comments(self, data: bytes, filename: str) -> bytes:
        """Remove XML comments before passing to pyGAEB.

        Some exporters (e.g. iTWO) embed comments inside item Description
        elements. pyGAEB's attachment parser calls _local_tag() on every
        descendant node and crashes when it encounters lxml comment nodes
        whose .tag is a Cython callable rather than a string.
        """
        try:
            from lxml import etree  # type: ignore[import-untyped]

            parser = etree.XMLParser(remove_comments=True)
            root = etree.fromstring(data, parser=parser)
            stripped: bytes = etree.tostring(
                root, xml_declaration=True, encoding="UTF-8"
            )
            if stripped != data:
                log.warning("gaeb.preprocess.comments_stripped", filename=filename)
            return stripped
        except Exception:
            return data

    def _map_lots(self, doc: object) -> list[ParsedLot]:
        """Map pyGAEB Lot objects to ParsedLot instances."""
        from pygaeb.models.document import GAEBDocument

        if not isinstance(doc, GAEBDocument):
            raise GAEBParseError(f"Expected GAEBDocument, got {type(doc).__name__}")
        if not doc.award or not doc.award.boq:
            return []

        return [self._map_lot(lot) for lot in doc.award.boq.lots]

    def _map_lot(self, lot: object) -> ParsedLot:
        """Map a single pyGAEB Lot to ParsedLot."""
        from pygaeb.models.boq import Lot as PyLot

        if not isinstance(lot, PyLot):
            raise GAEBParseError(f"Expected Lot, got {type(lot).__name__}")

        if getattr(lot, "body", None) is None:
            log.warning("gaeb.lot.no_body", lot_id=lot.rno)
            return ParsedLot(lot_id=lot.rno, label=lot.label or None, sections=[])

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

        if not isinstance(cat, BoQCtgy):
            log.warning(
                "gaeb.section.unexpected_type",
                type=type(cat).__name__,
                parent_path=".".join(parent_rno_path),
            )
            return []

        current_path = parent_rno_path + [cat.rno]

        if cat.subcategories:
            sections: list[ParsedSection] = []
            for sub in cat.subcategories:
                sections.extend(self._collect_sections(sub, current_path))
            return sections

        section_id = ".".join(current_path)
        positions: list[ParsedPosition] = []
        for item in cat.items:
            try:
                positions.append(self._map_item(item, current_path))
            except Exception as exc:
                log.warning(
                    "gaeb.item.map_failed",
                    filename=self._filename,
                    section_id=section_id,
                    oz=getattr(item, "oz", "<unknown>"),
                    error=str(exc),
                    error_type=type(exc).__name__,
                )
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

        if not isinstance(item, Item):
            raise GAEBParseError(f"Expected Item, got {type(item).__name__}")

        oz = ".".join(parent_rno_path + [item.oz])

        raw_item_type = item.item_type.value if item.item_type else "Normal"
        position_type = _ITEM_TYPE_MAP.get(raw_item_type)
        if position_type is None:
            log.warning(
                "gaeb.item.unknown_type",
                filename=self._filename,
                oz=oz,
                raw_item_type=raw_item_type,
            )
            position_type = PositionType.NORMAL

        qty: float | None = None
        if item.qty is not None:
            try:
                qty = float(item.qty)
            except (ValueError, TypeError) as exc:
                log.warning(
                    "gaeb.item.qty_invalid",
                    filename=self._filename,
                    oz=oz,
                    raw_value=str(item.qty),
                    error=str(exc),
                )

        unit_price: float | None = None
        if item.unit_price is not None:
            try:
                unit_price = float(item.unit_price)
            except (ValueError, TypeError) as exc:
                log.warning(
                    "gaeb.item.unit_price_invalid",
                    filename=self._filename,
                    oz=oz,
                    raw_value=str(item.unit_price),
                    error=str(exc),
                )

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
