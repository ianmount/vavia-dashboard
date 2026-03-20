-- Run this in your Supabase SQL editor to add the internal dashboard fields.
-- These columns are nullable so existing rows are unaffected.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS internal_notes    TEXT,
  ADD COLUMN IF NOT EXISTS asana_task_gid    TEXT,
  ADD COLUMN IF NOT EXISTS basecamp_todo_id  TEXT;
