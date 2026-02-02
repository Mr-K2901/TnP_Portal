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
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    """
    Junction table: Student applies to Job.
    Status flow: APPLIED → SHORTLISTED → (REJECTED or final offer outside system)
    """
    __tablename__ = "applications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Text, nullable=False, default="APPLIED")  # CHECK constraint in DB
    applied_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    student = relationship("User", back_populates="applications")
    
    __table_args__ = (
        UniqueConstraint("job_id", "student_id", name="unique_job_student_application"),
        CheckConstraint("status IN ('APPLIED', 'SHORTLISTED', 'REJECTED')", name="check_application_status"),
    )
