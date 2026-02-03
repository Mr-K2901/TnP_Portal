"""
Job Management Endpoints
Admin: Full CRUD
Students: View active jobs (filtered by CGPA eligibility)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.db.models import Job, Profile
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobListResponse
from app.core.security import get_current_user, require_admin

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# =============================================================================
# ADMIN ENDPOINTS (Create, Update, Delete)
# =============================================================================

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new job posting.
    
    Requires: ADMIN role
    """
    job = Job(
        company_name=payload.company_name,
        role=payload.role,
        ctc=payload.ctc,
        min_cgpa=payload.min_cgpa or 0,
        jd_link=payload.jd_link,
        description=payload.description,
        is_active=payload.is_active
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    return job


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: UUID,
    payload: JobUpdate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update an existing job posting.
    
    Requires: ADMIN role
    Only provided fields are updated (partial update).
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Update only provided fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)
    
    db.commit()
    db.refresh(job)
    
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a job posting.
    
    Requires: ADMIN role
    WARNING: This also deletes all applications for this job (CASCADE).
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    db.delete(job)
    db.commit()
    
    return None


# =============================================================================
# READ ENDPOINTS (Admin: all jobs, Student: eligible jobs only)
# =============================================================================

@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    active_only: bool = Query(True, description="Filter active jobs only"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List job postings.
    
    - ADMIN: Sees all jobs (can toggle active_only)
    - STUDENT: Sees all active jobs (CGPA check only at apply time)
    """
    query = db.query(Job)
    
    # Role-based filtering
    if current_user["role"] == "STUDENT":
        # Students see all active jobs (CGPA eligibility checked at apply time)
        query = query.filter(Job.is_active == True)
    else:
        # Admin can filter by active status
        if active_only:
            query = query.filter(Job.is_active == True)
    
    # Get total count
    total = query.count()
    
    # Paginate
    jobs = query.order_by(Job.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single job by ID.
    
    - ADMIN: Can view any job
    - STUDENT: Can view any active job (CGPA check only at apply time)
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Students can only view active jobs
    if current_user["role"] == "STUDENT":
        if not job.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
    
    return job

