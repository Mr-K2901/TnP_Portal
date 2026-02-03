"""
Job Schemas - Request/Response Validation
Clean Pydantic models for Job CRUD operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class JobCreate(BaseModel):
    """Schema for creating a new job posting (Admin only)."""
    company_name: str = Field(..., min_length=1, max_length=200)
    role: str = Field(..., min_length=1, max_length=200)
    ctc: Optional[str] = Field(None, max_length=50, description="e.g., '12-15 LPA'")
    min_cgpa: Optional[float] = Field(0, ge=0, le=10)
    jd_link: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None)
    is_active: bool = True


class JobUpdate(BaseModel):
    """Schema for updating a job posting (Admin only). All fields optional."""
    company_name: Optional[str] = Field(None, min_length=1, max_length=200)
    role: Optional[str] = Field(None, min_length=1, max_length=200)
    ctc: Optional[str] = Field(None, max_length=50)
    min_cgpa: Optional[float] = Field(None, ge=0, le=10)
    jd_link: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None)
    is_active: Optional[bool] = None


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class JobResponse(BaseModel):
    """Single job response."""
    id: UUID
    company_name: str
    role: str
    ctc: Optional[str]
    min_cgpa: float
    is_active: bool
    jd_link: Optional[str]
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    """Paginated job list response."""
    jobs: List[JobResponse]
    total: int
    page: int
    limit: int
