"""
Security Module - Password Hashing & JWT
Uses bcrypt for passwords, HS256 for JWT tokens.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from passlib.context import CryptContext
from jose import jwt, JWTError

from app.core.config import get_settings

settings = get_settings()

# Password hashing context
# bcrypt is slow by design - resistant to brute force
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =============================================================================
# PASSWORD HASHING
# =============================================================================

def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    Returns the hashed password string.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a stored hash.
    Returns True if match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


# =============================================================================
# JWT TOKEN HANDLING
# =============================================================================

def create_access_token(user_id: UUID, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Payload contains:
        - sub: user_id (string)
        - role: user role
        - exp: expiration timestamp
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(user_id),
        "role": role,
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    
    Returns payload dict if valid, None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


# =============================================================================
# FASTAPI DEPENDENCIES (Route Protection)
# =============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# This extracts the token from "Authorization: Bearer <token>" header
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(lambda: None)  # Placeholder - will be injected properly
) -> dict:
    """
    Dependency that validates JWT and returns the token payload.
    
    Usage:
        @app.get("/protected")
        def protected_route(current_user: dict = Depends(get_current_user)):
            user_id = current_user["sub"]
            role = current_user["role"]
    
    Raises 401 if token is invalid or expired.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


def require_role(required_role: str):
    """
    Factory function that creates a role-checking dependency.
    
    Usage:
        @app.get("/admin-only")
        def admin_route(current_user: dict = Depends(require_role("ADMIN"))):
            ...
    """
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires {required_role} role."
            )
        return current_user
    return role_checker


# Convenience dependencies for common role checks
require_student = require_role("STUDENT")
require_admin = require_role("ADMIN")
