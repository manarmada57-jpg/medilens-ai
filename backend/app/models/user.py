"""
User Authentication and Credential Pydantic Models.
Accepts both camelCase and snake_case on request models.
Returns camelCase on response models.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class UserSignupRequest(CamelModel):
    email: EmailStr = Field(..., description="Valid patient/user email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password (8–128 characters)")
    name: str = Field(..., min_length=1, max_length=100, description="Patient's full name")
    accept_terms: bool = Field(..., description="Must accept terms of service and privacy policy")
    timezone: str | None = Field("Asia/Kolkata", description="User timezone")
    language: str | None = Field("en", description="Preferred language (en/hi)")


class UserLoginRequest(CamelModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class RefreshTokenRequest(CamelModel):
    refresh_token: str = Field(..., description="Active rotating refresh token")


class UserInfo(BaseModel):
    """Compact user object returned inside auth responses (matches frontend contract)."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    email: str
    timezone: str = "Asia/Kolkata"
    language: str = "en"
    font_size: str = "normal"

    @computed_field
    def fontSize(self) -> str:
        return self.font_size


class TokenResponse(BaseModel):
    """Auth token response matching both standard OAuth2 and frontend expectations."""

    model_config = ConfigDict(populate_by_name=True)

    token: str = Field(..., description="Bearer JWT access token (alias for frontend)")
    access_token: str = Field(..., description="Bearer JWT access token")
    refresh_token: str = Field(..., description="Single-use rotating refresh token")
    token_type: str = Field("bearer", description="Token type header format")
    expires_in: int = Field(..., description="Access token lifetime in seconds")
    user: UserInfo = Field(..., description="Basic user info for the frontend")

    @computed_field
    def accessToken(self) -> str:
        return self.access_token

    @computed_field
    def refreshToken(self) -> str:
        return self.refresh_token

    @computed_field
    def tokenType(self) -> str:
        return self.token_type

    @computed_field
    def expiresIn(self) -> int:
        return self.expires_in


class MeUpdateRequest(CamelModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    timezone: str | None = None
    language: str | None = None
    font_size: str | None = None


class DeleteMeRequest(CamelModel):
    password: str = Field(..., description="Password confirmation for account deletion")


class PasswordChangeRequest(CamelModel):
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password (8–128 characters)")


class UserResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    email: EmailStr
    name: str
    timezone: str = "Asia/Kolkata"
    language: str = "en"
    font_size: str = "normal"
    is_active: bool = True
    created_at: Any = None

    @computed_field
    def fontSize(self) -> str:
        return self.font_size

    @computed_field
    def createdAt(self) -> Any:
        return self.created_at

    @computed_field
    def isActive(self) -> bool:
        return self.is_active


class UserInDB(BaseModel):
    id: str
    email: EmailStr
    name: str
    hashed_password: str
    timezone: str = "Asia/Kolkata"
    language: str = "en"
    font_size: str = "normal"
    created_at: str
