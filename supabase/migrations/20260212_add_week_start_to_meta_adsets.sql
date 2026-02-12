-- Migration: Add week_start column to meta_adsets for date filtering
-- This allows filtering adsets by week period, consistent with ad_creatives and ad_copies

-- Add week_start column
ALTER TABLE meta_adsets ADD COLUMN IF NOT EXISTS week_start DATE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_meta_adsets_week_start ON meta_adsets(week_start);

-- Update existing records to have a default week_start (can be updated later with actual data)
-- This ensures existing data won't break queries
