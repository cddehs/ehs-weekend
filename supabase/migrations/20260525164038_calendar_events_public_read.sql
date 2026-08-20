/*
  # Allow public read on calendar_events

  The calendar is a public-facing campus board — no login is required to view events.
  Writes remain server-side only (edge function uses service role, bypassing RLS).

  Changes:
  - Drop the authenticated-only SELECT policy
  - Add a new SELECT policy open to all roles (anon + authenticated)
*/

DROP POLICY IF EXISTS "Authenticated users can read calendar events" ON calendar_events;

CREATE POLICY "Anyone can read calendar events"
  ON calendar_events
  FOR SELECT
  TO anon, authenticated
  USING (true);
