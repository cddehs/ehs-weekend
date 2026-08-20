/*
  # Add fan_van_url to calendar_events

  Adds an optional fan_van_url column to calendar_events.
  When set on an athletics event, the app renders a "Fan Van" signup button
  linking to the provided URL (typically a Google Form).

  1. Changes
    - `calendar_events`: new nullable `fan_van_url` (text) column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'fan_van_url'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN fan_van_url text;
  END IF;
END $$;
