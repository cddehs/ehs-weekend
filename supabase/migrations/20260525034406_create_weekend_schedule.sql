/*
  # Create weekend_schedule table

  1. New Tables
    - `weekend_schedule`
      - `id` (uuid, primary key)
      - `weekend_id` (text, unique) — e.g. "Team-31-May-2026"
      - `dates` (text) — e.g. "May 22-24, 2026"
      - `ado_phone` (text)
      - `friday_ado` (text)
      - `friday_cs_name` (text)
      - `friday_cs_phone` (text)
      - `friday_activities_lead_name` (text)
      - `friday_activities_lead_phone` (text)
      - `friday_dorms` (jsonb) — array of 10 name strings indexed to DORM_NAMES order
      - `saturday_ado` (text)
      - `saturday_cs_name` (text)
      - `saturday_cs_phone` (text)
      - `saturday_activities_lead_name` (text)
      - `saturday_activities_lead_phone` (text)
      - `saturday_dorms` (jsonb)
      - `sunday_ado` (text)
      - `sunday_cs_name` (text)
      - `sunday_cs_phone` (text)
      - `sunday_activities_lead_name` (text)
      - `sunday_activities_lead_phone` (text)
      - `sunday_dorms` (jsonb)
      - `special_activities` (jsonb) — array of {time, event}
      - `friday_date` (date) — actual calendar date for Friday
      - `saturday_date` (date)
      - `sunday_date` (date)
      - `is_active` (boolean) — marks the currently displayed weekend
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Public read for active schedule (no auth required — app is public-facing)
    - Authenticated users can insert/update (admin form)
*/

CREATE TABLE IF NOT EXISTS weekend_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekend_id text UNIQUE NOT NULL,
  dates text NOT NULL DEFAULT '',
  ado_phone text NOT NULL DEFAULT '',
  friday_ado text NOT NULL DEFAULT '',
  friday_cs_name text NOT NULL DEFAULT '',
  friday_cs_phone text NOT NULL DEFAULT '',
  friday_activities_lead_name text NOT NULL DEFAULT '',
  friday_activities_lead_phone text NOT NULL DEFAULT '',
  friday_dorms jsonb NOT NULL DEFAULT '[]'::jsonb,
  saturday_ado text NOT NULL DEFAULT '',
  saturday_cs_name text NOT NULL DEFAULT '',
  saturday_cs_phone text NOT NULL DEFAULT '',
  saturday_activities_lead_name text NOT NULL DEFAULT '',
  saturday_activities_lead_phone text NOT NULL DEFAULT '',
  saturday_dorms jsonb NOT NULL DEFAULT '[]'::jsonb,
  sunday_ado text NOT NULL DEFAULT '',
  sunday_cs_name text NOT NULL DEFAULT '',
  sunday_cs_phone text NOT NULL DEFAULT '',
  sunday_activities_lead_name text NOT NULL DEFAULT '',
  sunday_activities_lead_phone text NOT NULL DEFAULT '',
  sunday_dorms jsonb NOT NULL DEFAULT '[]'::jsonb,
  special_activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  friday_date date,
  saturday_date date,
  sunday_date date,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weekend_schedule ENABLE ROW LEVEL SECURITY;

-- Anyone can read the active schedule (app is public-facing)
CREATE POLICY "Public can read active schedule"
  ON weekend_schedule FOR SELECT
  TO anon
  USING (is_active = true);

-- Authenticated users (admins) can read all schedules
CREATE POLICY "Admins can read all schedules"
  ON weekend_schedule FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert new schedules
CREATE POLICY "Admins can insert schedules"
  ON weekend_schedule FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update schedules
CREATE POLICY "Admins can update schedules"
  ON weekend_schedule FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
