"""
Application Management Endpoints
Student: Apply to jobs, view own applications
Admin: View applications per job, update status
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from app.db.session import get_db
from app.db.models import Application, Job, User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    ApplicationResponse,
    ApplicationWithStudent,
    ApplicationListResponse,
    AdminApplicationListResponse
)
from app.core.security import get_current_user, require_student, require_admin

router = APIRouter(prefix="/applications", tags=["Applications"])


# =============================================================================
# STUDENT ENDPOINTS
# =============================================================================

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    payload: ApplicationCreate,
    current_user: dict = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Apply to a job.
    
    Requires: STUDENT role
    Rules:
        - Job must be active
        - One application per student per job
    """
    student_id = current_user["sub"]
    
    # Check if job exists and is active
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if not job.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot apply to inactive job"
        )
    
    # Create application
    application = Application(
        job_id=payload.job_id,
        student_id=student_id,
        status="APPLIED"
    )
    
    try:
        db.add(application)
        db.commit()
        db.refresh(application)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied to this job"
        )
    
    # Load job for response
    application.job = job
    
    return application


@router.get("", response_model=ApplicationListResponse)
def list_my_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    List current student's applications.
    
    Requires: STUDENT role
    Returns: Only the logged-in student's applications
    """
    student_id = current_user["sub"]
    
    query = db.query(Application).filter(Application.student_id == student_id)
    
    # Get total count
    total = query.count()
    
    # Paginate with job info
    applications = (
        query
        .options(joinedload(Application.job))
        .order_by(Application.applied_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    
    return ApplicationListResponse(
        applications=applications,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_my_application(
    application_id: UUID,
    current_user: dict = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Get a single application by ID.
    
    Requires: STUDENT role
    Rules: Can only view own applications
    """
    student_id = current_user["sub"]
    
    application = (
        db.query(Application)
        .options(joinedload(Application.job))
        .filter(Application.id == application_id)
        .first()
    )
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Ensure student owns this application
    if str(application.student_id) != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own applications"
        )
    
    return application


@router.patch("/{application_id}/withdraw", response_model=ApplicationResponse)
def withdraw_application(
    application_id: UUID,
    current_user: dict = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Withdraw an application.
    
    Requires: STUDENT role
    Rules:
        - Can only withdraw own applications
        - Can only withdraw if status == APPLIED
    
    Sets status to REJECTED.
    """
    student_id = current_user["sub"]
    
    application = (
        db.query(Application)
        .options(joinedload(Application.job))
        .filter(Application.id == application_id)
        .first()
    )
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Ensure student owns this application
    if str(application.student_id) != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only withdraw your own applications"
        )
    
    # Can only withdraw if status is APPLIED
    if application.status != "APPLIED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot withdraw application with status {application.status}. Only APPLIED applications can be withdrawn."
        )
    
    # Update status to REJECTED
    application.status = "REJECTED"
    db.commit()
    db.refresh(application)
    
    return application


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.get("/job/{job_id}", response_model=AdminApplicationListResponse)
def list_applications_for_job(
    job_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None, description="Filter by status: APPLIED, SHORTLISTED, REJECTED"),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List all applications for a specific job.
    
    Requires: ADMIN role
    """
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    query = db.query(Application).filter(Application.job_id == job_id)
    
    # Optional status filter
    if status_filter:
        if status_filter not in ["APPLIED", "SHORTLISTED", "REJECTED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be APPLIED, SHORTLISTED, or REJECTED"
            )
        query = query.filter(Application.status == status_filter)
    
    # Get total count
    total = query.count()
    
    # Paginate with student info
    applications = (
        query
        .options(joinedload(Application.student))
        .order_by(Application.applied_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    
    return AdminApplicationListResponse(
        applications=applications,
        total=total,
        page=page,
        limit=limit
    )


@router.patch("/{application_id}/status", response_model=ApplicationWithStudent)
def update_application_status(
    application_id: UUID,
    payload: ApplicationStatusUpdate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update application status.
    
    Requires: ADMIN role
    Status: APPLIED, SHORTLISTED, REJECTED
    """
    application = (
        db.query(Application)
        .options(joinedload(Application.student))
        .filter(Application.id == application_id)
        .first()
    )
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    application.status = payload.status
    db.commit()
    db.refresh(application)
    
    return application
