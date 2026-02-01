# TnP Portal - Handover Report
**Date:** 2026-02-01  
**Session Duration:** ~7 hours

---

## 1. Core Task

Built a production-ready **Training & Placement (TnP) Portal** with a complete FastAPI backend and Next.js frontend structure. The system allows students to view/apply to jobs and admins to manage job postings and applications.

---

## 2. Key Changes

### Backend (Complete & Tested)

| File | What Was Done |
|------|---------------|
| `DB_Schema.sql` | PostgreSQL schema: `users`, `profiles`, `jobs`, `applications` with `password_hash` for self-managed auth |
| `backend/app/core/config.py` | Pydantic Settings for env vars |
| `backend/app/core/security.py` | Password hashing (bcrypt), JWT creation/validation, auth dependencies (`get_current_user`, `require_admin`, `require_student`) |
| `backend/app/db/base.py` | SQLAlchemy declarative base |
| `backend/app/db/session.py` | DB session factory with connection pooling |
| `backend/app/db/models.py` | ORM models matching DB schema exactly |
| `backend/app/schemas/user.py` | Pydantic: `UserRegister`, `UserLogin`, `Token`, `ProfileResponse`, `ProfileUpdate` |
| `backend/app/schemas/job.py` | Pydantic: `JobCreate`, `JobUpdate`, `JobResponse`, `JobListResponse` |
| `backend/app/schemas/application.py` | Pydantic: `ApplicationCreate`, `ApplicationStatusUpdate`, response schemas |
| `backend/app/api/auth.py` | `POST /register`, `POST /login`, `GET /me` |
| `backend/app/api/jobs.py` | Full CRUD: `POST`, `GET`, `GET/{id}`, `PUT/{id}`, `DELETE/{id}` |
| `backend/app/api/applications.py` | `POST /apply`, `GET /list`, `GET /{id}`, `GET /job/{id}` (admin), `PATCH /{id}/status` |
| `backend/app/api/users.py` | `GET /me/profile`, `PATCH /me/profile` |
| `backend/app/main.py` | FastAPI app with CORS, all routers mounted |
| `backend/.env` | Local config (DATABASE_URL, SECRET_KEY, 24hr token expiry) |
| `backend/requirements.txt` | All Python dependencies |

### Frontend (Structure Created, Not Initialized)

| File | What Was Done |
|------|---------------|
| `frontend/app/login/page.tsx` | Login page placeholder |
| `frontend/app/student/dashboard/page.tsx` | Student dashboard placeholder |
| `frontend/app/student/applications/page.tsx` | Student applications placeholder |
| `frontend/app/admin/jobs/page.tsx` | Admin jobs management placeholder |
| `frontend/app/admin/applications/page.tsx` | Admin applications management placeholder |
| `frontend/app/layout.tsx` | Root layout with metadata |
| `frontend/lib/api.ts` | Fetch wrapper with auto auth header |
| `frontend/lib/auth.ts` | Token storage, parsing, role extraction |
| `frontend/components/Navbar.tsx` | Role-based navigation |
| `frontend/components/ProtectedRoute.tsx` | Auth guard with role checking |
| `frontend/tailwind.config.js` | Custom color palette |

---

## 3. Decisions & Constraints

- **Self-managed auth** - passwords stored as bcrypt hashes, JWT tokens via `python-jose`
- **Role-based access** - STUDENT and ADMIN with separate endpoints
- **Token expiry** - Set to 24 hours for dev convenience
- **Database** - PostgreSQL on localhost
- **One application per student per job** - DB constraint + API check
- **CGPA eligibility** - Applied on job listing (students see only eligible jobs)
- **No file uploads** - `resume_url` is string only
- **`is_placed`** - Not editable by students (admin-only field)

---

## 4. Open Issues

| Item | Status |
|------|--------|
| Frontend initialization | ⏳ Needs `npx create-next-app` to set up Next.js |
| Frontend pages | ⏳ Only placeholders exist, need actual UI |
| globals.css | ⏳ Not created yet |
| Authentication flow in frontend | ⏳ Login form not implemented |
| Withdraw application | ❌ Not implemented |
| Bulk status update | ❌ Not implemented |
| Admin: mark student as placed | ❌ Not implemented |

---

## 5. API Endpoints Summary (14 Total)

| Module | Method | Endpoint | Auth |
|--------|--------|----------|------|
| Auth | POST | `/api/auth/register` | Public |
| Auth | POST | `/api/auth/login` | Public |
| Auth | GET | `/api/auth/me` | Any |
| Jobs | POST | `/api/jobs` | Admin |
| Jobs | GET | `/api/jobs` | Any |
| Jobs | GET | `/api/jobs/{id}` | Any |
| Jobs | PUT | `/api/jobs/{id}` | Admin |
| Jobs | DELETE | `/api/jobs/{id}` | Admin |
| Applications | POST | `/api/applications` | Student |
| Applications | GET | `/api/applications` | Student |
| Applications | GET | `/api/applications/{id}` | Student |
| Applications | GET | `/api/applications/job/{id}` | Admin |
| Applications | PATCH | `/api/applications/{id}/status` | Admin |
| Users | GET | `/api/users/me/profile` | Student |
| Users | PATCH | `/api/users/me/profile` | Student |

---

## 6. To Resume Development

1. Initialize Next.js in frontend folder:
   ```bash
   cd frontend
   npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
   ```

2. Create `globals.css` with base styles

3. Implement Login page with form

4. Build out dashboard pages

5. Connect to backend API

---

## 7. Test Credentials (Dev Only)

| Role | Email | Password |
|------|-------|----------|
| Student | student@test.com | password123 |
| Admin | admin@tnp.com | admin12345 |

---

## 8. Running the Project

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (after initialization)
```bash
cd frontend
npm install
npm run dev
```

---

**Backend URL:** http://localhost:8000  
**API Docs:** http://localhost:8000/docs  
**Frontend URL:** http://localhost:3000 (after setup)
