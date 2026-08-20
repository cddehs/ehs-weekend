/*
  # Fix calendar_feeds RLS policies for anon access

  Drop all existing policies and recreate for anon role.
*/

DROP POLICY IF EXISTS "Authenticated users can read feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Authenticated users can insert feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Authenticated users can update feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Authenticated users can delete feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Anon can read feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Anon can insert feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Anon can update feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Anon can delete feeds" ON calendar_feeds;

CREATE POLICY "Anon can read feeds"
  ON calendar_feeds FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert feeds"
  ON calendar_feeds FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update feeds"
  ON calendar_feeds FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete feeds"
  ON calendar_feeds FOR DELETE
  TO anon
  USING (true);
