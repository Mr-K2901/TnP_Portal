# API Reference

## Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login, returns JWT | No |
| POST | `/api/auth/register` | Register new user | No |

### POST /api/auth/login
```json
Request:  { "email": "...", "password": "..." }
Response: { "access_token": "...", "token_type": "bearer" }
```

---

## Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/me` | Get current user | Yes |
| GET | `/api/users/me/profile` | Get student profile | Yes |
| PUT | `/api/users/me/profile` | Update profile | Yes |
| PATCH | `/api/users/{id}/mark-placed` | Mark student placed | Admin |

---

## Jobs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/jobs` | List jobs | Yes |
| GET | `/api/jobs/{id}` | Get single job | Yes |
| POST | `/api/jobs` | Create job | Admin |
| PUT | `/api/jobs/{id}` | Update job | Admin |
| DELETE | `/api/jobs/{id}` | Delete job | Admin |

### GET /api/jobs
Query params:
- `active_only=true/false` (Admin only)
- `page`, `limit` for pagination

---

## Applications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/applications` | My applications | Student |
| GET | `/api/applications/job/{job_id}` | Applications for job | Admin |
| POST | `/api/applications` | Apply to job | Student |
| PATCH | `/api/applications/{id}/status` | Update status | Admin |
| PATCH | `/api/applications/{id}/withdraw` | Withdraw application | Student |

### POST /api/applications
```json
Request: { "job_id": "uuid" }
Response: { "id": "...", "status": "APPLIED", ... }
```

### PATCH /api/applications/{id}/status
```json
Request: { "status": "SHORTLISTED" | "REJECTED" }
```

---

## Error Responses

| Code | Meaning |
|------|---------|
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (role/eligibility check failed) |
| 404 | Not Found |
| 409 | Conflict (duplicate application) |

### Error Format
```json
{ "detail": "Error message" }
```
