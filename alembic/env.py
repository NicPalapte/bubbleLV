"""Alembic migration environment – wires async SQLAlchemy engine."""

import asyncio
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine

# Import all models so their metadata is registered before autogenerate.
import app.models  # noqa: F401
from alembic import context
from app.config import get_settings
from app.database import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    """Return the DB URL from app settings (overrides alembic.ini value)."""
    return get_settings().database_url


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (SQL script output)."""
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: object) -> None:
    """Execute migrations on an open synchronous connection."""
    context.configure(connection=connection, target_metadata=target_metadata)  # type: ignore[arg-type]
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations using an async engine."""
    engine = create_async_engine(get_url())
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
