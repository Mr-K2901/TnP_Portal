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
