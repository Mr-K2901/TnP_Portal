# Design Decisions

## 1. No PLACED Status Enum

**Decision:** Placement is tracked via `profiles.is_placed` boolean, not as an application status.

**Rationale:**
- A student is placed once, not per-application
- SHORTLISTED means "this application was successful"
- Adding PLACED to the enum would complicate queries (which application is "the" placed one?)
- Simpler to have a single source of truth on the profile

**Implementation:**
```python
# profiles table
is_placed: bool = False

# When admin marks placed:
profile.is_placed = True
```

---

## 2. Placement is Informational Only

**Decision:** Placed students can still browse jobs and apply.

**Rationale:**
- Some colleges allow students to apply for better offers
- Placement is a record, not a restriction
- Reduces edge case handling in UI
- Admin decides the policy, not the system

**Implementation:**
- No 403 error when applying after placement
- Dashboard shows jobs normally
- My Applications shows "Placed (Company)" on the relevant row

---

## 3. Students Can Apply After Placement

**Decision:** No backend restriction on applying when `is_placed == true`.

**Rationale:**
- Flexibility for different college policies
- Some students may get placed in multiple companies
- Admin can choose to mark additional placements or not

**Previous (Removed):**
```python
# This was removed:
if profile.is_placed:
    raise HTTPException(403, "Already placed")
```

---

## 4. CGPA Enforced Backend-Only

**Decision:** CGPA eligibility check happens only on `POST /api/applications`.

**Rationale:**
- Backend is source of truth
- Students should see all jobs (transparency)
- Frontend shows "Not Eligible" as UX hint, but doesn't hide jobs
- Prevents data inconsistency between UI and backend

**Implementation:**
```python
if profile.cgpa < job.min_cgpa:
    raise HTTPException(403, "You do not meet the CGPA requirement")
```

---

## 5. Frontend Auth via localStorage

**Decision:** Store JWT in localStorage, decode role client-side.

**Rationale:**
- Simple implementation
- No server-side session needed
- Token expiry checked on each page load
- Role parsed from JWT payload for routing

**Trade-offs:**
- XSS vulnerability (acceptable for internal tool)
- No refresh token (user re-logs after expiry)

---

## 6. No Withdraw Feature for Non-APPLIED

**Decision:** Students can only withdraw APPLIED applications.

**Rationale:**
- SHORTLISTED/REJECTED are admin decisions
- Withdrawing after shortlist would confuse workflow
- Keeps application lifecycle simple

---

## 7. Unique Constraint on Applications

**Decision:** `UNIQUE(job_id, student_id)` on applications table.

**Rationale:**
- One application per student per job
- Database enforces integrity
- No duplicate application bugs possible
