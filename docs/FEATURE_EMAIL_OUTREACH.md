# Email Outreach Feature

## Overview
Automated email campaign system for TnP Portal administrators to send bulk emails to students using Gmail SMTP.

---

## Features

| Feature | Description |
|---------|-------------|
| **Toggle UI** | Switch between Call Campaigns and Email Outreach on same page |
| **Pre-built Templates** | 5 ready-to-use templates for common scenarios |
| **Custom Templates** | Create, edit, and save custom templates |
| **Variable Substitution** | `{{student_name}}`, `{{email}}`, `{{branch}}`, `{{cgpa}}` |
| **Bulk Sending** | Background async sending with rate limiting (2s delay) |
| **Status Tracking** | PENDING → SENDING → SENT/FAILED |
| **Retry Failed** | One-click retry for failed emails |

---

## Pre-built Templates

1. **Job Opportunity Alert** - New job posting notification
2. **Interview Scheduled** - Interview confirmation with details
3. **Placement Congratulations** - Offer acceptance celebration
4. **Document Reminder** - Missing documents follow-up
5. **General Announcement** - Custom announcements

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────►│    Backend      │────►│   Gmail SMTP    │
│   (Next.js)     │     │    (FastAPI)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        └──────────────►│   PostgreSQL    │
                        │   - email_templates
                        │   - email_campaigns
                        │   - email_logs
                        └─────────────────┘
```

---

## API Endpoints

### Email Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/email-templates` | List all templates |
| GET | `/api/email-templates/{id}` | Get template by ID |
| POST | `/api/email-templates` | Create custom template |
| PUT | `/api/email-templates/{id}` | Update custom template |
| DELETE | `/api/email-templates/{id}` | Delete custom template |

### Email Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/email-campaigns` | List all campaigns |
| GET | `/api/email-campaigns/{id}` | Get campaign with logs |
| POST | `/api/email-campaigns` | Create new campaign |
| POST | `/api/email-campaigns/{id}/start` | Start sending |
| POST | `/api/email-campaigns/{id}/retry` | Retry failed emails |
| POST | `/api/email-campaigns/{id}/cancel` | Cancel campaign |

---

## Database Schema

```sql
-- Templates
email_templates (id, name, subject, body_html, variables, is_prebuilt, created_at)

-- Campaigns
email_campaigns (id, title, template_id, subject, body_html, status, created_at)

-- Per-recipient logs
email_logs (id, campaign_id, student_id, status, error_message, sent_at, created_at)
```

---

## Configuration

### Environment Variables (.env)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Gmail App Password
SMTP_FROM_NAME=TnP Portal
```

### Gmail App Password Setup
1. Enable 2-Step Verification at https://myaccount.google.com/security
2. Go to App Passwords → Generate new password for "Mail"
3. Use the 16-character password in `SMTP_PASSWORD`

---

## Files

### Backend
| File | Purpose |
|------|---------|
| `app/services/email_service.py` | Gmail SMTP client + template rendering |
| `app/api/email_templates.py` | Templates CRUD API |
| `app/api/email_campaigns.py` | Campaigns API + background sending |
| `app/db/models.py` | EmailTemplate, EmailCampaign, EmailLog models |
| `app/core/config.py` | SMTP configuration settings |

### Frontend
| File | Purpose |
|------|---------|
| `app/admin/campaigns/page.tsx` | Campaigns page with toggle |
| `app/admin/campaigns/email/new/page.tsx` | 3-step campaign wizard |

### Database
| File | Purpose |
|------|---------|
| `migrations/add_email_campaigns.sql` | SQL migration script |

---

## Usage

### Creating a Campaign
1. Go to **Admin → Campaigns**
2. Click **📧 Emails** toggle
3. Click **+ New Email Campaign**
4. **Step 1:** Filter and select students
5. **Step 2:** Choose template or write custom content
6. **Step 3:** Enter title, review preview, create
7. Click **▶ Start Sending** to begin

### Monitoring
- View sent/failed counts in campaign list
- Click campaign to see per-student status
- Click **🔄 Refresh** to update status
- Click **🔁 Retry Failed** to resend failed emails

---

## Rate Limiting
- 2-second delay between emails to avoid Gmail throttling
- Gmail limit: 500 emails/day for regular accounts
- Campaign auto-completes when all emails reach terminal state

---

## Status Flow

```
PENDING → SENDING → SENT
                  ↘ FAILED (retryable)
```
