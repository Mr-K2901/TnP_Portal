-- Enable UUID generation (required)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--------------------------------------------------
-- 1. USERS (Auth + Role Gatekeeper)
--------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
    created_at TIMESTAMP DEFAULT now()
);

--------------------------------------------------
-- 2. PROFILES (Student Golden Record)
--------------------------------------------------
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cgpa FLOAT CHECK (cgpa >= 0 AND cgpa <= 10),
    branch TEXT NOT NULL,
    resume_url TEXT,
    is_placed BOOLEAN DEFAULT FALSE
);

--------------------------------------------------
-- 3. JOBS (TnP Job Postings)
--------------------------------------------------
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    role TEXT NOT NULL,
    ctc TEXT,
    min_cgpa FLOAT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    jd_link TEXT,
    created_at TIMESTAMP DEFAULT now()
);

--------------------------------------------------
-- 4. APPLICATIONS (Student ↔ Job Mapping)
--------------------------------------------------
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('APPLIED', 'SHORTLISTED', 'REJECTED')),
    applied_at TIMESTAMP DEFAULT now(),
    UNIQUE (job_id, student_id)
);

--------------------------------------------------
-- INDEXES (Performance Safety)
--------------------------------------------------
CREATE INDEX idx_jobs_active ON jobs(is_active);
CREATE INDEX idx_jobs_min_cgpa ON jobs(min_cgpa);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_student ON applications(student_id);
