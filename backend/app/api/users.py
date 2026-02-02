"""
User Profile Endpoints
Student: View and update own profile
Admin: Mark student as placed
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.db.models import Profile
from app.schemas.user import ProfileResponse, ProfileUpdate
from app.core.security import require_student, require_admin

router = APIRouter(prefix="/users", tags=["Users"])


# =============================================================================
# STUDENT PROFILE ENDPOINTS
# =============================================================================

@router.get("/me/profile", response_model=ProfileResponse)
def get_my_profile(
    current_user: dict = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Get current student's profile.
    
    Requires: STUDENT role
    """
    student_id = current_user["sub"]
    
    profile = db.query(Profile).filter(Profile.user_id == student_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return profile


@router.patch("/me/profile", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: dict = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Update current student's profile.
    
    Requires: STUDENT role
    
    Updatable fields:
        - full_name
        - cgpa
        - branch
        - resume_url
    
    Note: is_placed is NOT updatable by student (admin-controlled).
    """
    student_id = current_user["sub"]
    
    profile = db.query(Profile).filter(Profile.user_id == student_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Update only provided fields
    update_data = payload.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    return profile


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.patch("/{user_id}/mark-placed", response_model=ProfileResponse)
def mark_student_placed(
    user_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Mark a student as placed.
    
    Requires: ADMIN role
    
    Sets profiles.is_placed = true for the given user.
    """
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )
    
    if profile.is_placed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already marked as placed"
        )
    
    profile.is_placed = True
    db.commit()
    db.refresh(profile)
    
    return profile

