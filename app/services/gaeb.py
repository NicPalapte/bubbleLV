"""Service layer for GAEB import orchestration (F-01)."""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.gaeb_adapter import GAEBParserProtocol, PyGAEBAdapter
from app.repositories.lv import LVRepository
from app.schemas.gaeb import LVImportResponse

log = structlog.get_logger(__name__)


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

        existing = await self._repo.get_lv_by_project_id(project_id)
        existing_count = (
            await self._repo.count_positions(existing.id) if existing else 0
        )

        lv = await self._repo.persist_lv(project_id, parsed)

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
