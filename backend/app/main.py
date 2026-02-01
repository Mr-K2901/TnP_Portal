"""
TnP Portal - FastAPI Backend
Main application entrypoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api import auth, jobs, applications

settings = get_settings()

# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="TnP Portal API",
    description="Training & Placement Portal Backend",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,  # Disable docs in production
    redoc_url="/redoc" if settings.DEBUG else None
)

# =============================================================================
# MIDDLEWARE
# =============================================================================

# CORS - Configure for your frontend domain in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# ROUTERS
# =============================================================================

app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(applications.router, prefix="/api")

# TODO: Add remaining routers
# app.include_router(users.router, prefix="/api")

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health")
def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "TnP Portal API", "docs": "/docs"}
