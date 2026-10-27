"""
Custom Exceptions and Global Exception Handlers for MediLens AI.
Provides clean, consistent flat error responses across all endpoints.
Frontend contract: {"error": "<message>", "code": "MACHINE_CODE", "details": {...}}
"""

from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import logger


class MediLensException(Exception):
    """Base exception for all MediLens AI custom errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class DatabaseException(MediLensException):
    def __init__(self, message: str = "Database operation failed", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class FeatureUnavailableException(MediLensException):
    def __init__(self, message: str = "Feature is not available yet", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="FEATURE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class UnreadableDocumentException(MediLensException):
    def __init__(self, message: str = "Please upload a clearer photo or PDF", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="UNREADABLE_DOCUMENT",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            details=details,
        )


class NotFoundException(MediLensException):
    def __init__(self, resource: str = "Resource", details: dict[str, Any] | None = None):
        super().__init__(
            message=f"{resource} not found",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class UnauthorizedException(MediLensException):
    def __init__(self, message: str = "Authentication required", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class ForbiddenException(MediLensException):
    def __init__(self, message: str = "Access forbidden", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ValidationException(MediLensException):
    def __init__(self, message: str = "Validation error", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=422,
            details=details,
        )


class DecryptionError(MediLensException):
    """Raised when field-level decryption fails or user-ID binding is violated."""

    def __init__(
        self,
        message: str = "Medical data could not be decrypted",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            code="DATA_UNREADABLE",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )


class EmergencyDetectedException(MediLensException):
    """Triggered when medical document or query shows life-threatening emergency indicators."""

    def __init__(
        self,
        message: str = "Critical health warning sign detected. Seek emergency medical attention immediately.",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            code="EMERGENCY_DETECTED",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


def format_error_response(
    code: str,
    message: str,
    details: Any | None = None,
) -> dict[str, Any]:
    """Returns a flat error envelope matching the frontend contract."""
    resp: dict[str, Any] = {"error": message, "code": code}
    if details:
        resp["details"] = details
    return resp


async def medilens_exception_handler(request: Request, exc: MediLensException) -> JSONResponse:
    logger.warning("MediLensException: [%s] %s on %s", exc.code, exc.message, request.url.path)
    headers: dict[str, str] = {}
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        headers["WWW-Authenticate"] = "Bearer"
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_response(
            code=exc.code,
            message=exc.message,
            details=exc.details if exc.details else None,
        ),
        headers=headers,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Log ONLY field locations and error types — never log submitted input values
    safe_errors = []
    for err in exc.errors():
        loc = " -> ".join(str(part) for part in err.get("loc", []))
        safe_errors.append({
            "field": loc,
            "type": err.get("type", ""),
            "issue": err.get("msg", "Invalid value"),
        })
    logger.warning("Validation error on %s: %d field(s) failed", request.url.path, len(safe_errors))

    return JSONResponse(
        status_code=422,
        content=format_error_response(
            code="VALIDATION_ERROR",
            message="Request input validation failed",
            details={"fields": safe_errors},
        ),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    headers: dict[str, str] = {}
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        headers["WWW-Authenticate"] = "Bearer"
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_response(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
        ),
        headers=headers,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled server error on %s: %s", request.url.path, type(exc).__name__, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=format_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Our engineers have been alerted.",
        ),
    )
