# Frontend Handover Report - TnP Portal

**Date:** 2026-02-01  
**Status:** Structure created, NOT initialized as Next.js project

---

## 1. Core Task

Created the frontend directory structure for a Next.js application with TypeScript and Tailwind CSS. Established the foundation with auth helpers, API wrapper, and route protection components.

**⚠️ Frontend is NOT yet initialized as a Next.js project - requires `npx create-next-app` to set up.**

---

## 2. Key Changes

| File | Action | Purpose |
|------|--------|---------|
| `frontend/app/login/page.tsx` | Created | Login page placeholder |
| `frontend/app/student/dashboard/page.tsx` | Created | Student dashboard placeholder |
| `frontend/app/student/applications/page.tsx` | Created | Student applications list placeholder |
| `frontend/app/admin/jobs/page.tsx` | Created | Admin jobs management placeholder |
| `frontend/app/admin/applications/page.tsx` | Created | Admin applications management placeholder |
| `frontend/app/layout.tsx` | Created | Root layout with metadata, imports `globals.css` |
| `frontend/lib/api.ts` | Created | Fetch wrapper with auto `Authorization: Bearer` header |
| `frontend/lib/auth.ts` | Created | Token storage/parsing, role checking, user ID extraction |
| `frontend/components/Navbar.tsx` | Created | Role-aware navigation (Student vs Admin links) |
| `frontend/components/ProtectedRoute.tsx` | Created | Auth guard that redirects based on login state and role |
| `frontend/tailwind.config.js` | Created | Tailwind config with custom primary/accent colors |

---

## 3. Decisions & Constraints

- **Next.js App Router** structure (not Pages Router)
- **TypeScript** for all files
- **Tailwind CSS** for styling
- **Client-side auth** - tokens stored in `localStorage`
- **No SSR auth** - auth checks happen in `useEffect`
- **API base URL** - configured via `NEXT_PUBLIC_API_URL` env var, defaults to `http://localhost:8000/api`

---

## 4. Open Issues

| Issue | Priority |
|-------|----------|
| **Next.js not initialized** - No `package.json`, `next.config.js`, or node_modules | 🔴 Critical |
| **`globals.css` missing** - Referenced in `layout.tsx` but not created | 🔴 Critical |
| **Page placeholders only** - No actual UI, forms, or data fetching | 🟡 Medium |
| **No home page** - `/app/page.tsx` not created | 🟡 Medium |
| **No loading/error states** - Pages don't handle async states | 🟢 Low |

---

## 5. File Tree

```
frontend/
├── app/
│   ├── login/page.tsx
│   ├── student/
│   │   ├── dashboard/page.tsx
│   │   └── applications/page.tsx
│   ├── admin/
│   │   ├── jobs/page.tsx
│   │   └── applications/page.tsx
│   └── layout.tsx
├── lib/
│   ├── api.ts
│   └── auth.ts
├── components/
│   ├── Navbar.tsx
│   └── ProtectedRoute.tsx
└── tailwind.config.js
```

---

## 6. Next Steps to Resume

### Step 1: Initialize Next.js

```bash
cd d:\Workspace\TnP_Portal\frontend
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

When prompted about existing files, choose to **keep them**.

### Step 2: Create globals.css

Create `frontend/app/globals.css` with Tailwind directives and base styles.

### Step 3: Create Home Page

Create `frontend/app/page.tsx` - redirect to login or dashboard based on auth state.

### Step 4: Implement Login Form

Build out `frontend/app/login/page.tsx` with:
- Email/password inputs
- API call to `/api/auth/login`
- Token storage on success
- Redirect to appropriate dashboard

### Step 5: Build Dashboards

Implement actual UI for:
- Student dashboard (view eligible jobs, apply)
- Student applications (view own applications)
- Admin jobs (create, edit, delete jobs)
- Admin applications (view by job, update status)

---

## 7. API Integration Notes

The `lib/api.ts` wrapper is ready. Usage:

```typescript
import { api } from '@/lib/api';

// Login (no auth required)
const { access_token } = await api.post('/auth/login', { email, password }, { requireAuth: false });

// Get jobs (with auth)
const jobs = await api.get('/jobs');

// Apply to job
await api.post('/applications', { job_id: '...' });
```

---

## 8. Auth Helper Notes

The `lib/auth.ts` provides:

```typescript
import { setToken, getToken, removeToken, isLoggedIn, getUserRole, parseToken } from '@/lib/auth';

// After login
setToken(access_token);

// Check if logged in
if (isLoggedIn()) { ... }

// Get role for conditional UI
const role = getUserRole(); // 'STUDENT' | 'ADMIN' | null

// Logout
removeToken();
```

---

**Backend API:** http://localhost:8000  
**Frontend (after init):** http://localhost:3000
