"""
WhatsApp Campaign Schemas - Request/Response Validation
Pydantic models for WhatsApp campaign operations.
"""

from pydantic import BaseModel
from typing import Optional, List


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class WhatsAppCampaignCreate(BaseModel):
    title: str
    template_id: Optional[str] = None
    body_text: str
    student_ids: List[str]


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class WhatsAppCampaignResponse(BaseModel):
    id: str
    title: str
    body_text: str
    status: str
    created_at: str
    total_messages: int
    sent_messages: int
    failed_messages: int
    
    class Config:
        from_attributes = True


class WhatsAppLogResponse(BaseModel):
    id: str
    student_name: str
    student_phone: str
    status: str
    error_message: Optional[str]
    sent_at: Optional[str]
    
    class Config:
        from_attributes = True


class WhatsAppCampaignDetailResponse(BaseModel):
    campaign: WhatsAppCampaignResponse
    logs: List[WhatsAppLogResponse]
