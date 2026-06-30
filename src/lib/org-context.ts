import { createClient } from '@/lib/supabase/server'
import { type PlanId, type PlanStatus, hasActiveAccess } from '@/lib/plans'

export interface OrgContext {
  userId: string
  organizationId: string
  role: 'hr' | 'admin' | 'owner'
}

export interface OrgBillingContext extends OrgContext {
  plan: PlanId
  planStatus: PlanStatus
  trialEndsAt: string | null
  hasAccess: boolean
}

/**
 * Resolves the current request's authenticated user and their
 * organization_id. Every multi-tenant API route should call this first —
 * it's the single place that "Unauthorized" / "no organization" checks live,
 * so we don't repeat (and risk drifting) that logic across every route file.
 *
 * Returns `null` if there's no authenticated user or they have no
 * organization yet (e.g. mid-onboarding).
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return null

  return {
    userId: user.id,
    organizationId: profile.organization_id,
    role: profile.role,
  }
}

/**
 * Like getOrgContext(), but also resolves plan/billing state — for routes
 * that need to enforce plan limits or feature gates (job creation, resume
 * screening, notes, analytics, etc). Kept separate from getOrgContext() so
 * routes that don't care about billing don't pay for the extra join.
 */
export async function getOrgBillingContext(): Promise<OrgBillingContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role, organization:organizations(plan, plan_status, trial_ends_at)')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return null

  const org = profile.organization as unknown as { plan: PlanId; plan_status: PlanStatus; trial_ends_at: string | null } | null
  if (!org) return null

  return {
    userId: user.id,
    organizationId: profile.organization_id,
    role: profile.role,
    plan: org.plan,
    planStatus: org.plan_status,
    trialEndsAt: org.trial_ends_at,
    hasAccess: hasActiveAccess({ plan: org.plan, plan_status: org.plan_status, trial_ends_at: org.trial_ends_at }),
  }
}
