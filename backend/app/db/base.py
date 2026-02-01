"""
SQLAlchemy Base Class
Single source of truth for the declarative base.
All models inherit from this.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all ORM models.
    Do NOT add common columns here unless ALL tables share them.
    """
    pass
