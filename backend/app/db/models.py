"""
ORM Models - EXACT MATCH TO DB_Schema.sql
DO NOT modify column names, types, or constraints without updating the database.

Database Contract:
- users: Auth + role gatekeeper
- profiles: Student-only golden record (1:1 with users)
- jobs: TnP job postings
- applications: Student ↔ Job mapping with status
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Float, Boolean, 
    ForeignKey, DateTime, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class User(Base):
    """
    Auth table with role-based access.
    Roles: STUDENT, ADMIN
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(Text, nullable=False)  # CHECK constraint in DB
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("role IN ('STUDENT', 'ADMIN')", name="check_user_role"),
    )


class Profile(Base):
    """
    Student profile - 1:1 with users.
    Only students have profiles. Admins do not.
    """
    __tablename__ = "profiles"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name = Column(Text, nullable=False)
    cgpa = Column(Float)  # CHECK constraint in DB (0-10)
    branch = Column(Text, nullable=False)  # Course: CSE, IT, ECE, etc.
    department = Column(Text)  # Department: Engineering, Management, Science, etc.
    phone = Column(Text, nullable=True)  # Phone number for call campaigns
    resume_url = Column(Text)
    is_placed = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    
    __table_args__ = (
        CheckConstraint("cgpa >= 0 AND cgpa <= 10", name="check_cgpa_range"),
    )


class Job(Base):
    """
    Job postings created by Admin/TPO.
    Students can apply to active jobs meeting cgpa criteria.
    """
    __tablename__ = "jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(Text, nullable=False)
    role = Column(Text, nullable=False)
    ctc = Column(Text)  # Stored as text: "12-15 LPA"
    min_cgpa = Column(Float, default=0)
    is_active = Column(Boolean, default=True, index=True)
    jd_link = Column(Text)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    """
    Junction table: Student applies to Job.
    
    Status Flow:
    APPLIED → SELECTED → IN_PROCESS → INTERVIEW_SCHEDULED → SHORTLISTED → OFFER_RELEASED → PLACED
    
    Terminal States: REJECTED, WITHDRAWN, OFFER_DECLINED, PLACED
    """
    __tablename__ = "applications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Text, nullable=False, default="APPLIED")
    applied_at = Column(DateTime, default=datetime.utcnow)
    
    # Offer lifecycle fields
    offer_released_at = Column(DateTime, nullable=True)
    offer_deadline = Column(DateTime, nullable=True)
    offer_responded_at = Column(DateTime, nullable=True)
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    student = relationship("User", back_populates="applications")
    
    __table_args__ = (
        UniqueConstraint("job_id", "student_id", name="unique_job_student_application"),
        CheckConstraint(
            "status IN ('APPLIED', 'SELECTED', 'IN_PROCESS', 'INTERVIEW_SCHEDULED', "
            "'SHORTLISTED', 'OFFER_RELEASED', 'PLACED', 'OFFER_DECLINED', 'WITHDRAWN', 'REJECTED')",
            name="check_application_status"
        ),
    )


class Campaign(Base):
    """
    Call Campaign - Admin creates campaigns to call groups of students.
    """
    __tablename__ = "campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    script_template = Column(Text, nullable=False)  # Message to speak
    status = Column(Text, nullable=False, default="DRAFT")  # DRAFT, RUNNING, COMPLETED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    call_logs = relationship("CallLog", back_populates="campaign", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'RUNNING', 'COMPLETED', 'CANCELLED')", name="check_campaign_status"),
    )


class CallLog(Base):
    """
    Individual call record within a campaign.
    Tracks call status, recording URL, and transcription.
    """
    __tablename__ = "call_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    twilio_sid = Column(Text, nullable=True)  # Twilio's Call SID
    status = Column(Text, nullable=False, default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, FAILED, NO_ANSWER, BUSY
    recording_url = Column(Text, nullable=True)
    transcription_text = Column(Text, nullable=True)
    duration = Column(Float, nullable=True)  # Call duration in seconds
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="call_logs")
    student = relationship("User")
    
    __table_args__ = (
        UniqueConstraint("campaign_id", "student_id", name="unique_campaign_student_call"),
        CheckConstraint(
            "status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY')",
            name="check_call_status"
        ),
    )
