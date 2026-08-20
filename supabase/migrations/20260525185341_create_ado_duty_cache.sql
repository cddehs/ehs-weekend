/*
  # Create ADO duty cache table

  ## Purpose
  Caches parsed ADO duty assignments from the Google Calendar iCal feed.
  Each row represents one duty period — from the event start date at noon
  through the next day at noon.

  ## Tables
  - `ado_duty_cache`
    - `id` (uuid, pk)
    - `duty_date` (date) — the calendar date the event is on
    - `raw_title` (text) — original event SUMMARY from the feed
    - `display_name` (text) — formatted "F. Lastname" name
    - `fetched_at` (timestamptz) — when this row was inserted/refreshed

  ## Security
  - RLS enabled; public SELECT allowed (dashboard is public-facing)
  - INSERT/UPDATE/DELETE restricted to service role only (edge function)
*/

CREATE TABLE IF NOT EXISTS ado_duty_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_date   date NOT NULL,
  raw_title   text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  fetched_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ado_duty_cache_date_idx ON ado_duty_cache (duty_date);

ALTER TABLE ado_duty_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read ADO duty cache"
  ON ado_duty_cache FOR SELECT
  TO anon, authenticated
  USING (true);
