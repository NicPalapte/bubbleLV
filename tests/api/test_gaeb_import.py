"""API tests for POST /api/v1/gaeb/import/{project_id}."""

import pathlib
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.core.exceptions import GAEBParseError, GAEBVersionError
from app.schemas.gaeb import LVImportResponse

FIXTURES_DIR = pathlib.Path(__file__).parent.parent / "fixtures"


@pytest.fixture()
def sample_bytes() -> bytes:
    return (FIXTURES_DIR / "sample.X83").read_bytes()


async def test_import_returns_200_with_valid_file(
    api_client: AsyncClient,
    sample_bytes: bytes,
) -> None:
    response = await api_client.post(
        "/api/v1/gaeb/import/proj-integration",
        files={"file": ("sample.X83", sample_bytes, "application/xml")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["project_id"] == "proj-integration"
    assert body["positions_total"] == 3
    assert body["positions_created"] == 3
    assert body["positions_updated"] == 0


async def test_import_is_idempotent(
    api_client: AsyncClient,
    sample_bytes: bytes,
) -> None:
    """Second import of the same file updates positions, not creates."""
    for _ in range(2):
        response = await api_client.post(
            "/api/v1/gaeb/import/proj-idempotent",
            files={"file": ("sample.X83", sample_bytes, "application/xml")},
        )
        assert response.status_code == 200

    body = response.json()
    assert body["positions_total"] == 3
    assert body["positions_updated"] == 3
    assert body["positions_created"] == 0


async def test_import_returns_400_on_parse_error(
    api_client: AsyncClient,
) -> None:
    with patch(
        "app.services.gaeb.GAEBImportService.import_file",
        side_effect=GAEBParseError("malformed XML"),
    ):
        response = await api_client.post(
            "/api/v1/gaeb/import/proj-bad",
            files={"file": ("bad.X83", b"not xml", "application/xml")},
        )
    assert response.status_code == 400
    assert "malformed XML" in response.json()["detail"]


async def test_import_returns_415_on_version_error(
    api_client: AsyncClient,
) -> None:
    with patch(
        "app.services.gaeb.GAEBImportService.import_file",
        side_effect=GAEBVersionError("version '90' not supported"),
    ):
        response = await api_client.post(
            "/api/v1/gaeb/import/proj-old",
            files={"file": ("old.D83", b"data", "application/xml")},
        )
    assert response.status_code == 415
    assert "90" in response.json()["detail"]


async def test_import_response_schema(
    api_client: AsyncClient,
    sample_bytes: bytes,
) -> None:
    response = await api_client.post(
        "/api/v1/gaeb/import/proj-schema",
        files={"file": ("sample.X83", sample_bytes, "application/xml")},
    )
    assert response.status_code == 200
    parsed = LVImportResponse.model_validate(response.json())
    assert parsed.project_id == "proj-schema"
    assert parsed.positions_total > 0
