-- =============================================================================
-- SAMPLE DATA FOR TnP PORTAL
-- Department: DOT (Department of Technology)
-- Course: Data Science oriented
-- =============================================================================

-- NOTE: Run the ALTER TABLE first if not done already
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;

-- =============================================================================
-- ADMIN USER (for testing)
-- =============================================================================

INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@tnp.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V',
    'ADMIN',
    NOW()
) ON CONFLICT (email) DO NOTHING;


-- =============================================================================
-- 5 STUDENT USERS + PROFILES
-- =============================================================================

-- Student 1: Rahul Sharma
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'rahul.sharma@student.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V',
    'STUDENT',
    NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, full_name, cgpa, branch, department, resume_url, is_placed)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'Rahul Sharma',
    8.5,
    'Data Science',
    'DOT',
    NULL,
    FALSE
) ON CONFLICT (user_id) DO NOTHING;


-- Student 2: Priya Patel
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (
    '20000000-0000-0000-0000-000000000002',
    'priya.patel@student.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V',
    'STUDENT',
    NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, full_name, cgpa, branch, department, resume_url, is_placed)
VALUES (
    '20000000-0000-0000-0000-000000000002',
    'Priya Patel',
    9.1,
    'Machine Learning',
    'DOT',
    NULL,
    FALSE
) ON CONFLICT (user_id) DO NOTHING;


-- Student 3: Amit Kumar
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (
    '30000000-0000-0000-0000-000000000003',
    'amit.kumar@student.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V',
    'STUDENT',
    NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, full_name, cgpa, branch, department, resume_url, is_placed)
VALUES (
    '30000000-0000-0000-0000-000000000003',
    'Amit Kumar',
    7.8,
    'Artificial Intelligence',
    'DOT',
    NULL,
    FALSE
) ON CONFLICT (user_id) DO NOTHING;


-- Student 4: Sneha Reddy
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (
    '40000000-0000-0000-0000-000000000004',
    'sneha.reddy@student.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V',
    'STUDENT',
    NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, full_name, cgpa, branch, department, resume_url, is_placed)
VALUES (
    '40000000-0000-0000-0000-000000000004',
    'Sneha Reddy',
    8.9,
    'Data Analytics',
    'DOT',
    NULL,
    TRUE
) ON CONFLICT (user_id) DO NOTHING;


-- Student 5: Vikram Singh
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (
    '50000000-0000-0000-0000-000000000005',
    'vikram.singh@student.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V',
    'STUDENT',
    NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, full_name, cgpa, branch, department, resume_url, is_placed)
VALUES (
    '50000000-0000-0000-0000-000000000005',
    'Vikram Singh',
    7.2,
    'Big Data',
    'DOT',
    NULL,
    FALSE
) ON CONFLICT (user_id) DO NOTHING;


-- =============================================================================
-- 5 COMPANIES (JOBS)
-- =============================================================================

-- Job 1: Google - Data Scientist
INSERT INTO jobs (id, company_name, role, ctc, min_cgpa, is_active, jd_link, created_at)
VALUES (
    'a1000000-0000-0000-0000-000000000001',
    'Google',
    'Data Scientist',
    '25-30 LPA',
    8.0,
    TRUE,
    'https://careers.google.com/jobs',
    NOW()
) ON CONFLICT (id) DO NOTHING;


-- Job 2: Microsoft - ML Engineer
INSERT INTO jobs (id, company_name, role, ctc, min_cgpa, is_active, jd_link, created_at)
VALUES (
    'a2000000-0000-0000-0000-000000000002',
    'Microsoft',
    'Machine Learning Engineer',
    '22-28 LPA',
    7.5,
    TRUE,
    'https://careers.microsoft.com',
    NOW()
) ON CONFLICT (id) DO NOTHING;


-- Job 3: Amazon - Data Analyst
INSERT INTO jobs (id, company_name, role, ctc, min_cgpa, is_active, jd_link, created_at)
VALUES (
    'a3000000-0000-0000-0000-000000000003',
    'Amazon',
    'Data Analyst',
    '18-22 LPA',
    7.0,
    TRUE,
    'https://amazon.jobs',
    NOW()
) ON CONFLICT (id) DO NOTHING;


-- Job 4: Flipkart - AI Research Intern
INSERT INTO jobs (id, company_name, role, ctc, min_cgpa, is_active, jd_link, created_at)
VALUES (
    'a4000000-0000-0000-0000-000000000004',
    'Flipkart',
    'AI Research Intern',
    '12-15 LPA',
    6.5,
    TRUE,
    'https://flipkart.careers',
    NOW()
) ON CONFLICT (id) DO NOTHING;


-- Job 5: Infosys - Data Engineering Lead
INSERT INTO jobs (id, company_name, role, ctc, min_cgpa, is_active, jd_link, created_at)
VALUES (
    'a5000000-0000-0000-0000-000000000005',
    'Infosys',
    'Data Engineering Lead',
    '15-18 LPA',
    7.0,
    FALSE,
    'https://infosys.com/careers',
    NOW()
) ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SAMPLE APPLICATIONS (Optional - for testing workflows)
-- =============================================================================

-- Rahul applied to Google
INSERT INTO applications (id, job_id, student_id, status, applied_at)
VALUES (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'APPLIED',
    NOW()
) ON CONFLICT ON CONSTRAINT unique_job_student_application DO NOTHING;

-- Priya applied to Microsoft (SHORTLISTED)
INSERT INTO applications (id, job_id, student_id, status, applied_at)
VALUES (
    'b2000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'SHORTLISTED',
    NOW()
) ON CONFLICT ON CONSTRAINT unique_job_student_application DO NOTHING;

-- Sneha applied to Amazon (SHORTLISTED - she's placed)
INSERT INTO applications (id, job_id, student_id, status, applied_at)
VALUES (
    'b3000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000004',
    'SHORTLISTED',
    NOW()
) ON CONFLICT ON CONSTRAINT unique_job_student_application DO NOTHING;

-- Amit applied to Flipkart (REJECTED)
INSERT INTO applications (id, job_id, student_id, status, applied_at)
VALUES (
    'b4000000-0000-0000-0000-000000000004',
    'a4000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000003',
    'REJECTED',
    NOW()
) ON CONFLICT ON CONSTRAINT unique_job_student_application DO NOTHING;


-- =============================================================================
-- END OF DATA
-- =============================================================================

select * from students;
