"""
Application Actions API - State Machine Based Transitions

This module implements action-based endpoints for application state management.
Each action validates the current state before allowing a transition.

Design Principle: Actions (verbs) vs Status (nouns)
- Actions are what users DO
- Status is what state the application IS IN
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.db.models import Application, Profile, User
from app.schemas.application import ApplicationWithStudent, ApplicationResponse
from app.core.security import require_student, require_admin


router = APIRouter(prefix="/applications", tags=["Application Actions"])


# =============================================================================
# STATE MACHINE CONFIGURATION
# =============================================================================

# Valid state transitions: {current_status: [allowed_next_statuses]}
ADMIN_TRANSITIONS = {
    "APPLIED": ["SELECTED", "REJECTED"],
    "SELECTED": ["IN_PROCESS", "REJECTED"],
    "IN_PROCESS": ["INTERVIEW_SCHEDULED", "REJECTED"],
    "INTERVIEW_SCHEDULED": ["SHORTLISTED", "REJECTED"],
    "SHORTLISTED": ["OFFER_RELEASED", "REJECTED"],
    "OFFER_RELEASED": ["REJECTED"],  # Student handles accept/decline
}

STUDENT_TRANSITIONS = {
    "APPLIED": ["WITHDRAWN"],
    "OFFER_RELEASED": ["PLACED", "OFFER_DECLINED"],
}

# Terminal states - no further transitions allowed
TERMINAL_STATES = ["PLACED", "OFFER_DECLINED", "WITHDRAWN", "REJECTED"]

# Human-readable status labels
STATUS_LABELS = {
    "APPLIED": "Applied",
    "SELECTED": "Selected",
    "IN_PROCESS": "In Process",
    "INTERVIEW_SCHEDULED": "Interview Scheduled",
    "SHORTLISTED": "Shortlisted",
    "OFFER_RELEASED": "Offer Released",
    "PLACED": "Placed",
    "OFFER_DECLINED": "Offer Declined",
    "WITHDRAWN": "Withdrawn",
    "REJECTED": "Rejected",
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def validate_transition(current_status: str, new_status: str, transitions: dict) -> bool:
    """Check if a state transition is valid."""
    if current_status in TERMINAL_STATES:
        return False
    allowed = transitions.get(current_status, [])
    return new_status in allowed


def get_application_or_404(db: Session, application_id: UUID, load_student: bool = False):
    """Fetch application with optional student eager loading."""
    query = db.query(Application)
    if load_student:
        query = query.options(joinedload(Application.student).joinedload(User.profile))
    app = query.filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    return app


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class OfferReleaseRequest(BaseModel):
    """Request body for releasing an offer."""
    deadline_days: int = 7  # Default 7 days to respond


# =============================================================================
# ADMIN ACTIONS
# =============================================================================

@router.post("/{application_id}/actions/select", response_model=ApplicationWithStudent)
def action_select(
    application_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN ACTION: Select an applicant for further processing.
    
    Transition: APPLIED → SELECTED
    """
    app = get_application_or_404(db, application_id, load_student=True)
    
    if not validate_transition(app.status, "SELECTED", ADMIN_TRANSITIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot select. Current status '{app.status}' does not allow this action."
        )
    
    app.status = "SELECTED"
    db.commit()
    db.refresh(app)
    return app


@router.post("/{application_id}/actions/start-process", response_model=ApplicationWithStudent)
def action_start_process(
    application_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN ACTION: Move applicant to processing stage.
    
    Transition: SELECTED → IN_PROCESS
    """
    app = get_application_or_404(db, application_id, load_student=True)
    
    if not validate_transition(app.status, "IN_PROCESS", ADMIN_TRANSITIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start process. Current status '{app.status}' does not allow this action."
        )
    
    app.status = "IN_PROCESS"
    db.commit()
    db.refresh(app)
    return app


@router.post("/{application_id}/actions/schedule-interview", response_model=ApplicationWithStudent)
def action_schedule_interview(
    application_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN ACTION: Schedule interview for applicant.
    
    Transition: IN_PROCESS → INTERVIEW_SCHEDULED
    """
    app = get_application_or_404(db, application_id, load_student=True)
    
    if not validate_transition(app.status, "INTERVIEW_SCHEDULED", ADMIN_TRANSITIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot schedule interview. Current status '{app.status}' does not allow this action."
        )
    
    app.status = "INTERVIEW_SCHEDULED"
    db.commit()
    db.refresh(app)
    return app


@router.post("/{application_id}/actions/shortlist", response_model=ApplicationWithStudent)
def action_shortlist(
    application_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN ACTION: Shortlist applicant after interview.
    
    Transition: INTERVIEW_SCHEDULED → SHORTLISTED
    """
    app = get_application_or_404(db, application_id, load_student=True)
    
    if not validate_transition(app.status, "SHORTLISTED", ADMIN_TRANSITIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot shortlist. Current status '{app.status}' does not allow this action."
        )
    
    app.status = "SHORTLISTED"
    db.commit()
    db.refresh(app)
    return app


@router.post("/{application_id}/actions/release-offer", response_model=ApplicationWithStudent)
def action_release_offer(
    application_id: UUID,
    payload: OfferReleaseRequest = OfferReleaseRequest(),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN ACTION: Release job offer to student.
    
    Transition: SHORTLISTED → OFFER_RELEASED
    
    Sets offer_released_at and offer_deadline.
    """
    app = get_application_or_404(db, application_id, load_student=True)
    
    if not validate_transition(app.status, "OFFER_RELEASED", ADMIN_TRANSITIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot release offer. Current status '{app.status}' does not allow this action."
        )
    
    app.status = "OFFER_RELEASED"
    app.offer_released_at = datetime.utcnow()
    app.offer_deadline = datetime.utcnow() + timedelta(days=payload.deadline_days)
    
    db.commit()
    db.refresh(app)
    return app


@router.post("/{application_id}/actions/reject", response_model=ApplicationWithStudent)
def action_reject(
    application_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN ACTION: Reject an applicant.
    
    Transition: Any non-terminal state → REJECTED
    """
    app = get_application_or_404(db, application_id, load_student=True)
    
    if app.status in TERMINAL_STATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject. Application is in terminal state '{app.status}'."
        )
    
    app.status = "REJECTED"
    db.commit()
    db.refresh(app)
    return app


# =============================================================================
# STUDENT ACTIONS
# =============================================================================

@router.post("/{application_id}/actions/accept-offer", response_model=ApplicationResponse)
def action_accept_offer(
    application_id: UUID,
    current_user: dict = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    STUDENT ACTION: Accept a job offer.
    
    Transition: OFFER_RELEASED → PLACED
    
    Also sets profile.is_placed = True for backward compatibility.
    """
    student_id = current_user["sub"]
    app = get_application_or_404(db, application_id)
    
    # Verify ownership
    if str(app.student_id) != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only respond to your own applications"
        )
    
    if not validate_transition(app.status, "PLACED", STUDENT_TRANSITIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept offer. Current status '{app.status}' does not allow this action."
        )
    
    # Check deadline
    if app.offer_deadline and datetime.utcnow() > app.offer_deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Offer deadline has passed. Please contact the placement office."
        )
    
    app.status = "PLACED"
    app.offer_responded_at = datetime.utcnow()
    
    # Update profile for backward compatibility
    profile = db.query(Profile).filter(Profile.user_id == student_id).first()
    if profile:
        profile.is_placed = True
    
    db.commit()
    db.refresh(app)
    
    # Load job for response
    app = db.query(Application).options(
        joinedload(Application.job)
    ).filter(Application.id == application_id).first()
    
    return app


@router.post("/{application_id}/actions/decline-offer", response_model=ApplicationResponse)
def action_decline_offer(
    application_id: UUID,
    current_user: dict = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    STUDENT ACTION: Decline a job offer.
    
    Transition: OFFER_RELEASED → OFFER_DECLINED
    """
    student_id = current_user["sub"]
    app = get_application_or_404(db, application_id)
    
    # Verify ownership
    if str(app.student_id) != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only respond to your own applications"
        )
    
    if not validate_transition(app.status, "OFFER_DECLINED", STUDENT_TRANSITIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot decline offer. Current status '{app.status}' does not allow this action."
        )
    
    app.status = "OFFER_DECLINED"
    app.offer_responded_at = datetime.utcnow()
    
    db.commit()
    db.refresh(app)
    
    # Load job for response
    app = db.query(Application).options(
        joinedload(Application.job)
    ).filter(Application.id == application_id).first()
    
    return app


# =============================================================================
# INFO ENDPOINT
# =============================================================================

@router.get("/status-flow")
def get_status_flow():
    """
    Get the complete status flow configuration.
    
    Useful for frontend to display available actions based on current status.
    """
    return {
        "statuses": list(STATUS_LABELS.keys()),
        "labels": STATUS_LABELS,
        "admin_transitions": ADMIN_TRANSITIONS,
        "student_transitions": STUDENT_TRANSITIONS,
        "terminal_states": TERMINAL_STATES,
    }
