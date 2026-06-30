-- ============================================================================
-- TELIVIO — MULTI-TENANT SCHEMA
-- Every company (Company A, Company B, ...) is an "organization".
-- All HR data (jobs, candidates, interviews, notes, cal connections) is
-- scoped to an organization_id, and RLS enforces that a user can only ever
-- see rows belonging to their own organization.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ORGANIZATIONS ──────────────────────────────────────────────────────────
-- One row per customer company (Company A, Company B, etc).
CREATE TABLE public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  interview_threshold INTEGER NOT NULL DEFAULT 75 CHECK (interview_threshold >= 0 AND interview_threshold <= 100),

  -- Billing (Polar.sh) — see lib/polar.ts and /api/billing/*
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'agency')),
  plan_status TEXT NOT NULL DEFAULT 'trialing' CHECK (plan_status IN ('trialing', 'active', 'past_due', 'canceled', 'trial_expired')),
  trial_ends_at TIMESTAMPTZ,
  polar_customer_id TEXT,
  polar_subscription_id TEXT,

  -- Agency: multiple client workspaces (a child org points back at its agency)
  parent_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,

  -- White-label (Agency plan)
  white_label_enabled BOOLEAN NOT NULL DEFAULT false,
  white_label_display_name TEXT,
  white_label_accent_color TEXT,
  white_label_logo_url TEXT,

  -- Custom email templates (Growth+) — subject/intro overrides only
  email_template_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_parent_id ON public.organizations(parent_organization_id);

-- ─── USERS ──────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users. Every HR user belongs to exactly one organization.
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'hr' CHECK (role IN ('hr', 'admin', 'owner')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── JOBS ───────────────────────────────────────────────────────────────────
CREATE TABLE public.jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT DEFAULT 'full-time',
  salary_range TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CANDIDATES ─────────────────────────────────────────────────────────────
-- organization_id is denormalized here (instead of joining through jobs)
-- so RLS policies stay simple and fast, and so deleting/orphaning a job
-- can never accidentally leak a candidate row across tenants.
CREATE TABLE public.candidates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  salary_expectation TEXT,
  years_experience TEXT,
  earliest_start_date DATE,
  work_authorization TEXT,
  cover_note TEXT,
  resume_url TEXT,
  resume_filename TEXT,
  resume_text TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  reasoning TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'screened', 'interview', 'offer', 'rejected')),
  linkedin_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INTERVIEWS ─────────────────────────────────────────────────────────────
CREATE TABLE public.interviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  cal_event_id TEXT,
  cal_booking_uid TEXT,
  scheduling_link TEXT,
  scheduled_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'rescheduled')),
  interview_type TEXT DEFAULT 'video' CHECK (interview_type IN ('video', 'phone', 'in-person')),
  meeting_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTES ──────────────────────────────────────────────────────────────────
CREATE TABLE public.notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMAIL LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE public.email_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('interview_invite', 'rejection', 'offer', 'followup')),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_id TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CAL.COM CONNECTIONS (OAuth) ────────────────────────────────────────────
-- One row per organization. Stores that organization's own Cal.com OAuth
-- tokens, so interviews booked through Telivio land on THEIR calendar —
-- not Telivio's, and not any other customer's.
CREATE TABLE public.cal_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cal_user_id TEXT,
  cal_username TEXT,
  default_event_type_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  connected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USAGE COUNTERS ─────────────────────────────────────────────────────────
-- Monthly resume-screening counts. Active job count is enforced with a live
-- COUNT(*) query elsewhere (current state, not cumulative) and needs no
-- counter table — screenings are an EVENT, so they're tracked here per
-- calendar month, scoped to organization_id.
CREATE TABLE public.usage_counters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  resumes_screened_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, period_start)
);

-- ─── ORGANIZATION MEMBERSHIPS ───────────────────────────────────────────────
-- A user's PRIMARY workspace is still public.users.organization_id. This
-- table additionally grants an agency's users access to switch into
-- specific child workspaces (see organizations.parent_organization_id)
-- without changing their primary organization_id.
CREATE TABLE public.organization_memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, organization_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY — tenant isolation
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- Helper: look up the calling user's organization_id once, reused everywhere.
-- SECURITY DEFINER + STABLE so it's fast and bypasses RLS on `users` internally
-- (otherwise this would recurse into the users RLS policy and loop).
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── Organizations ──────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own organization" ON public.organizations
  FOR SELECT USING (id = public.current_user_org_id());

CREATE POLICY "Owners can update their own organization" ON public.organizations
  FOR UPDATE USING (
    id = public.current_user_org_id()
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view profiles within their organization" ON public.users
  FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ─── Jobs — scoped to organization ──────────────────────────────────────────
CREATE POLICY "Org members can view their jobs" ON public.jobs
  FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY "Org members can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY "Org members can update their jobs" ON public.jobs
  FOR UPDATE USING (organization_id = public.current_user_org_id());

CREATE POLICY "Org members can delete their jobs" ON public.jobs
  FOR DELETE USING (organization_id = public.current_user_org_id());

-- Public job postings (for the public /apply/[jobId] page) — status must be
-- 'active'. This intentionally bypasses the org check for SELECT only, via
-- a separate policy scoped to anonymous/public read of active jobs.
CREATE POLICY "Anyone can view active job postings" ON public.jobs
  FOR SELECT USING (status = 'active');

-- ─── Candidates — scoped to organization ────────────────────────────────────
CREATE POLICY "Org members can view their candidates" ON public.candidates
  FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY "Org members can update their candidates" ON public.candidates
  FOR UPDATE USING (organization_id = public.current_user_org_id());

CREATE POLICY "Org members can delete their candidates" ON public.candidates
  FOR DELETE USING (organization_id = public.current_user_org_id());

-- Candidate applications come from the public apply page (no auth). The
-- API route inserts via the service-role/admin client, which bypasses RLS
-- entirely, so no public INSERT policy is needed or granted here.

-- ─── Interviews — scoped to organization ────────────────────────────────────
CREATE POLICY "Org members can manage their interviews" ON public.interviews
  FOR ALL USING (organization_id = public.current_user_org_id());

-- ─── Notes — scoped to organization ─────────────────────────────────────────
CREATE POLICY "Org members can manage their notes" ON public.notes
  FOR ALL USING (organization_id = public.current_user_org_id());

-- ─── Email logs — scoped to organization ────────────────────────────────────
CREATE POLICY "Org members can view their email logs" ON public.email_logs
  FOR SELECT USING (organization_id = public.current_user_org_id());

-- Inserts happen via the service-role/admin client from server-side agent
-- code, which bypasses RLS — no public INSERT policy needed.

-- ─── Cal.com connections — scoped to organization, never cross-readable ────
CREATE POLICY "Org members can view their own cal connection" ON public.cal_connections
  FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY "Org members can manage their own cal connection" ON public.cal_connections
  FOR ALL USING (organization_id = public.current_user_org_id());

-- ─── Usage counters — read-only for org members ─────────────────────────────
CREATE POLICY "Org members can view their own usage" ON public.usage_counters
  FOR SELECT USING (organization_id = public.current_user_org_id());

-- Increments happen via the admin/service-role client from agent.ts, so no
-- public INSERT/UPDATE policy is needed or granted here.

-- ─── Organization memberships — a user can see their own membership rows ──
CREATE POLICY "Users can view their own memberships" ON public.organization_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Membership management (granting/revoking access to a child workspace) is
-- done via the admin/service-role client from an API route that first
-- confirms the caller owns the parent agency org — see /api/agency/workspaces.

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_jobs_organization_id ON public.jobs(organization_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_created_by ON public.jobs(created_by);
CREATE INDEX idx_candidates_organization_id ON public.candidates(organization_id);
CREATE INDEX idx_candidates_job_id ON public.candidates(job_id);
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_score ON public.candidates(score);
CREATE INDEX idx_interviews_organization_id ON public.interviews(organization_id);
CREATE INDEX idx_interviews_candidate_id ON public.interviews(candidate_id);
CREATE INDEX idx_notes_organization_id ON public.notes(organization_id);
CREATE INDEX idx_notes_candidate_id ON public.notes(candidate_id);
CREATE INDEX idx_cal_connections_organization_id ON public.cal_connections(organization_id);
CREATE INDEX idx_usage_counters_org_period ON public.usage_counters(organization_id, period_start);
CREATE INDEX idx_org_memberships_user_id ON public.organization_memberships(user_id);
CREATE INDEX idx_org_memberships_org_id ON public.organization_memberships(organization_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- NOTE: Unlike a single-tenant app, we do NOT auto-create a `public.users`
-- row purely from auth.users on signup, because we don't yet know which
-- organization the person belongs to (new company vs. joining an existing
-- one). That decision happens in application code right after signup —
-- see the /api/auth/organization route — which inserts into public.users
-- with the resolved organization_id. If you want a zero-org placeholder
-- row instead, you can reintroduce a trigger here.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER interviews_updated_at BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER cal_connections_updated_at BEFORE UPDATE ON public.cal_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER usage_counters_updated_at BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- STORAGE — resume uploads
-- ============================================================================
-- Bucket layout: resumes/{organization_id}/{job_id}/{uuid}-{filename}
-- Keeping organization_id as the first path segment is what makes the read
-- policy below able to scope access without a second table lookup.

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone (including unauthenticated public applicants) can upload a resume —
-- this is what the public /apply/[jobId] page needs. We don't gate this on
-- organization_id at upload time because the applicant isn't authenticated
-- and doesn't have an organization context; the API route is responsible
-- for putting the file under the correct org's folder path before the
-- candidate row is ever created.
CREATE POLICY "Anyone can upload a resume"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes');

-- HR users can only read resumes that live under their own organization's
-- folder prefix. storage.foldername(name) splits the object path by '/',
-- so foldername[1] is the organization_id segment.
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

