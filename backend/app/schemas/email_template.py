"""
Email Template Schemas - Request/Response Validation
Pydantic models for email template CRUD operations.
"""

from pydantic import BaseModel
from typing import Optional, List


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class TemplateCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    variables: Optional[str] = None  # Comma-separated


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class TemplateResponse(BaseModel):
    id: str
    name: str
    subject: str
    body_html: str
    variables: Optional[str]
    is_prebuilt: bool
    
    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int
