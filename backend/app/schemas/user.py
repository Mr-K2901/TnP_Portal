"""
User Schemas - Request/Response Validation
These are NOT 1:1 with database models.
They define what the API accepts and returns.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime


# =============================================================================
# AUTH SCHEMAS (Login/Register)
# =============================================================================

class UserRegister(BaseModel):
    """Schema for user registration request."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    role: Literal["STUDENT", "ADMIN"] = "STUDENT"
    
    # Student-specific fields (required if role=STUDENT)
    full_name: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = Field(None, ge=0, le=10)


class UserLogin(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for decoded token payload."""
    sub: str  # user_id as string
    role: str
    exp: int


# =============================================================================
# USER RESPONSE SCHEMAS
# =============================================================================

class UserBase(BaseModel):
    """Base user info (no sensitive data)."""
    id: UUID
    email: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProfileResponse(BaseModel):
    """Student profile response."""
    user_id: UUID
    full_name: str
    cgpa: Optional[float]
    branch: str
    resume_url: Optional[str]
    is_placed: bool
    
    class Config:
        from_attributes = True


class UserWithProfile(UserBase):
    """User with optional profile (for students)."""
    profile: Optional[ProfileResponse] = None
