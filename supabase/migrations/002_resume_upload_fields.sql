-- ============================================================================
-- TELIVIO — MIGRATION 002
-- Run this AFTER your original schema.sql. It only adds what's new:
--   1. New candidate application fields (location, salary, etc.)
--   2. The "resumes" storage bucket + access policies for file uploads
--
-- Safe to run even if some pieces already exist — every statement below
-- uses IF NOT EXISTS / ON CONFLICT DO NOTHING / DROP POLICY IF EXISTS so
-- re-running this script by accident won't error out or duplicate anything.
-- ============================================================================

-- ─── New candidate fields ───────────────────────────────────────────────────
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS salary_expectation TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS years_experience TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS earliest_start_date DATE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS work_authorization TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS cover_note TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS resume_filename TEXT;

-- ─── Storage bucket for resume uploads ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Drop-then-create so this is safe to re-run.
DROP POLICY IF EXISTS "Anyone can upload a resume" ON storage.objects;
DROP POLICY IF EXISTS "Org members can read their own org's resumes" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete their own org's resumes" ON storage.objects;

-- Anyone (including unauthenticated public applicants) can upload a resume.
-- This is what the public /apply/[jobId] page needs — the applicant has no
-- auth session, so this can't be scoped to an organization at upload time.
-- The API route is responsible for placing the file under the correct
-- org's folder path before the candidate row is ever created.
CREATE POLICY "Anyone can upload a resume"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes');

-- HR users can only read resumes under their own organization's folder
-- prefix. storage.foldername(name) splits the object path by '/', so
-- foldername[1] is the organization_id segment (resumes/{org_id}/{job_id}/{file}).
CREATE POLICY "Org members can read their own org's resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = public.current_user_org_id()::text
  );

CREATE POLICY "Org members can delete their own org's resumes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = public.current_user_org_id()::text
  );
