"""
Application Schemas - Request/Response Validation
Clean Pydantic models for Application operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from uuid import UUID
from datetime import datetime


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class ApplicationCreate(BaseModel):
    """Schema for applying to a job (Student only)."""
    job_id: UUID


class ApplicationStatusUpdate(BaseModel):
    """Schema for updating application status (Admin only)."""
    status: Literal[
        "APPLIED", "SELECTED", "IN_PROCESS", "INTERVIEW_SCHEDULED",
        "SHORTLISTED", "OFFER_RELEASED", "PLACED", "OFFER_DECLINED",
        "WITHDRAWN", "REJECTED"
    ]


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class JobBrief(BaseModel):
    """Brief job info for application response."""
    id: UUID
    company_name: str
    role: str
    ctc: Optional[str]
    
    class Config:
        from_attributes = True


class ProfileBrief(BaseModel):
    """Brief profile info for admin view."""
    full_name: str
    cgpa: Optional[float] = None
    branch: str
    
    class Config:
        from_attributes = True


class StudentBrief(BaseModel):
    """Brief student info for admin view."""
    id: UUID
    email: str
    profile: Optional[ProfileBrief] = None
    
    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    """Single application response."""
    id: UUID
    job_id: UUID
    student_id: UUID
    status: str
    applied_at: datetime
    job: Optional[JobBrief] = None
    
    class Config:
        from_attributes = True


class ApplicationWithStudent(BaseModel):
    """Application with student info (for Admin view)."""
    id: UUID
    job_id: UUID
    student_id: UUID
    status: str
    applied_at: datetime
    student: Optional[StudentBrief] = None
    
    class Config:
        from_attributes = True


class ApplicationListResponse(BaseModel):
    """Paginated application list response."""
    applications: List[ApplicationResponse]
    total: int
    page: int
    limit: int


class AdminApplicationListResponse(BaseModel):
    """Paginated application list for admin (with student info)."""
    applications: List[ApplicationWithStudent]
    total: int
    page: int
    limit: int
