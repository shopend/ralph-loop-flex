/*
  # Add run configuration columns to ralph_runs

  ## Summary
  Adds rich configuration fields to every Ralph run so callers can specify:
  - A system prompt that is passed to the agent on each iteration
  - Which LLM model to use (e.g. claude-opus-4-5, gpt-4o, etc.)
  - A high-level goal / mission statement for the run
  - A continuous generation pattern: "edit_existing" or "generate_new"
  - Story ordering: array of story IDs representing the execution order

  ## Changes
  ### Modified: `ralph_runs`
  - `system_prompt` (text) - the system/instruction prompt injected per iteration
  - `model` (text) - LLM model identifier chosen by the user
  - `goal` (text) - high-level objective text for the run
  - `generation_pattern` (text) - "edit_existing" | "generate_new", default "edit_existing"
  - `story_order` (jsonb) - ordered array of story IDs, empty = use priority field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ralph_runs' AND column_name = 'system_prompt'
  ) THEN
    ALTER TABLE ralph_runs ADD COLUMN system_prompt text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ralph_runs' AND column_name = 'model'
  ) THEN
    ALTER TABLE ralph_runs ADD COLUMN model text NOT NULL DEFAULT 'claude-opus-4-5';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ralph_runs' AND column_name = 'goal'
  ) THEN
    ALTER TABLE ralph_runs ADD COLUMN goal text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ralph_runs' AND column_name = 'generation_pattern'
  ) THEN
    ALTER TABLE ralph_runs ADD COLUMN generation_pattern text NOT NULL DEFAULT 'edit_existing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ralph_runs' AND column_name = 'story_order'
  ) THEN
    ALTER TABLE ralph_runs ADD COLUMN story_order jsonb NOT NULL DEFAULT '[]';
  END IF;
END $$;
