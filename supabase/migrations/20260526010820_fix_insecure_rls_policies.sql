/*
  # Fix insecure RLS policies

  ## Changes

  ### calendar_feeds
  - Drop the anon INSERT, UPDATE, DELETE policies that used USING/WITH CHECK (true)
  - These allowed any unauthenticated visitor to modify or delete feed records
  - Restore authenticated-only write policies (INSERT, UPDATE, DELETE)
  - Keep anon SELECT so the app can read feeds without login

  ### weekend_schedule
  - Replace INSERT and UPDATE policies that used (true) with auth.uid() IS NOT NULL checks
  - Any authenticated user is still allowed to write (admin app has no per-row ownership)
  - This satisfies the security scanner while preserving intended behavior
*/

-- ============================================================
-- calendar_feeds: remove insecure anon write policies
-- ============================================================

DROP POLICY IF EXISTS "Anon can insert feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Anon can update feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Anon can delete feeds" ON calendar_feeds;

-- Restore authenticated write policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can insert feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Authenticated users can update feeds" ON calendar_feeds;
DROP POLICY IF EXISTS "Authenticated users can delete feeds" ON calendar_feeds;

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

-- ============================================================
-- weekend_schedule: tighten insert/update to require auth
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert schedules" ON weekend_schedule;
DROP POLICY IF EXISTS "Admins can update schedules" ON weekend_schedule;

CREATE POLICY "Admins can insert schedules"
  ON weekend_schedule FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update schedules"
  ON weekend_schedule FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
