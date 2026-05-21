"""Shared pytest fixtures for unit, integration, and API test suites."""

import pathlib
from collections.abc import AsyncGenerator
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.database import Base, get_db
from app.main import create_app
from app.models import LV, AuditLog, Lot, Note, Position, Section  # noqa: F401

FIXTURES_DIR = pathlib.Path(__file__).parent / "fixtures"

TEST_DB_URL = "postgresql+asyncpg://lvmanager:lvmanager@db:5432/lvmanager_test"


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """Use asyncio as the async backend for anyio/pytest-asyncio."""
    return "asyncio"


@pytest_asyncio.fixture(scope="function")
async def db_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create a fresh test database engine with all tables."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional session that rolls back after each test."""
    factory = async_sessionmaker(
        bind=db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with factory() as session, session.begin():
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def api_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient wired to the FastAPI app with DB session overridden."""
    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


@pytest.fixture()
def sample_gaeb_bytes() -> bytes:
    """Raw bytes of the minimal sample GAEB DA XML 3.3 fixture."""
    return (FIXTURES_DIR / "sample.X83").read_bytes()


@pytest.fixture()
def mock_adapter() -> MagicMock:
    """A MagicMock that satisfies GAEBParserProtocol."""
    return MagicMock()
