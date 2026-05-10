-- Add reminder preferences to profiles table for Email/WhatsApp maintenance reminders
-- Run this in Supabase SQL Editor after previous migrations

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reminder_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_whatsapp boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_days_before integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS whatsapp_phone text;  -- Optional separate WhatsApp number

-- Update existing profiles with defaults (safe)
UPDATE profiles SET 
  reminder_email = COALESCE(reminder_email, true),
  reminder_whatsapp = COALESCE(reminder_whatsapp, false),
  reminder_days_before = COALESCE(reminder_days_before, 7);

-- Note: For actual sending of reminders, implement a Supabase Edge Function 
-- triggered by pg_cron or scheduled job that:
-- 1. Queries assets where next_maintenance_due <= CURRENT_DATE + interval 'X days'
-- 2. Joins with profiles to check reminder settings and get contact info
-- 3. Sends via Resend (email) or Twilio/WhatsApp Business API
-- Example Edge Function would use @supabase/supabase-js and resend package

-- Also add index for performance on next_maintenance_due (if not exists)
CREATE INDEX IF NOT EXISTS idx_assets_next_maintenance_due ON assets(next_maintenance_due) WHERE next_maintenance_due IS NOT NULL;
