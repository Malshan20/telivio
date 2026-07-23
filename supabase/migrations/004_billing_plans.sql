-- ============================================================================
-- TELIVIO — MIGRATION 004 — Billing, Plans, and Plan-Gated Features
-- ============================================================================
-- Run this AFTER migrations 001-003. Adds:
--   1. Plan/billing fields on organizations (Polar customer/subscription IDs,
--      trial tracking, plan tier)
--   2. usage_counters — monthly resume-screening counts (the one limit that's
--      an event count, not a current-state count; active job counts are
--      just COUNT(*) live queries and need no counter table)
--   3. Agency multi-workspace support (parent_organization_id self-reference)
--   4. White-label fields (display name + accent color shown on /apply and emails)
--   5. Email template overrides (subject/intro text per org, Growth+ feature)
-- ============================================================================

-- ─── Plan + billing fields on organizations ─────────────────────────────────
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter'
  CHECK (plan IN ('starter', 'growth', 'agency'));

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'trialing'
  CHECK (plan_status IN ('trialing', 'active', 'past_due', 'canceled', 'trial_expired'));

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- ─── Agency: multiple client workspaces ─────────────────────────────────────
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS parent_organization_id UUID
  REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON public.organizations(parent_organization_id);

-- ─── White-label fields ─────────────────────────────────────────────────────
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS white_label_display_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS white_label_accent_color TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS white_label_logo_url TEXT;

-- ─── Email template overrides (Growth+) ─────────────────────────────────────
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS email_template_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── Usage counters — resume screenings per calendar month ─────────────────
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  resumes_screened_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, period_start)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view their own usage" ON public.usage_counters;
CREATE POLICY "Org members can view their own usage" ON public.usage_counters
  FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE INDEX IF NOT EXISTS idx_usage_counters_org_period ON public.usage_counters(organization_id, period_start);

DROP TRIGGER IF EXISTS usage_counters_updated_at ON public.usage_counters;
CREATE TRIGGER usage_counters_updated_at BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── Organization memberships (for Agency workspace switching) ────────────
CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_memberships;
CREATE POLICY "Users can view their own memberships" ON public.organization_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON public.organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON public.organization_memberships(organization_id);
