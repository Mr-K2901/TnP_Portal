"""
Authentication Endpoints
Handles user registration and login.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.db.models import User, Profile
from app.schemas.user import UserRegister, UserLogin, Token, UserWithProfile
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserWithProfile, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    - Students must provide: full_name, branch
    - Admins only need: email, password
    
    Returns the created user (without password).
    """
    
    # Validate student-specific fields
    if payload.role == "STUDENT":
        if not payload.full_name or not payload.branch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Students must provide full_name and branch"
            )
    
    # Hash password
    hashed = hash_password(payload.password)
    
    # Create user
    user = User(
        email=payload.email,
        password_hash=hashed,
        role=payload.role
    )
    
    try:
        db.add(user)
        db.flush()  # Get user.id before creating profile
        
        # Create profile for students
        if payload.role == "STUDENT":
            profile = Profile(
                user_id=user.id,
                full_name=payload.full_name,
                branch=payload.branch,
                cgpa=payload.cgpa
            )
            db.add(profile)
        
        db.commit()
        db.refresh(user)
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    
    Token contains:
        - sub: user_id
        - role: STUDENT or ADMIN
        - exp: expiration timestamp
    """
    
    # Find user by email
    user = db.query(User).filter(User.email == payload.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create JWT token
    access_token = create_access_token(user_id=user.id, role=user.role)
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserWithProfile)
def get_current_user(db: Session = Depends(get_db)):
    """
    Get current user info.
    
    NOTE: This endpoint requires authentication middleware.
    TODO: Add Depends(get_current_user) after implementing auth dependency.
    """
    # Placeholder - will be implemented with auth dependency
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Auth dependency not yet implemented"
    )
