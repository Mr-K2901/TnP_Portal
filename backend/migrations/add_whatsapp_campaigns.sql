-- Create WhatsApp Templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    body_text TEXT NOT NULL,
    variables TEXT,
    is_prebuilt BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- Create WhatsApp Campaigns table
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    template_id UUID REFERENCES whatsapp_templates(id),
    body_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'RUNNING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- Create WhatsApp Logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ')),
    message_sid TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT unique_whatsapp_campaign_student UNIQUE (campaign_id, student_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_campaign_id ON whatsapp_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_student_id ON whatsapp_logs(student_id);
