"""
Email Service - Gmail SMTP Client
Handles sending emails with template variable substitution.
"""

import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Optional
from datetime import datetime

from app.core.config import get_settings


class EmailService:
    """
    Gmail SMTP client for sending templated emails.
    """
    
    def __init__(self):
        settings = get_settings()
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_name = settings.SMTP_FROM_NAME
    
    def is_configured(self) -> bool:
        """Check if SMTP credentials are set."""
        return bool(self.user and self.password)
    
    def render_template(self, template: str, variables: Dict[str, str]) -> str:
        """
        Replace {{variable}} placeholders with actual values.
        """
        def replacer(match):
            var_name = match.group(1).strip()
            return variables.get(var_name, match.group(0))
        
        return re.sub(r'\{\{(\w+)\}\}', replacer, template)
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        variables: Dict[str, str] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Send a single email.
        
        Returns:
            (success: bool, error_message: Optional[str])
        """
        if not self.is_configured():
            return False, "SMTP not configured"
        
        # Render template variables
        if variables:
            subject = self.render_template(subject, variables)
            body_html = self.render_template(body_html, variables)
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.user}>"
            msg['To'] = to_email
            
            # Attach plain text body (primary)
            text_part = MIMEText(body_html, 'plain')
            msg.attach(text_part)
            
            # Send via SMTP
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.user, to_email, msg.as_string())
            
            return True, None
            
        except smtplib.SMTPAuthenticationError:
            return False, "SMTP authentication failed. Check credentials."
        except smtplib.SMTPRecipientsRefused:
            return False, f"Recipient refused: {to_email}"
        except smtplib.SMTPException as e:
            return False, f"SMTP error: {str(e)}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"


# Singleton instance
email_service = EmailService()


# =============================================================================
# PRE-BUILT TEMPLATES
# =============================================================================

PREBUILT_TEMPLATES = [
    {
        "name": "Job Opportunity Alert",
        "subject": "New Opportunity: {{role}} at {{company_name}}",
        "body_html": """Dear {{student_name}},

We are pleased to inform you about a new job opportunity that aligns with your profile.

Company: {{company_name}}
Position: {{role}}
Package: {{ctc}}

Please log in to the TnP Portal at your earliest convenience to review the complete job description and submit your application before the deadline.

Should you have any questions, feel free to reach out to the Placement Cell.

Best regards,
Training & Placement Cell""",
        "variables": "student_name,company_name,role,ctc"
    },
    {
        "name": "Interview Scheduled",
        "subject": "Interview Confirmation: {{company_name}} - {{role}}",
        "body_html": """Dear {{student_name}},

Your interview has been confirmed. Please find the details below:

Company: {{company_name}}
Position: {{role}}
Date: {{date}}
Time: {{time}}
Venue: {{venue}}

Kindly ensure you arrive 15 minutes prior to your scheduled time. Carry the following documents:
- Updated Resume (2 copies)
- College ID Card
- Academic Transcripts

We wish you the very best for your interview.

Warm regards,
Training & Placement Cell""",
        "variables": "student_name,company_name,role,date,time,venue"
    },
    {
        "name": "Placement Congratulations",
        "subject": "Congratulations on Your Placement at {{company_name}}",
        "body_html": """Dear {{student_name}},

We are delighted to inform you that you have been successfully placed!

Company: {{company_name}}
Position: {{role}}
Package: {{ctc}}

This achievement reflects your dedication and hard work throughout the placement process. We are proud of your accomplishment and wish you a fulfilling and successful career ahead.

Please visit the Placement Cell at your convenience to complete the necessary formalities.

Congratulations once again!

Warm regards,
Training & Placement Cell""",
        "variables": "student_name,company_name,role,ctc"
    },
    {
        "name": "Document Reminder",
        "subject": "Action Required: Document Submission",
        "body_html": """Dear {{student_name}},

This is a gentle reminder regarding the submission of your pending documents.

Documents Required:
{{document_list}}

Please submit the above documents to the Placement Cell office or upload them through the TnP Portal by the specified deadline.

Failure to submit these documents may affect your eligibility for upcoming placement opportunities.

For any clarifications, please contact the Placement Cell.

Regards,
Training & Placement Cell""",
        "variables": "student_name,document_list"
    },
    {
        "name": "General Announcement",
        "subject": "Important Notice from Training & Placement Cell",
        "body_html": """Dear {{student_name}},

We would like to bring the following to your attention:

{{message}}

Please take note of this information and act accordingly. For any queries or assistance, the Placement Cell is available during office hours.

Thank you for your attention.

Regards,
Training & Placement Cell""",
        "variables": "student_name,message"
    }
]
