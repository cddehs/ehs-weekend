/*
  # Add location column to calendar_events

  ## Summary
  Adds a `location` text column to store the LOCATION field from iCal VEVENT blocks.
  Defaults to empty string so existing rows are unaffected.

  ## Changes
  - `calendar_events`: new column `location` (text, default '')
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'location'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN location text NOT NULL DEFAULT '';
  END IF;
END $$;
