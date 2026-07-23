-- ============================================================================
-- TELIVIO — MIGRATION 003
-- Adds a per-organization, owner-configurable AI score threshold that
-- decides interview vs. rejection. Previously this was hardcoded to 75
-- in application code and the Settings page slider did nothing.
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS interview_threshold INTEGER NOT NULL DEFAULT 75
  CHECK (interview_threshold >= 0 AND interview_threshold <= 100);
