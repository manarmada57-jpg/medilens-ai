"""
FastAPI Dependencies: Authentication & Authorization.
Extracts authenticated user from signed Bearer JWT tokens.
"""

from typing import Any

from bson import ObjectId
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import UnauthorizedException
from app.core.security import decode_access_token
from app.db.indexes import USERS_COLLECTION
from app.db.mongo import get_database

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> dict[str, Any]:
    """
    Validates Bearer token and retrieves active user record from MongoDB.
    Raises UnauthorizedException (401) on missing, expired, or invalid tokens.
    """
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authentication token is required")

    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Token payload missing subject identifier")

    db = get_database()
    # Check by ObjectId or string ID
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    user = await db[USERS_COLLECTION].find_one(query)

    if not user:
        raise UnauthorizedException("User account no longer exists")

    if not user.get("is_active", True):
        raise UnauthorizedException("User account has been deactivated")

    # Normalize id field to string
    user["id"] = str(user["_id"])
    return user


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> dict[str, Any] | None:
    """Returns the authenticated user if credentials are valid, else returns None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials)
    except UnauthorizedException:
        return None
