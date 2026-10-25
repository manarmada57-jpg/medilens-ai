"""
User Authentication and Credential Pydantic Models.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserSignupRequest(BaseModel):
    email: EmailStr = Field(..., description="Valid patient/user email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password (8–128 characters)")
    name: str = Field(..., min_length=1, max_length=100, description="Patient's full name")
    accept_terms: bool = Field(..., description="Must accept terms of service and privacy policy")


class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Active rotating refresh token")


class UserInfo(BaseModel):
    """Compact user object returned inside auth responses (matches frontend contract)."""

    id: str
    name: str
    email: str


class TokenResponse(BaseModel):
    """Auth token response matching both standard OAuth2 and frontend expectations."""

    token: str = Field(..., description="Bearer JWT access token (alias for frontend)")
    access_token: str = Field(..., description="Bearer JWT access token")
    refresh_token: str = Field(..., description="Single-use rotating refresh token")
    token_type: str = Field("bearer", description="Token type header format")
    expires_in: int = Field(..., description="Access token lifetime in seconds")
    user: UserInfo = Field(..., description="Basic user info for the frontend")


class MeUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    timezone: str | None = None
    language: str | None = None
    font_size: str | None = None


class DeleteMeRequest(BaseModel):
    password: str = Field(..., description="Password confirmation for account deletion")


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password (8–128 characters)")


class UserResponse(BaseModel):
    id: str = Field(..., description="Unique User ID")
    name: str = Field(..., description="User's full name")
    email: EmailStr = Field(..., description="User email address")
    timezone: str = Field("Asia/Kolkata", description="IANA timezone")
    language: Literal["en", "hi"] = Field("en", description="Preferred language")
    font_size: Literal["normal", "large", "xlarge"] = Field("normal", description="Preferred font size")
    is_active: bool = Field(True, description="Account active status")
    created_at: datetime = Field(..., description="Registration timestamp")
