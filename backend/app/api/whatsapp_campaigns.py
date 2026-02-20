"""
WhatsApp Campaign Management Endpoints
Admin: Create, start, and monitor WhatsApp campaigns.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import List, Optional
from app.schemas.whatsapp_campaign import WhatsAppCampaignCreate, WhatsAppCampaignResponse, WhatsAppLogResponse, WhatsAppCampaignDetailResponse
from uuid import UUID
from datetime import datetime
import time
import asyncio

from app.db.session import get_db
from app.db.models import WhatsAppCampaign, WhatsAppLog, WhatsAppTemplate, User, Profile
from app.core.security import require_admin
from app.services.twilio_service import twilio_service

router = APIRouter(prefix="/whatsapp-campaigns", tags=["WhatsApp Campaigns"])



# =============================================================================
# BACKGROUND TASK
# =============================================================================

def execute_whatsapp_campaign(campaign_id: str, db_url: str):
    """
    Background task to send WhatsApp messages for a campaign.
    Creates its own database session.
    """
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Get pending messages
        pending_logs = db.query(WhatsAppLog).filter(
            WhatsAppLog.campaign_id == campaign_id,
            WhatsAppLog.status == "PENDING"
        ).all()
        
        # Get campaign for body
        campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
        
        if not campaign:
            return
        
        for log in pending_logs:
            # Update status to SENDING (we track this via logic, not DB status yet)
            
            # Get student info
            student = db.query(User).options(
                joinedload(User.profile)
            ).filter(User.id == log.student_id).first()
            
            if not student or not student.profile or not student.profile.phone:
                log.status = "FAILED"
                log.error_message = "Student phone not found"
                db.commit()
                continue
            
            # Prepare variables
            variables = {
                "student_name": student.profile.full_name or "Student",
                "email": student.email,
                "branch": student.profile.branch or "",
                "cgpa": str(student.profile.cgpa) if student.profile.cgpa else "",
            }
            
            # Simple variable substitution
            message_body = campaign.body_text
            for key, value in variables.items():
                message_body = message_body.replace(f"{{{{{key}}}}}", str(value))
            
            # Send WhatsApp message
            success, result_or_error = twilio_service.send_whatsapp_message(
                to_number=student.profile.phone,
                body=message_body
            )
            
            if success:
                log.status = "SENT"
                log.message_sid = result_or_error
                log.sent_at = datetime.utcnow()
            else:
                # Handle Rate Limit (63038)
                if "63038" in str(result_or_error):
                    print(f"Rate limit hit for {student.profile.phone}. Waiting 2s...")
                    time.sleep(2)
                    # Retry once
                    success, result_or_error = twilio_service.send_whatsapp_message(
                        to_number=student.profile.phone,
                        body=message_body
                    )
                    if success:
                        log.status = "SENT"
                        log.message_sid = result_or_error
                        log.sent_at = datetime.utcnow()
                    else:
                        log.status = "FAILED"
                        log.error_message = result_or_error
                else:
                    log.status = "FAILED"
                    log.error_message = result_or_error
            
            db.commit()
            
            # Default rate limiting: 0.5 second delay between messages
            time.sleep(0.5)
        
        # Check if campaign is complete
        pending_count = db.query(WhatsAppLog).filter(
            WhatsAppLog.campaign_id == campaign_id,
            WhatsAppLog.status == "PENDING"
        ).count()
        
        if pending_count == 0:
            campaign.status = "COMPLETED"
            db.commit()
            
    except Exception as e:
        print(f"WhatsApp campaign error: {e}")
    finally:
        db.close()


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("", response_model=List[WhatsAppCampaignResponse])
def list_whatsapp_campaigns(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List all WhatsApp campaigns.
    """
    campaigns = db.query(WhatsAppCampaign).order_by(WhatsAppCampaign.created_at.desc()).all()
    
    result = []
    for c in campaigns:
        total = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == c.id).count()
        sent = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == c.id, WhatsAppLog.status == "SENT").count()
        failed = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == c.id, WhatsAppLog.status == "FAILED").count()
        
        result.append(WhatsAppCampaignResponse(
            id=str(c.id),
            title=c.title,
            body_text=c.body_text,
            status=c.status,
            created_at=c.created_at.isoformat(),
            total_messages=total,
            sent_messages=sent,
            failed_messages=failed
        ))
    
    return result


@router.get("/{campaign_id}", response_model=WhatsAppCampaignDetailResponse)
def get_whatsapp_campaign(
    campaign_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get WhatsApp campaign details with all logs.
    """
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    total = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == campaign_id).count()
    sent = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == campaign_id, WhatsAppLog.status == "SENT").count()
    failed = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == campaign_id, WhatsAppLog.status == "FAILED").count()
    
    logs = db.query(WhatsAppLog).options(
        joinedload(WhatsAppLog.student).joinedload(User.profile)
    ).filter(WhatsAppLog.campaign_id == campaign_id).all()
    
    log_responses = []
    for log in logs:
        student_name = log.student.profile.full_name if log.student and log.student.profile else "Unknown"
        student_phone = log.student.profile.phone if log.student and log.student.profile else "Unknown"
        
        log_responses.append(WhatsAppLogResponse(
            id=str(log.id),
            student_name=student_name,
            student_phone=student_phone or "No Phone",
            status=log.status,
            error_message=log.error_message,
            sent_at=log.sent_at.isoformat() if log.sent_at else None
        ))
    
    return WhatsAppCampaignDetailResponse(
        campaign=WhatsAppCampaignResponse(
            id=str(campaign.id),
            title=campaign.title,
            body_text=campaign.body_text,
            status=campaign.status,
            created_at=campaign.created_at.isoformat(),
            total_messages=total,
            sent_messages=sent,
            failed_messages=failed
        ),
        logs=log_responses
    )


@router.put("/{campaign_id}", response_model=WhatsAppCampaignResponse)
def update_whatsapp_campaign(
    campaign_id: UUID,
    payload: WhatsAppCampaignCreate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update a WhatsApp campaign.
    If DRAFT: Full update (can change students).
    If RUNNING/COMPLETED: Only update metadata (title, body).
    """
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Update metadata
    campaign.title = payload.title
    campaign.body_text = payload.body_text
    campaign.template_id = UUID(payload.template_id) if payload.template_id else None
    
    if campaign.status == "DRAFT":
        # Full reset of recipients
        # Delete existing logs
        db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == campaign_id).delete()
        
        # Add new logs
        for student_id in payload.student_ids:
            log = WhatsAppLog(
                campaign_id=campaign.id,
                student_id=UUID(student_id),
                status="PENDING"
            )
            db.add(log)
    
    db.commit()
    db.refresh(campaign)
    
    # Calculate stats for response
    total = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == campaign_id).count()
    sent = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == campaign_id, WhatsAppLog.status == "SENT").count()
    failed = db.query(WhatsAppLog).filter(WhatsAppLog.campaign_id == campaign_id, WhatsAppLog.status == "FAILED").count()
    
    return WhatsAppCampaignResponse(
        id=str(campaign.id),
        title=campaign.title,
        body_text=campaign.body_text,
        status=campaign.status,
        created_at=campaign.created_at.isoformat(),
        total_messages=total,
        sent_messages=sent,
        failed_messages=failed
    )


@router.post("/{campaign_id}/retry")
def retry_failed_whatsapp_messages(
    campaign_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retry failed messages for a campaign.
    Resets status of FAILED logs to PENDING and triggers background task.
    """
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    # Find failed logs
    failed_logs = db.query(WhatsAppLog).filter(
        WhatsAppLog.campaign_id == campaign_id,
        WhatsAppLog.status == "FAILED"
    ).all()
    
    if not failed_logs:
        return {"message": "No failed messages to retry", "retried_count": 0}
    
    # Reset status
    count = 0
    for log in failed_logs:
        log.status = "PENDING"
        log.error_message = None
        count += 1
    
    # If campaign was COMPLETED/FAILED, set back to RUNNING
    if campaign.status in ["COMPLETED", "FAILED"]:
        campaign.status = "RUNNING"
        
    db.commit()
    
    # Trigger background task
    from app.core.config import get_settings
    db_url = get_settings().DATABASE_URL
    background_tasks.add_task(execute_whatsapp_campaign, str(campaign_id), db_url)
    
    return {"message": f"Queued {count} failed messages for retry", "retried_count": count}


@router.get("/templates/list", response_model=dict)
def list_whatsapp_templates(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List all available WhatsApp templates.
    """
    templates = db.query(WhatsAppTemplate).all()
    result = []
    for t in templates:
        result.append({
            "id": str(t.id),
            "name": t.name,
            "body_text": t.body_text,
            "variables": t.variables,
            "is_prebuilt": t.is_prebuilt
        })
    return {"templates": result}


@router.post("", response_model=WhatsAppCampaignResponse, status_code=status.HTTP_201_CREATED)
def create_whatsapp_campaign(
    payload: WhatsAppCampaignCreate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new WhatsApp campaign.
    """
    # Create campaign
    campaign = WhatsAppCampaign(
        title=payload.title,
        template_id=UUID(payload.template_id) if payload.template_id else None,
        body_text=payload.body_text,
        status="DRAFT"
    )
    
    db.add(campaign)
    db.flush()
    
    # Create logs
    for student_id in payload.student_ids:
        log = WhatsAppLog(
            campaign_id=campaign.id,
            student_id=UUID(student_id),
            status="PENDING"
        )
        db.add(log)
    
    db.commit()
    db.refresh(campaign)
    
    return WhatsAppCampaignResponse(
        id=str(campaign.id),
        title=campaign.title,
        body_text=campaign.body_text,
        status=campaign.status,
        created_at=campaign.created_at.isoformat(),
        total_messages=len(payload.student_ids),
        sent_messages=0,
        failed_messages=0
    )


@router.post("/{campaign_id}/start")
def start_whatsapp_campaign(
    campaign_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Start sending WhatsApp messages.
    """
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status == "RUNNING":
        raise HTTPException(status_code=400, detail="Campaign is already running")
    
    if not twilio_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Twilio is not configured."
        )
    
    # Update status
    campaign.status = "RUNNING"
    db.commit()
    
    # Get database URL for background task
    from app.core.config import get_settings
    db_url = get_settings().DATABASE_URL
    
    # Queue background task
    background_tasks.add_task(execute_whatsapp_campaign, str(campaign_id), db_url)
    
    return {"message": "Campaign started", "campaign_id": str(campaign_id)}


@router.post("/{campaign_id}/sync-status")
def sync_whatsapp_status(
    campaign_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Manually sync the status of Sent messages with Twilio.
    Updates 'SENT' logs to 'DELIVERED', 'READ', or 'FAILED' based on Twilio fetch.
    """
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Fetch logs that are SENT (submitted) but not final (FAILED could be retried, DELIVERED is okay)
    # We mainly want to check if SENT -> DELIVERED/READ/FAILED
    logs = db.query(WhatsAppLog).filter(
        WhatsAppLog.campaign_id == campaign_id,
        WhatsAppLog.status.in_(["SENT", "queued", "undelivered"])  # Check these statuses
    ).all()
    
    if not logs:
        return {"message": "No pending message statuses to sync"}
        
    updated_count = 0
    failures = 0
    
    for log in logs:
        if not log.message_sid:
            continue
            
        try:
            status_data = twilio_service.get_message_status(log.message_sid)
            new_status = status_data.get("status")
            error_code = status_data.get("error_code")
            error_message = status_data.get("error_message")
            
            # Map Twilio status to our status
            # Twilio: queued, sending, sent, failed, delivered, undelivered, receiving, received, read
            if new_status:
                log.status = new_status.upper()
                if error_code or error_message:
                    log.error_message = f"{error_code}: {error_message}" if error_code else error_message
                updated_count += 1
                
        except Exception as e:
            print(f"Failed to sync log {log.id}: {e}")
            failures += 1
            
    db.commit()
    
    return {
        "message": f"Synced status for {updated_count} messages",
        "failures": failures
    }


@router.delete("/{campaign_id}")
def delete_whatsapp_campaign(
    campaign_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a WhatsApp campaign.
    Can only delete if NOT Completed (or per user preference, allow deletion if needed, but safer to restrict).
    User Asked: "no camapign which got completed must get deleted"
    """
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot delete a completed campaign.")
    
    db.delete(campaign)
    db.commit()
    
    return {"message": "Campaign deleted successfully"}
