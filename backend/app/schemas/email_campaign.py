"""
Email Campaign Schemas - Request/Response Validation
Pydantic models for email campaign operations.
"""

from pydantic import BaseModel
from typing import Optional, List


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class EmailCampaignCreate(BaseModel):
    title: str
    template_id: Optional[str] = None
    subject: str
    body_html: str
    student_ids: List[str]


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class EmailCampaignResponse(BaseModel):
    id: str
    title: str
    subject: str
    status: str
    created_at: str
    total_emails: int
    sent_emails: int
    failed_emails: int
    
    class Config:
        from_attributes = True


class EmailLogResponse(BaseModel):
    id: str
    student_name: str
    student_email: str
    status: str
    error_message: Optional[str]
    sent_at: Optional[str]
    
    class Config:
        from_attributes = True


class EmailCampaignDetailResponse(BaseModel):
    campaign: EmailCampaignResponse
    email_logs: List[EmailLogResponse]
