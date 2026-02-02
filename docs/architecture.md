# Architecture

## High-Level Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   PostgreSQL    │
│   (Next.js)     │     │   (FastAPI)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     :3000                   :8000
```

## Authentication Flow

```
1. User submits email/password to POST /api/auth/login
2. Backend validates credentials, returns JWT
3. Frontend stores token in localStorage
4. Frontend includes token in Authorization header for all requests
5. Backend validates token on protected endpoints
```

### JWT Payload
```json
{
  "sub": "user-uuid",
  "role": "STUDENT | ADMIN",
  "exp": 1234567890
}
```

## Data Model

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password hash, role) |
| `profiles` | Student details (cgpa, branch, is_placed) |
| `jobs` | Job postings (company, role, ctc, min_cgpa) |
| `applications` | Student-Job relationship (status) |

### Key Relationships
```
users ──1:1──▶ profiles
users ──1:N──▶ applications
jobs  ──1:N──▶ applications
```

### Application Status Enum
```
APPLIED | SHORTLISTED | REJECTED
```
Note: There is no PLACED status. Placement is tracked via `profiles.is_placed`.

## API Grouping

| Group | Prefix | Purpose |
|-------|--------|---------|
| Auth | `/api/auth` | Login, registration |
| Users | `/api/users` | Profile management, mark placed |
| Jobs | `/api/jobs` | CRUD for job postings |
| Applications | `/api/applications` | Apply, status updates |

## Frontend Structure

```
frontend/
├── app/
│   ├── page.tsx                 # Root redirect
│   ├── login/page.tsx           # Login form
│   ├── student/
│   │   ├── dashboard/page.tsx   # Job listings
│   │   └── applications/page.tsx # My applications
│   └── admin/
│       ├── jobs/page.tsx        # Job management
│       └── applications/page.tsx # Application review
├── lib/
│   ├── api.ts                   # Fetch wrapper
│   └── auth.ts                  # Token helpers
└── components/
    ├── Navbar.tsx
    └── ProtectedRoute.tsx
```

## Security

- Passwords hashed with bcrypt
- JWT signed with HS256
- Role-based access control via decorators
- CORS configured for frontend origin
