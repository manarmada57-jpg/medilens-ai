"""
MediLens AI — Understand Your Health, Clearly.
FastAPI Application Entry Point.
"""

import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any, cast

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.errors import (
    MediLensException,
    http_exception_handler,
    medilens_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import logger
from app.db.indexes import create_indexes
from app.db.mongo import close_mongo_connection, connect_to_mongo, db_manager
from app.routers.auth import router as auth_router
from app.routers.documents import analyze_router
from app.routers.documents import router as documents_router
from app.routers.health import router as health_router
from app.routers.medicines import router as medicines_router
from app.routers.meta import router as meta_router
from app.routers.profile import router as profile_router
from app.routers.selfcare import router as selfcare_router
from app.routers.skin import router as skin_router
from app.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application Lifespan Context Manager.
    Manages startup and shutdown routines, database connection pools, and index verification.
    """
    logger.info("=" * 60)
    logger.info("Starting %s v%s [%s]", settings.APP_NAME, settings.APP_VERSION, settings.APP_ENV)
    logger.info("=" * 60)

    # Database Initialization
    await connect_to_mongo()

    # Index Creation — in non-testing environments, a failure here prevents startup
    if db_manager.db is not None:
        try:
            logger.info("Verifying and applying MongoDB collection indexes...")
            await create_indexes(db_manager.db)
        except RuntimeError as e:
            # create_indexes already raised with a clear message
            logger.critical("Startup aborted due to index failure: %s", str(e))
            raise
        except Exception as e:
            if not settings.is_testing:
                logger.critical("Unexpected index error — aborting startup: %s", str(e))
                raise
            logger.warning("Index creation warning (testing): %s", str(e))

    # Start Background Task Scheduler
    if not settings.is_testing:
        start_scheduler()

    yield

    # Clean Shutdown
    logger.info("Shutting down MediLens AI backend...")
    if not settings.is_testing:
        stop_scheduler()
    await close_mongo_connection()
    logger.info("Shutdown complete.")


def create_application() -> FastAPI:
    """FastAPI Application Factory."""
    docs_url = "/docs" if settings.docs_enabled else None
    redoc_url = "/redoc" if settings.docs_enabled else None
    openapi_url = "/openapi.json" if settings.docs_enabled else None

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "MediLens AI is a secure, patient-friendly health education platform. "
            "It assists patients in understanding medical reports and doctor-prescribed regimens. "
            "MediLens AI does NOT provide medical diagnoses or alter treatments."
        ),
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )

    # -----------------------------------------------------------------------
    # Security Headers Middleware
    # -----------------------------------------------------------------------
    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next: Any) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        return response

    # -----------------------------------------------------------------------
    # Request-ID Middleware
    # -----------------------------------------------------------------------
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next: Any) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    # CORS Middleware configured for React frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

    # Register Global Exception Handlers
    app.add_exception_handler(MediLensException, cast(Any, medilens_exception_handler))
    app.add_exception_handler(RequestValidationError, cast(Any, validation_exception_handler))
    app.add_exception_handler(StarletteHTTPException, cast(Any, http_exception_handler))
    app.add_exception_handler(Exception, cast(Any, unhandled_exception_handler))

    # Register Routers
    app.include_router(health_router)
    app.include_router(meta_router)
    app.include_router(auth_router)
    app.include_router(profile_router)
    app.include_router(medicines_router)
    app.include_router(documents_router)
    app.include_router(analyze_router)
    app.include_router(skin_router)
    app.include_router(selfcare_router)

    # Root welcome route
    @app.get("/", tags=["System Information"])
    async def root() -> dict[str, str]:
        return {
            "name": settings.APP_NAME,
            "status": "operational",
            "documentation": "/docs" if settings.docs_enabled else "disabled",
            "health": "/api/health/ready",
            "disclaimer": (
                "MediLens AI is an educational tool and does not provide "
                "medical diagnosis or replace physician advice."
            ),
        }

    return app


app = create_application()
