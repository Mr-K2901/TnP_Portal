# WhatsApp Integration Guide & Production Requirements

## 1. Overview: Sandbox vs. Production
Currently, the application is configured to use the **Twilio Sandbox for WhatsApp**. This is a free testing environment with significant limitations designed to prevent spam.

### 🛑 Sandbox Limitations (Current State)
1.  **Strict Opt-In Requirement**: Users **MUST** send a specific "Join Code" (e.g., `join <your-keyword>`) to the Sandbox Number (`+1 415 523 8886`) before you can message them.
2.  **Limited Numbers**: You can only message numbers that have completed this opt-in process.
3.  **Session Window**: Once a user message is received, a 24-hour window opens where you can reply freely. Outside this window, you must use Templates.

### ✅ Production Capabilities (Goal)
Once moved to a Live Production account:
1.  **Direct Messaging**: You can message any user without them joining a sandbox first.
2.  **Template Messaging**: To initiate a conversation (e.g., "Hello Student"), you use pre-approved templates.
3.  **Dedicated Number**: Messages will come from your specific Business Phone Number, not a shared one.
4.  **Brand Identity**: Your business name and verify checkmark (if eligible) will appear.

---

## 2. Moving to Production: Step-by-Step

To enable direct messaging to students without the "Join Sandbox" step, follow this process:

### Step 1: Upgrading Twilio Account
1.  **Upgrade Project**: Add a credit card to your Twilio console to remove trial restrictions.
2.  **Purchase a Number**: Buy a dedicated phone number capable of SMS/Voice (approx. $1-2/month).

### Step 2: Meta Business Verification
1.  **Request Access**: In Twilio Console > Messaging > Senders > WhatsApp Senders, request access to enable WhatsApp on your new number.
2.  **Facebook Business Manager**: Link your Twilio account to your Meta Business Manager ID.
3.  **Submit Verification**: Provide your Legal Business Name, Address, and Website for verification. This can take 1-3 days.

### Step 3: WhatsApp Sender Profile
1.  In Twilio Console, create a **WhatsApp Sender Profile**.
2.  Assign your purchased phone number to this profile.
3.  Update the `TWILIO_WHATSAPP_NUMBER` in your `.env` file to this new number.

### Step 4: Template Approval (Critical)
WhatsApp does not allow free-form marketing messages to start a conversation. You must use **Templates**.
1.  **Create Templates**: In Twilio Console > Messaging > WhatsApp > Templates.
2.  **Submit for Approval**: Example Template:
    > "Hi {{1}}, this is an update from the TnP Cell. Your interview is scheduled for {{2}}. Reply 'YES' to confirm."
3.  **Approval Time**: Usually instant or within a few hours.
4.  **Usage**: In the TnP Portal, your campaign `Body Text` must MATCH the approved template text exactly.

---

## 3. Technical Implementation Details

### Configuration (.env)
We have separated the configuration for Voice and WhatsApp to allow flexibility (e.g., using a US number for Voice and a local number for WhatsApp).

```ini
# Voice Calls (Twilio Voice)
TWILIO_PHONE_NUMBER=+19303004271

# WhatsApp (Twilio Sandbox or Production Sender)
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### Backend Logic (`twilio_service.py`)
- The service automatically detects if the message is for WhatsApp.
- It prefixes `whatsapp:` to both the sender and receiver numbers.
- It strips spaces and formats numbers to E.164 format (e.g., `+919876543210`).

### Campaign Execution
- **Sync Status**: A "Sync Status" button is available in the admin panel to poll Twilio for the actual delivery status (`delivered`, `read`, `failed`).
- **Retry Logic**: Failed messages can be retried individually without resending the entire campaign.

---

## 4. Testing Procedure (Sandbox Mode)

1.  **Join Sandbox**: On your personal phone, open WhatsApp and send `join <your-sandbox-keyword>` to `+1 415 523 8886`.
2.  **Verify**: Wait for the reply: "You are all set!".
3.  **Create Campaign**: Go to Admin > Campaigns > New WhatsApp Campaign.
4.  **Select Student**: Ensure the student's phone number in the database matches your personal phone number exactly (e.g., `+91...`).
5.  **Send**: Launch the campaign.
6.  **Check Status**:
    - If status sticks on `SENT` but no message arrives: You likely didn't join the sandbox or the 24-hour window expired.
    - Click **Sync Status** to see if it updates to `FAILED`.
