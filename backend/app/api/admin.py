"""
Admin-only Endpoints
Read-only access to aggregate data.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import User, Profile, Application, Job
from app.core.security import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


# =============================================================================
# SCHEMAS
# =============================================================================

class StudentListItem(BaseModel):
    user_id: str
    full_name: str
    email: str
    branch: str  # Course (CSE, IT, ECE, etc.)
    department: Optional[str]  # Department (Engineering, Management, etc.)
    cgpa: Optional[float]
    is_placed: bool
    applications_count: int
    placed_company: Optional[str]

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    students: List[StudentListItem]
    total: int


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/students", response_model=StudentListResponse)
def list_students(
    branch: Optional[str] = Query(None, description="Filter by course (branch)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    min_cgpa: Optional[float] = Query(None, ge=0, le=10, description="Minimum CGPA"),
    max_cgpa: Optional[float] = Query(None, ge=0, le=10, description="Maximum CGPA"),
    is_placed: Optional[bool] = Query(None, description="Filter by placement status"),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get list of all students with derived information.
    
    Requires: ADMIN role
    
    Filters (all optional):
        - branch: Filter by course name (CSE, IT, etc.)
        - department: Filter by department (Engineering, Management, etc.)
        - min_cgpa: Minimum CGPA threshold
        - max_cgpa: Maximum CGPA threshold
        - is_placed: Filter by placement status (true/false)
    
    Returns:
        - Student details with applications_count and placed_company
    """
    # Base query: Join User + Profile for students only
    query = db.query(
        User.id.label("user_id"),
        User.email,
        Profile.full_name,
        Profile.branch,
        Profile.department,
        Profile.cgpa,
        Profile.is_placed
    ).join(
        Profile, User.id == Profile.user_id
    ).filter(
        User.role == "STUDENT"
    )
    
    # Apply filters
    if branch:
        query = query.filter(Profile.branch == branch)
    
    if department:
        query = query.filter(Profile.department == department)
    
    if min_cgpa is not None:
        query = query.filter(Profile.cgpa >= min_cgpa)
    
    if max_cgpa is not None:
        query = query.filter(Profile.cgpa <= max_cgpa)
    
    if is_placed is not None:
        query = query.filter(Profile.is_placed == is_placed)
    
    # Execute query
    students_raw = query.all()
    
    # Build response with derived fields
    students = []
    for student in students_raw:
        # Count applications for this student
        applications_count = db.query(func.count(Application.id)).filter(
            Application.student_id == student.user_id
        ).scalar() or 0
        
        # Derive placed_company: Find SHORTLISTED application for placed students
        placed_company = None
        if student.is_placed:
            shortlisted_app = db.query(Application).join(Job).filter(
                Application.student_id == student.user_id,
                Application.status == "SHORTLISTED"
            ).first()
            if shortlisted_app and shortlisted_app.job:
                placed_company = shortlisted_app.job.company_name
        
        students.append(StudentListItem(
            user_id=str(student.user_id),
            full_name=student.full_name,
            email=student.email,
            branch=student.branch,
            department=student.department,
            cgpa=student.cgpa,
            is_placed=student.is_placed,
            applications_count=applications_count,
            placed_company=placed_company
        ))
    
    return StudentListResponse(
        students=students,
        total=len(students)
    )
