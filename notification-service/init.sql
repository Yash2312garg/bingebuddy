-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE recipient_type_enum AS ENUM ('USER', 'RESTAURANT', 'ADMIN');
CREATE TYPE event_type_enum AS ENUM ('SMS', 'EMAIL', 'IN_APP', 'PUSH');
CREATE TYPE priority_enum AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE delivery_status_enum AS ENUM ('QUEUED', 'DELIVERED', 'FAILED', 'BOUNCED');

-- ==========================================
-- 2. TEMPLATES & PREFERENCES (Read-Heavy, Cached in Redis)
-- ==========================================
CREATE TABLE IF NOT EXISTS notification_templates (
    template_code VARCHAR(100) PRIMARY KEY, -- e.g., 'ORDER_CONFIRMED'
    channel event_type_enum NOT NULL,
    subject VARCHAR(255),
    body_content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
    recipient_id VARCHAR(255) NOT NULL,
    recipient_type recipient_type_enum NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (recipient_id, recipient_type)
);

-- ==========================================
-- 3. IN-APP NOTIFICATIONS (The UI Inbox)
-- ==========================================
-- This table stays relatively lean. You can archive/delete read messages older than 30 days.
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id VARCHAR(255) NOT NULL,
    recipient_type recipient_type_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- High-performance index for users loading their notification bell
CREATE INDEX idx_in_app_recipient ON in_app_notifications(recipient_id, recipient_type, created_at DESC);

-- ==========================================
-- 4. DELIVERY AUDIT LOGS (Partitioned for Massive Scale)
-- ==========================================
-- This table tracks Emails, SMS, and Push. It is partitioned by creation date.
-- Do NOT update rows here. If an email fails, insert a new row with status 'FAILED'.
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id UUID DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL, -- Ties back to your Redis Stream ID
    recipient_id VARCHAR(255) NOT NULL,
    channel event_type_enum NOT NULL,
    template_code VARCHAR(100),
    status delivery_status_enum NOT NULL,
    error_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at) -- Partition key must be in the Primary Key
) PARTITION BY RANGE (created_at);

-- Create the first two partitions (e.g., for the current and next month)
-- In production, you'd use a cron job (like pg_partman) to auto-create future partitions
CREATE TABLE logs_y2026m06 PARTITION OF notification_delivery_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE logs_y2026m07 PARTITION OF notification_delivery_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Index for debugging specific failed stream events
CREATE INDEX idx_logs_event_id ON notification_delivery_logs(event_id);


-- ==========================================
-- 3. SEED DATA (The Email Template)
-- ==========================================
INSERT INTO notification_templates (template_code, channel, subject, body_content)
VALUES (
    'AUTH_OTP_REQUEST', 
    'EMAIL', 
    'Your Binge Buddy Verification Code', 
    $$
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #dddddd; }
            .header h1 { margin: 0; color: #333333; }
            .content { padding: 20px 0; color: #555555; line-height: 1.6; }
            .otp-code { text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #ffffff; background-color: #007bff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #999999; padding-top: 20px; border-top: 1px solid #dddddd; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{{companyName}}</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Please use the following one-time password (OTP) to complete your verification. This code is valid for <strong>{{minutes}} minutes</strong>.</p>
                <div class="otp-code">{{otp}}</div>
                <p>For your security, do not share this code with anyone. If you did not request this verification, please disregard this email.</p>
                <p>Thank you!</p>
            </div>
            <div class="footer">
                <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    $$
);