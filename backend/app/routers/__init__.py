"""Routers package initialization."""
from app.routers.auth import router as auth_router
from app.routers.documents import analyze_router
from app.routers.documents import router as documents_router
from app.routers.health import router as health_router
from app.routers.medicines import router as medicines_router
from app.routers.profile import router as profile_router
from app.routers.selfcare import router as selfcare_router
from app.routers.skin import router as skin_router

__all__ = [
    "health_router",
    "auth_router",
    "profile_router",
    "medicines_router",
    "documents_router",
    "analyze_router",
    "skin_router",
    "selfcare_router",
]
