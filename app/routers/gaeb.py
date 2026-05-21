"""FastAPI router for the GAEB file import endpoint (F-01)."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    GAEBParseError,
    GAEBValidationError,
    GAEBVersionError,
)
from app.database import get_db
from app.schemas.gaeb import LVImportResponse
from app.services.gaeb import GAEBImportService

router = APIRouter(prefix="/gaeb", tags=["gaeb"])


@router.post(
    "/import/{project_id}",
    response_model=LVImportResponse,
    status_code=status.HTTP_200_OK,
    summary="Import or re-import a GAEB DA XML file",
)
async def import_gaeb(
    project_id: str,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
) -> LVImportResponse:
    """Accept a GAEB DA XML upload and upsert it into the LV database.

    Args:
        project_id: External business key; used as idempotency key.
        file: Multipart file upload (.X81/.X83/.X84 or .gaeb).
        db: Injected async DB session.

    Returns:
        LVImportResponse with position counts.

    Raises:
        422: File missing or content-type not acceptable.
        400: GAEB parse or validation error.
        415: Unsupported GAEB version.
    """
    data = await file.read()
    filename = file.filename or "upload.X83"

    service = GAEBImportService(db)
    try:
        return await service.import_file(project_id, data, filename)
    except GAEBVersionError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(exc),
        ) from exc
    except (GAEBParseError, GAEBValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
