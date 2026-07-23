"""Service layer for GAEB import orchestration (F-01)."""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.gaeb_adapter import GAEBParserProtocol, PyGAEBAdapter
from app.models.lv import SourceType
from app.repositories.lv import LVRepository
from app.schemas.gaeb import LVImportResponse, ParsedLot, ParsedLV, ParsedSection
from app.schemas.lv_draft import LotDraft, LVDraft, PositionDraft, SectionDraft

log = structlog.get_logger(__name__)


def _map_to_draft(parsed: ParsedLV) -> LVDraft:
    """Map the adapter's `ParsedLV` onto the neutral `LVDraft` write model."""
    return LVDraft(
        project_name=parsed.project_name,
        client=parsed.client,
        deadline=parsed.deadline,
        source_type=SourceType.GAEB,
        source_metadata={"gaeb_version": parsed.gaeb_version},
        lots=[_map_lot(lot) for lot in parsed.lots],
    )


def _map_lot(lot: ParsedLot) -> LotDraft:
    return LotDraft(
        number=lot.lot_id,
        label=lot.label,
        sections=[_map_section(section) for section in lot.sections],
    )


def _map_section(section: ParsedSection) -> SectionDraft:
    return SectionDraft(
        number=section.section_id,
        label=section.label,
        positions=[
            PositionDraft(
                oz=p.oz,
                short_text=p.short_text,
                long_text=p.long_text,
                unit=p.unit,
                quantity=p.quantity,
                unit_price=p.unit_price,
                position_type=p.position_type,
            )
            for p in section.positions
        ],
    )


class GAEBImportService:
    """Orchestrates parsing, persistence and response assembly for F-01."""

    def __init__(
        self,
        session: AsyncSession,
        adapter: GAEBParserProtocol | None = None,
    ) -> None:
        """Initialise with a DB session and optional adapter override.

        Args:
            session: Active async SQLAlchemy session.
            adapter: Parser implementation; defaults to PyGAEBAdapter.
        """
        self._repo = LVRepository(session)
        self._adapter: GAEBParserProtocol = adapter or PyGAEBAdapter()

    async def import_file(
        self,
        project_id: str,
        data: bytes,
        filename: str,
    ) -> LVImportResponse:
        """Parse a GAEB file and upsert it into the database.

        Args:
            project_id: External business key supplied via the URL.
            data: Raw file bytes from the multipart upload.
            filename: Original filename for format detection.

        Returns:
            LVImportResponse with counts of created/updated positions.

        Raises:
            GAEBParseError: File cannot be parsed.
            GAEBValidationError: File fails validation rules.
            GAEBVersionError: Unsupported GAEB version.
        """
        log.info("gaeb.import_start", project_id=project_id, filename=filename)

        parsed = self._adapter.parse_bytes(data, filename)
        draft = _map_to_draft(parsed)

        existing = await self._repo.get_lv_by_project_id(project_id)
        existing_count = (
            await self._repo.count_positions(existing.id) if existing else 0
        )

        lv = await self._repo.persist_lv(project_id, draft)

        total = await self._repo.count_positions(lv.id)
        created = max(0, total - existing_count)
        updated = total - created

        log.info(
            "gaeb.import_done",
            project_id=project_id,
            total=total,
            created=created,
            updated=updated,
        )
        return LVImportResponse(
            lv_id=lv.id,
            project_id=lv.project_id,
            project_name=lv.project_name,
            positions_total=total,
            positions_created=created,
            positions_updated=updated,
        )
