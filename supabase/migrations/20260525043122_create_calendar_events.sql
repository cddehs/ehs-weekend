/*
  # Create calendar_events table

  ## Summary
  Flat schema for parsed iCal (.ics) calendar events used by the Campus Portal
  calendar view. Each row represents one VEVENT, fully denormalized so the UI
  can render without joins.

  ## New Table: calendar_events
  - `id`          uuid primary key, auto-generated
  - `category`    text — top-level calendar category (e.g. "Athletics", "Academic")
  - `subCategory` text — secondary grouping (e.g. "Varsity", "Upper School")
  - `titleBlock`  text — the raw SUMMARY text from the .ics file, commas preserved
  - `timeToken`   text — manual time annotation extracted from the summary
                          (e.g. "Sat 7pm - Sun 7pm") before any date parsing
  - `startDate`   timestamptz — DTSTART parsed from the event
  - `endDate`     timestamptz — DTEND parsed from the event
  - `created_at`  timestamptz — insertion timestamp

  ## Security
  - RLS enabled; authenticated users may read all events
  - Authenticated users may insert / update / delete (staff upload use-case)
*/

CREATE TABLE IF NOT EXISTS calendar_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text        NOT NULL DEFAULT '',
  "subCategory" text       NOT NULL DEFAULT '',
  "titleBlock"  text       NOT NULL DEFAULT '',
  "timeToken"   text       NOT NULL DEFAULT '',
  "startDate"   timestamptz,
  "endDate"     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert calendar events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update calendar events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete calendar events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events ("startDate");
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON calendar_events (category);
