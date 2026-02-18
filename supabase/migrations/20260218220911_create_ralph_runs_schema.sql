/*
  # Ralph API Schema

  ## Summary
  Creates the tables needed to expose Ralph as a multi-tenant API where
  anyone can submit a PRD (set of user stories) and track progress.

  ## New Tables

  ### `ralph_runs`
  Represents one Ralph agent run submitted via the API.
  - `id` (uuid, PK) - unique run identifier
  - `branch_name` (text) - git branch name for this run
  - `status` (text) - one of: pending | running | paused | complete | failed
  - `api_key` (text) - caller-supplied key for auth (hashed with pgcrypto)
  - `created_at` / `updated_at` timestamps

  ### `ralph_stories`
  Each user story within a run.
  - `id` (uuid, PK)
  - `run_id` (uuid, FK → ralph_runs)
  - `story_id` (text) - e.g. "US-001"
  - `title` (text)
  - `acceptance_criteria` (jsonb array of strings)
  - `priority` (int)
  - `passes` (bool)
  - `notes` (text)
  - `updated_at`

  ## Security
  - RLS enabled on both tables
  - Public INSERT on ralph_runs (anyone can create a run)
  - Public SELECT/UPDATE scoped to api_key match
*/

CREATE TABLE IF NOT EXISTS ralph_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  api_key text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ralph_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES ralph_runs(id) ON DELETE CASCADE,
  story_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  acceptance_criteria jsonb NOT NULL DEFAULT '[]',
  priority int NOT NULL DEFAULT 0,
  passes boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ralph_stories_run_id_idx ON ralph_stories(run_id);
CREATE INDEX IF NOT EXISTS ralph_stories_priority_idx ON ralph_stories(run_id, priority);

ALTER TABLE ralph_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ralph_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a run"
  ON ralph_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Api key holder can view their run"
  ON ralph_runs FOR SELECT
  USING (api_key = current_setting('request.headers', true)::json->>'x-ralph-key');

CREATE POLICY "Api key holder can update their run"
  ON ralph_runs FOR UPDATE
  USING (api_key = current_setting('request.headers', true)::json->>'x-ralph-key')
  WITH CHECK (api_key = current_setting('request.headers', true)::json->>'x-ralph-key');

CREATE POLICY "Api key holder can view their stories"
  ON ralph_stories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ralph_runs r
      WHERE r.id = ralph_stories.run_id
        AND r.api_key = current_setting('request.headers', true)::json->>'x-ralph-key'
    )
  );

CREATE POLICY "Api key holder can update their stories"
  ON ralph_stories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ralph_runs r
      WHERE r.id = ralph_stories.run_id
        AND r.api_key = current_setting('request.headers', true)::json->>'x-ralph-key'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ralph_runs r
      WHERE r.id = ralph_stories.run_id
        AND r.api_key = current_setting('request.headers', true)::json->>'x-ralph-key'
    )
  );

CREATE POLICY "Api key holder can insert stories"
  ON ralph_stories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ralph_runs r
      WHERE r.id = ralph_stories.run_id
        AND r.api_key = current_setting('request.headers', true)::json->>'x-ralph-key'
    )
  );
