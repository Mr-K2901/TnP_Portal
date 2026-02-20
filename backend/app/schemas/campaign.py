"""
Campaign Schemas - Request/Response Validation
Pydantic models for voice call campaign operations.
"""

from pydantic import BaseModel
from typing import Optional, List


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class CampaignCreate(BaseModel):
    title: str
    script_template: str
    student_ids: List[str]  # List of student UUIDs


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class CampaignResponse(BaseModel):
    id: str
    title: str
    script_template: str
    status: str
    created_at: str
    total_calls: int
    completed_calls: int
    
    class Config:
        from_attributes = True


class CallLogResponse(BaseModel):
    id: str
    student_name: str
    student_email: str
    status: str
    recording_url: Optional[str]
    transcription_text: Optional[str]
    duration: Optional[float]
    
    class Config:
        from_attributes = True


class CampaignDetailResponse(BaseModel):
    campaign: CampaignResponse
    call_logs: List[CallLogResponse]
