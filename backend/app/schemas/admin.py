"""
Admin Schemas - Request/Response Validation
Pydantic models for admin dashboard and student management.
"""

from pydantic import BaseModel
from typing import Optional, List


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class DashboardStats(BaseModel):
    active_jobs: int
    total_students: int
    pending_applications: int


class StudentListItem(BaseModel):
    user_id: str
    full_name: str
    email: str
    branch: str  # Course (CSE, IT, ECE, etc.)
    department: Optional[str]  # Department (Engineering, Management, etc.)
    cgpa: Optional[float]
    is_placed: bool
    phone: Optional[str]
    applications_count: int
    placed_company: Optional[str]

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    students: List[StudentListItem]
    total: int


class ImportSummary(BaseModel):
    success_count: int
    failure_count: int
    errors: List[str]
