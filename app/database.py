"""Async SQLAlchemy engine, session factory, and declarative base."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


def build_engine(database_url: str | None = None) -> AsyncEngine:
    """Create and return an async SQLAlchemy engine."""
    url = database_url or get_settings().database_url
    return create_async_engine(url, echo=False, pool_pre_ping=True)


def build_session_factory(
    engine: AsyncEngine | None = None,
) -> async_sessionmaker[AsyncSession]:
    """Return an async session factory bound to *engine*."""
    return async_sessionmaker(
        bind=engine or build_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
    )


_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the global session factory, creating it once."""
    global _session_factory
    if _session_factory is None:
        _session_factory = build_session_factory()
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a transactional DB session."""
    async with get_session_factory()() as session, session.begin():
        yield session
