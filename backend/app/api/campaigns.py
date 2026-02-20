"""
Campaign Management Endpoints
Admin: Create, start, and monitor call campaigns.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from app.schemas.campaign import CampaignCreate, CampaignResponse, CallLogResponse, CampaignDetailResponse
from uuid import UUID

from app.db.session import get_db
from app.db.models import Campaign, CallLog, User, Profile
from app.core.security import require_admin
from app.services.twilio_service import twilio_service

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])



# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new call campaign with specified students.
    """
    # Create campaign
    campaign = Campaign(
        title=payload.title,
        script_template=payload.script_template,
        status="DRAFT"
    )
    db.add(campaign)
    db.flush()  # Get the ID
    
    # Create call logs for each student
    for student_id in payload.student_ids:
        call_log = CallLog(
            campaign_id=campaign.id,
            student_id=student_id,
            status="PENDING"
        )
        db.add(call_log)
    
    db.commit()
    db.refresh(campaign)
    
    return CampaignResponse(
        id=str(campaign.id),
        title=campaign.title,
        script_template=campaign.script_template,
        status=campaign.status,
        created_at=campaign.created_at.isoformat(),
        total_calls=len(payload.student_ids),
        completed_calls=0
    )


@router.get("", response_model=List[CampaignResponse])
def list_campaigns(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List all campaigns with call statistics.
    """
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    
    result = []
    for campaign in campaigns:
        total = db.query(func.count(CallLog.id)).filter(CallLog.campaign_id == campaign.id).scalar() or 0
        completed = db.query(func.count(CallLog.id)).filter(
            CallLog.campaign_id == campaign.id,
            CallLog.status == "COMPLETED"
        ).scalar() or 0
        
        result.append(CampaignResponse(
            id=str(campaign.id),
            title=campaign.title,
            script_template=campaign.script_template,
            status=campaign.status,
            created_at=campaign.created_at.isoformat(),
            total_calls=total,
            completed_calls=completed
        ))
    
    return result


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
def get_campaign(
    campaign_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get campaign details with all call logs (including transcripts).
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    call_logs = db.query(CallLog).options(
        joinedload(CallLog.student).joinedload(User.profile)
    ).filter(CallLog.campaign_id == campaign_id).all()
    
    total = len(call_logs)
    completed = sum(1 for cl in call_logs if cl.status == "COMPLETED")
    
    call_log_responses = []
    for cl in call_logs:
        student_name = cl.student.profile.full_name if cl.student and cl.student.profile else "Unknown"
        student_email = cl.student.email if cl.student else "Unknown"
        
        call_log_responses.append(CallLogResponse(
            id=str(cl.id),
            student_name=student_name,
            student_email=student_email,
            status=cl.status,
            recording_url=cl.recording_url,
            transcription_text=cl.transcription_text,
            duration=cl.duration
        ))
    
    return CampaignDetailResponse(
        campaign=CampaignResponse(
            id=str(campaign.id),
            title=campaign.title,
            script_template=campaign.script_template,
            status=campaign.status,
            created_at=campaign.created_at.isoformat(),
            total_calls=total,
            completed_calls=completed
        ),
        call_logs=call_log_responses
    )


def execute_campaign_calls(campaign_id: str, db_url: str):
    """
    Background task to execute calls for a campaign.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        call_logs = db.query(CallLog).options(
            joinedload(CallLog.student).joinedload(User.profile)
        ).filter(
            CallLog.campaign_id == campaign_id,
            CallLog.status == "PENDING"
        ).all()
        
        for call_log in call_logs:
            # Get student phone number (using email as placeholder for now)
            # In production, you'd have a phone_number field
            student_phone = getattr(call_log.student.profile, 'phone', None)
            
            if not student_phone:
                call_log.status = "FAILED"
                db.commit()
                continue
            
            try:
                twilio_sid = twilio_service.initiate_call(
                    to_number=student_phone,
                    call_log_id=str(call_log.id)
                )
                call_log.twilio_sid = twilio_sid
                call_log.status = "IN_PROGRESS"
                db.commit()
            except Exception as e:
                call_log.status = "FAILED"
                db.commit()
                print(f"Call failed for {call_log.id}: {e}")
    finally:
        db.close()


@router.post("/{campaign_id}/start")
def start_campaign(
    campaign_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Start executing calls for a campaign.
    Runs in background to not block the request.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status == "RUNNING":
        raise HTTPException(status_code=400, detail="Campaign is already running")
    
    if not twilio_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
        )
    
    # Update campaign status
    campaign.status = "RUNNING"
    db.commit()
    
    # Get database URL for background task
    from app.core.config import get_settings
    db_url = get_settings().DATABASE_URL
    
    # Queue background task
    background_tasks.add_task(execute_campaign_calls, str(campaign_id), db_url)
    
    return {"message": "Campaign started", "campaign_id": str(campaign_id)}


@router.post("/{campaign_id}/cancel")
def cancel_campaign(
    campaign_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Cancel a running campaign.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.status = "CANCELLED"
    
    # Cancel pending calls
    db.query(CallLog).filter(
        CallLog.campaign_id == campaign_id,
        CallLog.status == "PENDING"
    ).update({"status": "FAILED"})
    
    db.commit()
    
    return {"message": "Campaign cancelled"}


@router.post("/{campaign_id}/retry")
def retry_failed_calls(
    campaign_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retry failed and stuck calls in a campaign.
    Resets FAILED, IN_PROGRESS, BUSY, NO_ANSWER calls back to PENDING and re-runs.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if not twilio_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Twilio is not configured."
        )
    
    # Reset failed/stuck calls to PENDING
    retryable_statuses = ["FAILED", "IN_PROGRESS", "BUSY", "NO_ANSWER"]
    updated = db.query(CallLog).filter(
        CallLog.campaign_id == campaign_id,
        CallLog.status.in_(retryable_statuses)
    ).update({"status": "PENDING", "twilio_sid": None, "recording_url": None, "transcription_text": None}, synchronize_session=False)
    
    if updated == 0:
        return {"message": "No failed calls to retry", "retried_count": 0}
    
    # Set campaign back to RUNNING
    campaign.status = "RUNNING"
    db.commit()
    
    # Get database URL for background task
    from app.core.config import get_settings
    db_url = get_settings().DATABASE_URL
    
    # Queue background task
    background_tasks.add_task(execute_campaign_calls, str(campaign_id), db_url)
    
    return {"message": f"Retrying {updated} calls", "retried_count": updated}


@router.put("/{campaign_id}")
def update_campaign(
    campaign_id: UUID,
    payload: CampaignCreate, # Reusing Create schema
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update a call campaign.
    Refigures campaign details. Only updates metadata for running campaigns.
    Resets recipients if DRAFT.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    campaign.title = payload.title
    campaign.script_template = payload.script_template
    
    if campaign.status == "DRAFT":
        # Full update: recreate logs
        db.query(CallLog).filter(CallLog.campaign_id == campaign.id).delete()
        for student_id in payload.student_ids:
            # Need to fetch student details for CallLog... wait, CallLog needs email/name?
            # Existing Create logic:
            # student = db.query(User).filter(User.id == student_id).first()
            # This is slow for updates. But necessary.
            # actually CallLog model stores name/email snapshot.
            student = db.query(User).options(joinedload(User.profile)).filter(User.id == student_id).first()
            if student:
                log = CallLog(
                    campaign_id=campaign.id,
                    student_id=student.id,
                    student_name=student.profile.full_name if student.profile else "Unknown",
                    student_email=student.email,
                    status="PENDING"
                )
                db.add(log)
    
    db.commit()
    db.refresh(campaign)
    
    # Return matched response format
    # CampaignResponse expects (id, title, script_template, status, created_at, total_calls, completed_calls)
    total = db.query(CallLog).filter(CallLog.campaign_id == campaign.id).count()
    completed = db.query(CallLog).filter(CallLog.campaign_id == campaign.id, CallLog.status == "COMPLETED").count()
    
    return CampaignResponse(
        id=str(campaign.id),
        title=campaign.title,
        script_template=campaign.script_template,
        status=campaign.status,
        created_at=campaign.created_at.isoformat(),
        total_calls=total,
        completed_calls=completed
    )


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a call campaign.
    Cannot delete if status is COMPLETED.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot delete a completed campaign. Archive it instead.")
    
    db.delete(campaign)
    db.commit()
    
    return {"message": "Campaign deleted successfully"}

