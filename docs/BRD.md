# Business Requirements Document (BRD): TnP Portal

## 1. Executive Summary & Business Objective
The **TnP Portal** (Training and Placement Portal) is a centralized web application designed to automate and streamline the end-to-end recruitment process for educational institutions. 

**Core Objective**: To eliminate manual tracking of placements, provide real-time job accessibility to eligible students, and empower administrators with data-driven tools for recruitment management.

---

## 2. User Roles & Permissions

| Role | Permissions | Responsibilities |
| :--- | :--- | :--- |
| **Admin** | Full system access | Manage job postings, import/export student data, verify placements, and monitor campus health. |
| **Student** | Limited personal access | Maintain profile, discover opportunities, and track application progress. |
| **Guest** | No access | Login requirement for all system features. |

---

## 3. Functional Requirements

### 3.1 Admin Module (Recruitment Management)
- **Job Lifecycle Management**: Post, Edit, and Archive (Activate/Deactivate) recruitment drives.
- **Job ID Logic**: Automatic unique identifier display for internal tracking.
- **Student Directory**: A complete, filterable registry of all students with multi-criteria search (CGPA, Branch, Status).
- **Bulk Operations**: Import student records via CSV and export directory data for external reporting.
- **Placement Authority**: Excusive right to mark a student as "Placed" or "Seeking Opportunities" to ensure data integrity.
- **Application Oversight**: View a unified list of applicants for specific jobs with status indicators.

### 3.2 Student Module (Career Dashboard)
- **Profile Integrity**: Self-service updates for CGPA, Course/Branch, and Resume links (Google Drive/OneDrive).
- **Discovery Engine**: Interactive job board with search functionality and eligibility highlighting (CGPA verification).
- **Application Workflow**: Transparent job details with a simple "Apply" mechanism for eligible postings.
- **Tracking System**: Visual feedback on application status (Applied, Shortlisted, Rejected, Placed).

---

## 4. Non-Functional Requirements (NFRs)

- **Security**: 
    - Stateless JWT-based authentication.
    - Role-Based Access Control (RBAC) enforced at both API and UI levels.
- **Performance**: 
    - Implementation of server-side/client-side pagination for large datasets.
    - Under 2-second response time for search and filtering operations.
- **Scalability**: Decoupled Frontend (Next.js) and Backend (FastAPI) architecture to allow independent scaling.
- **Design Excellence**: Modern, high-contrast UI using a standardized Indigo-based color palette with glassmorphism elements.

---

## 5. Data Ownership & Rules
- **Source of Truth**: The centralized SQL database is the final authority for all placement metrics.
- **Placement State**: Students *cannot* change their own placement status; this is a protected Admin-only field.
- **Privacy**: Personal contact details and resume links are only accessible to verified Administrators and recruiters.

---

## 6. User Flows & Acceptance Criteria

### 6.1 Flow: Student Job Application
1. Student searches for a job in the dashboard.
2. System validates eligibility (CGPA >= Job Min CGPA).
3. Student clicks "Apply".
4. Result: Application is recorded, and the status changes to "Applied".

### 6.2 Flow: Admin Placement Verification
1. Admin opens the Applications page for a specific job.
2. Admin clicks "Mark Placed" for a student.
3. Result: Student profile is globally updated to "Placed" across the entire system.

---

## 7. Constraints & Out-of-Scope
- **Constraints**: Application depends on students maintaining accurate resume links.
- **Out-of-Scope (V1)**: 
    - Automated email notifications.
    - In-app interview scheduling and calendar integration.
    - Video resume hosting.

---

## 8. Risks & Assumptions
- **Assumption**: Students have reliable internet access to view and apply for jobs.
- **Risk**: Data inconsistency if students provide fraudulent CGPA data (Mitigated by Admin verification tools).

---

## 9. Phased Roadmap

### Phase 1: Core Portal (Current)
- Basic CRUD for Jobs and Students.
- Authentication and Role management.
- Standardized UI/UX and search/filtering.

### Phase 2: Analytics & Communication (Near Term)
- Admin Dashboard with charts (Placement % by branch).
- In-app notification system.
- Professional Resume Builder integration.

### Phase 3: Enterprise Integration (Future)
- SSO integration for institution-wide login.
- Direct Recruiter Login portals.
- AI-based job recommendations for students.

---
**Exported on**: 2026-02-04
**Status**: Approved / Version 1.0
