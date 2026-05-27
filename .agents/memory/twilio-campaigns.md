---
name: Twilio WhatsApp/SMS Campaigns
description: How campaigns feature is implemented with Twilio + graceful degradation
---

## Rule
Campaigns page at `/campaigns` uses Twilio for WhatsApp/SMS sending. If TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER are not set, the send route simulates sending (marks all contacts as "sent" with 80ms delay each).

## Twilio Config
- SMS from: `TWILIO_PHONE_NUMBER` (format: +1234567890)
- WhatsApp from: `TWILIO_WHATSAPP_NUMBER` (if set, else falls back to TWILIO_PHONE_NUMBER prepended with "whatsapp:")
- WhatsApp to: prepend "whatsapp:" to recipient phone number

## DB Tables (raw SQL migration)
- `campaigns` - main campaign record (user_id, name, message, type, status, scheduled_at, total_contacts, sent_count, failed_count)
- `campaign_contacts` - per-contact status tracking (campaign_id, phone, name, status, sent_at, error)

**Why:** DB migrations use CREATE TABLE IF NOT EXISTS since drizzle push would drop the sessions table.
