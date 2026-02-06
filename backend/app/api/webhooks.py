"""
Twilio Webhook Endpoints
Handles callbacks from Twilio for voice calls.
"""

from fastapi import APIRouter, Request, Query, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.db.models import CallLog
from app.services.twilio_service import twilio_service
from fastapi import Depends

router = APIRouter(prefix="/webhooks/twilio", tags=["Twilio Webhooks"])


@router.post("/voice")
async def voice_webhook(
    call_log_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Initial voice webhook - called when Twilio connects the call.
    Returns TwiML to play script and record response.
    """
    call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
    
    if not call_log:
        # Return simple hangup if call log not found
        return Response(
            content="<Response><Say>Sorry, an error occurred.</Say><Hangup/></Response>",
            media_type="application/xml"
        )
    
    # Get the script from the campaign
    script = call_log.campaign.script_template if call_log.campaign else "Hello, this is a test call."
    
    # Generate TwiML
    twiml = twilio_service.generate_voice_twiml(script, call_log_id)
    
    return Response(content=twiml, media_type="application/xml")


@router.post("/recording")
async def recording_webhook(
    call_log_id: str = Query(...),
    RecordingUrl: str = Form(None),
    RecordingDuration: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Called when recording is complete.
    Saves the recording URL to the database.
    """
    call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
    
    if call_log and RecordingUrl:
        call_log.recording_url = RecordingUrl
        if RecordingDuration:
            try:
                call_log.duration = float(RecordingDuration)
            except ValueError:
                pass
        db.commit()
    
    # Return TwiML to end the call gracefully
    twiml = twilio_service.generate_recording_complete_twiml()
    return Response(content=twiml, media_type="application/xml")


@router.post("/transcription")
async def transcription_webhook(
    call_log_id: str = Query(...),
    TranscriptionText: str = Form(None),
    TranscriptionStatus: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Async callback when transcription is complete.
    Saves the transcription text to the database.
    """
    call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
    
    if call_log and TranscriptionText:
        call_log.transcription_text = TranscriptionText
        call_log.status = "COMPLETED"
        db.commit()
    
    return {"status": "ok"}


@router.post("/status")
async def status_webhook(
    call_log_id: str = Query(...),
    CallStatus: str = Form(None),
    CallDuration: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Status callback for call state changes.
    Updates call_log status based on Twilio events.
    """
    call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
    
    if not call_log:
        return {"status": "not_found"}
    
    # Map Twilio status to our status
    status_mapping = {
        "initiated": "IN_PROGRESS",
        "ringing": "IN_PROGRESS",
        "in-progress": "IN_PROGRESS",
        "answered": "IN_PROGRESS",
        "completed": "COMPLETED",
        "busy": "BUSY",
        "no-answer": "NO_ANSWER",
        "failed": "FAILED",
        "canceled": "FAILED"
    }
    
    if CallStatus:
        new_status = status_mapping.get(CallStatus.lower(), call_log.status)
        # Only update if not already completed with transcription
        if call_log.status != "COMPLETED" or new_status == "COMPLETED":
            call_log.status = new_status
    
    if CallDuration:
        try:
            call_log.duration = float(CallDuration)
        except ValueError:
            pass
    
    db.commit()
    return {"status": "ok"}
