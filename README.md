# TnP Portal

A Training & Placement portal for colleges to manage job postings and student applications.

## Features

### Student
- View all active job postings
- Apply to jobs (CGPA eligibility enforced)
- Track application status (Applied / Shortlisted / Rejected)
- View placement status in My Applications

### Admin
- Create and manage job postings
- Toggle job active/inactive status
- Review and shortlist applications
- Mark students as placed

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy |
| Database | PostgreSQL |
| Frontend | Next.js 14, React, TypeScript |
| Auth | JWT (python-jose) |

## Core Workflows

### Application Flow
```
Student applies → APPLIED → Admin shortlists → SHORTLISTED → Admin marks placed
                         → Admin rejects → REJECTED
```

### Placement Flow
```
Admin marks student as placed → profile.is_placed = true
Student can still apply to other jobs (informational only)
```

## Local Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
```bash
# Create PostgreSQL database
createdb tnp_portal

# Run migrations (if using alembic)
alembic upgrade head
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/tnp_portal
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Student | rahul.sharma@student.edu | password123 |
| Admin | admin@tnp.edu | admin12345 |

## Known Design Decisions

See [docs/decisions.md](docs/decisions.md) for rationale on:
- No PLACED status enum
- Placement as informational (not restrictive)
- Backend-only CGPA enforcement
- Students can apply after placement
