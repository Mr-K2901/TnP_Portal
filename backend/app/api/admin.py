"""
Admin-only Endpoints
Read-only access to aggregate data.
"""

from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
import csv
import io
import uuid
import pandas as pd
import numpy as np

from app.db.session import get_db
from app.db.models import User, Profile, Application, Job
from app.core.security import require_admin, hash_password

router = APIRouter(prefix="/admin", tags=["Admin"])


# =============================================================================
# SCHEMAS
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


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics for admin overview.
    
    Requires: ADMIN role
    
    Returns:
        - active_jobs: Count of jobs with is_active=True
        - total_students: Count of students (users with role=STUDENT)
        - pending_applications: Count of applications with status=APPLIED
    """
    active_jobs = db.query(func.count(Job.id)).filter(Job.is_active == True).scalar() or 0
    total_students = db.query(func.count(User.id)).filter(User.role == "STUDENT").scalar() or 0
    pending_applications = db.query(func.count(Application.id)).filter(Application.status == "APPLIED").scalar() or 0
    
    return DashboardStats(
        active_jobs=active_jobs,
        total_students=total_students,
        pending_applications=pending_applications
    )


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
        Profile.is_placed,
        Profile.phone
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
            phone=student.phone,
            applications_count=applications_count,
            placed_company=placed_company
        ))
    
    return StudentListResponse(
        students=students,
        total=len(students)
    )


@router.post("/students/import", response_model=ImportSummary)
async def import_students(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Import students from a CSV or Excel file.
    Expected columns: full_name, email, branch, department, cgpa, password (optional)
    """
    ext = file.filename.split('.')[-1].lower()
    if ext not in ['csv', 'xlsx', 'xls']:
        return ImportSummary(
            success_count=0,
            failure_count=1,
            errors=["Only CSV and Excel files are supported."]
        )

    items = []
    
    if ext == 'csv':
        content = await file.read()
        try:
            decoded = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                decoded = content.decode('latin-1')
            except Exception:
                return ImportSummary(success_count=0, failure_count=1, errors=["Could not decode file encoding."])
        
        csv_reader = csv.DictReader(io.StringIO(decoded))
        items = list(csv_reader)
    else:
        # Excel handling
        content = await file.read()
        try:
            df = pd.read_excel(io.BytesIO(content))
            # Replace NaN with empty string
            df = df.replace({np.nan: None})
            items = df.to_dict('records')
        except Exception as e:
            return ImportSummary(success_count=0, failure_count=1, errors=[f"Error reading Excel file: {str(e)}"])

    success_count = 0
    failure_count = 0
    errors = []

    for row_idx, row in enumerate(items, start=1):
        try:
            # Handle potential variations in column names or types from pandas
            full_name = str(row.get('full_name', '') or '').strip()
            email = str(row.get('email', '') or '').strip()
            branch = str(row.get('branch', '') or '').strip()
            department = str(row.get('department', '') or '').strip()
            cgpa_val = row.get('cgpa', 0)
            password = str(row.get('password', 'password123') or '').strip() or 'password123'

            if not email or not full_name or not branch:
                errors.append(f"Row {row_idx}: Missing required fields (email, full_name, or branch)")
                failure_count += 1
                continue

            # Check for existing user
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                errors.append(f"Row {row_idx}: User with email {email} already exists")
                failure_count += 1
                continue

            # Parse CGPA
            try:
                cgpa = float(cgpa_val) if cgpa_val is not None else 0.0
            except (ValueError, TypeError):
                cgpa = 0.0

            # Create User
            new_user = User(
                id=uuid.uuid4(),
                email=email,
                password_hash=hash_password(password),
                role="STUDENT"
            )
            db.add(new_user)
            db.flush()  # To get the ID for profile

            # Create Profile
            new_profile = Profile(
                user_id=new_user.id,
                full_name=full_name,
                cgpa=cgpa,
                branch=branch,
                department=department
            )
            db.add(new_profile)
            
            success_count += 1
        except Exception as e:
            errors.append(f"Row {row_idx}: Unexpected error: {str(e)}")
            failure_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return ImportSummary(success_count=0, failure_count=failure_count + success_count, errors=[f"Database commit failed: {str(e)}"])

    return ImportSummary(
        success_count=success_count,
        failure_count=failure_count,
        errors=errors
    )
