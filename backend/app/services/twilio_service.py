"""
Twilio Service - Wrapper for Twilio Voice API
Handles outbound calls and TwiML generation.
"""

from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Record
from typing import Optional

from app.core.config import get_settings


class TwilioService:
    """
    Wrapper for Twilio Voice API operations.
    """
    
    def __init__(self):
        settings = get_settings()
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_PHONE_NUMBER
        self.whatsapp_from_number = settings.TWILIO_WHATSAPP_NUMBER or settings.TWILIO_PHONE_NUMBER
        self.webhook_base_url = settings.TWILIO_WEBHOOK_BASE_URL or "http://localhost:8000"
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None
            print("WARNING: Twilio credentials not configured. Call features disabled.")
    
    def is_configured(self) -> bool:
        """Check if Twilio is properly configured."""
        return self.client is not None and self.from_number is not None
    
    def initiate_call(self, to_number: str, call_log_id: str) -> Optional[str]:
        """
        Initiate an outbound call.
        Returns the Twilio Call SID if successful.
        """
        if not self.is_configured():
            raise RuntimeError("Twilio is not configured")
        
        call = self.client.calls.create(
            to=to_number,
            from_=self.from_number,
            url=f"{self.webhook_base_url}/api/webhooks/twilio/voice?call_log_id={call_log_id}",
            status_callback=f"{self.webhook_base_url}/api/webhooks/twilio/status?call_log_id={call_log_id}",
            status_callback_event=["initiated", "ringing", "answered", "completed"]
        )
        
        return call.sid
    
    def generate_voice_twiml(self, script: str, call_log_id: str) -> str:
        """
        Generate TwiML for the voice response.
        Plays script, records user response, and requests transcription.
        """
        response = VoiceResponse()
        
        # Play the script
        response.say(script, voice="alice", language="en-IN")
        
        # Record the response with transcription
        response.record(
            action=f"{self.webhook_base_url}/api/webhooks/twilio/recording?call_log_id={call_log_id}",
            transcribe=True,
            transcribe_callback=f"{self.webhook_base_url}/api/webhooks/twilio/transcription?call_log_id={call_log_id}",
            max_length=60,
            play_beep=True,
            timeout=5
        )
        
        # Thank you message
        response.say("Thank you for your response. Goodbye.", voice="alice", language="en-IN")
        response.hangup()
        
        return str(response)
    
    def generate_recording_complete_twiml(self) -> str:
        """
        TwiML response after recording is complete (action callback).
        """
        response = VoiceResponse()
        response.say("Thank you. Your response has been recorded.", voice="alice", language="en-IN")
        response.hangup()
        return str(response)

    def send_whatsapp_message(self, to_number: str, body: str) -> tuple[bool, Optional[str]]:
        """
        Send a WhatsApp message.
        Handles 'whatsapp:' prefix automatically.
        """
        if not self.is_configured():
            print("Twilio is not configured")
            return False, "Twilio not configured"
        
        # Clean spaces from keys
        to_number = to_number.replace(" ", "").strip()

        # Ensure whatsapp: prefix
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"
            
        from_number = self.whatsapp_from_number.replace(" ", "").strip()
        if not from_number.startswith("whatsapp:"):
            from_number = f"whatsapp:{from_number}"
            
        try:
            message = self.client.messages.create(
                body=body,
                from_=from_number,
                to=to_number
            )
            return True, message.sid
        except Exception as e:
            error_msg = str(e)
            print(f"WhatsApp send failed: {error_msg}")
            
            # Rate limit handling (code 63038) is handled by the caller/background task
            # by checking the error message or code if needed.
            return False, error_msg

    def get_message_status(self, message_sid: str) -> dict:
        """
        Fetch the current status of a message from Twilio.
        """
        if not self.is_configured():
            return {"status": "unknown", "error": "Twilio not configured"}
            
        try:
            msg = self.client.messages(message_sid).fetch()
            return {
                "status": msg.status,
                "error_code": msg.error_code,
                "error_message": msg.error_message
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


# Singleton instance
twilio_service = TwilioService()
