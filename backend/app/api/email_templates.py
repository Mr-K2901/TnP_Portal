"""
Email Templates API Endpoints
Manage pre-built and custom email templates.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID

from app.db.session import get_db
from app.db.models import EmailTemplate
from app.core.security import require_admin
from app.services.email_service import PREBUILT_TEMPLATES

router = APIRouter(prefix="/email-templates", tags=["Email Templates"])


# =============================================================================
# SCHEMAS
# =============================================================================

class TemplateCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    variables: Optional[str] = None  # Comma-separated


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


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("", response_model=TemplateListResponse)
def list_templates(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List all email templates (pre-built + custom).
    Seeds pre-built templates if they don't exist.
    """
    # Seed pre-built templates if missing
    existing_prebuilt = db.query(EmailTemplate).filter(EmailTemplate.is_prebuilt == True).count()
    
    if existing_prebuilt == 0:
        for tpl in PREBUILT_TEMPLATES:
            template = EmailTemplate(
                name=tpl["name"],
                subject=tpl["subject"],
                body_html=tpl["body_html"],
                variables=tpl["variables"],
                is_prebuilt=True
            )
            db.add(template)
        db.commit()
    
    # Fetch all templates
    templates = db.query(EmailTemplate).order_by(
        EmailTemplate.is_prebuilt.desc(),  # Pre-built first
        EmailTemplate.created_at.desc()
    ).all()
    
    return TemplateListResponse(
        templates=[
            TemplateResponse(
                id=str(t.id),
                name=t.name,
                subject=t.subject,
                body_html=t.body_html,
                variables=t.variables,
                is_prebuilt=t.is_prebuilt
            )
            for t in templates
        ],
        total=len(templates)
    )


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get a single template by ID.
    """
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        subject=template.subject,
        body_html=template.body_html,
        variables=template.variables,
        is_prebuilt=template.is_prebuilt
    )


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: TemplateCreate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a custom email template.
    """
    template = EmailTemplate(
        name=payload.name,
        subject=payload.subject,
        body_html=payload.body_html,
        variables=payload.variables,
        is_prebuilt=False
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        subject=template.subject,
        body_html=template.body_html,
        variables=template.variables,
        is_prebuilt=template.is_prebuilt
    )


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: UUID,
    payload: TemplateCreate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update a custom template. Pre-built templates cannot be modified.
    """
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.is_prebuilt:
        raise HTTPException(status_code=400, detail="Cannot modify pre-built templates")
    
    template.name = payload.name
    template.subject = payload.subject
    template.body_html = payload.body_html
    template.variables = payload.variables
    
    db.commit()
    db.refresh(template)
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        subject=template.subject,
        body_html=template.body_html,
        variables=template.variables,
        is_prebuilt=template.is_prebuilt
    )


@router.delete("/{template_id}")
def delete_template(
    template_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a custom template. Pre-built templates cannot be deleted.
    """
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.is_prebuilt:
        raise HTTPException(status_code=400, detail="Cannot delete pre-built templates")
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted"}
