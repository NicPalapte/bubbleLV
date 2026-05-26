"""FastAPI application factory – mounts all routers and configures middleware."""

from fastapi import FastAPI

from app.routers import gaeb


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI instance ready to serve.
    """
    app = FastAPI(
        title="Bubble LV Manager",
        description="GAEB import and bid-management API",
        version="0.1.0",
    )

    app.include_router(gaeb.router, prefix="/api/v1")

    return app


app = create_app()
