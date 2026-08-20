/*
  # Create calendar_feeds table

  1. New Tables
    - `calendar_feeds`
      - `id` (uuid, primary key)
      - `role` (text) — one of: 'ado', 'cs', 'dorm'
      - `dorm_name` (text, nullable) — e.g. 'Anderson'; only set when role = 'dorm'
      - `label` (text) — human-readable name shown in admin UI
      - `ical_url` (text) — private Google Calendar iCal URL
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Authenticated users can read, insert, update, delete (admin-only panel)
*/

CREATE TABLE IF NOT EXISTS calendar_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  dorm_name text,
  label text NOT NULL DEFAULT '',
  ical_url text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read feeds"
  ON calendar_feeds FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert feeds"
  ON calendar_feeds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update feeds"
  ON calendar_feeds FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete feeds"
  ON calendar_feeds FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
