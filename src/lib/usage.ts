import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getPlan, type PlanId } from '@/lib/plans'

function currentPeriodStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

/**
 * Checks whether an organization can create another active job posting,
 * given its plan's maxActiveJobs limit. Active jobs are current STATE, not
 * an accumulating event — so this is a live COUNT(*) rather than a stored
 * counter (a closed/paused job frees up the slot immediately, which is the
 * behavior you want).
 */
export async function canCreateActiveJob(
  organizationId: string,
  plan: PlanId
): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const limit = getPlan(plan).maxActiveJobs
  if (limit === null) return { allowed: true, current: 0, limit: null }

  const supabase = await createClient()
  const { count } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  const current = count ?? 0
  return { allowed: current < limit, current, limit }
}

/**
 * Checks whether an organization has screening capacity left this calendar
 * month. Unlike active jobs, screenings are an EVENT — once counted, a
 * screening counts against that month even if the candidate is later
 * deleted, which is why this is a separate monotonic counter table
 * (usage_counters) rather than a live COUNT(*) over candidates.
 */
export async function canScreenResume(
  organizationId: string,
  plan: PlanId
): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const limit = getPlan(plan).maxScreeningsPerMonth
  if (limit === null) return { allowed: true, current: 0, limit: null }

  const admin = createAdminClient()
  const { data } = await admin
    .from('usage_counters')
    .select('resumes_screened_count')
    .eq('organization_id', organizationId)
    .eq('period_start', currentPeriodStart())
    .single()

  const current = data?.resumes_screened_count ?? 0
  return { allowed: current < limit, current, limit }
}

/**
 * Increments this month's screening counter for an organization. Called
 * once per candidate actually scored — NOT per application, so a candidate
 * who's re-scored manually (e.g. "Re-run AI Scoring" in the dashboard)
 * does count again, since that's a real additional Groq API call, same
 * cost to us as a fresh screening.
 */
export async function incrementScreeningCount(organizationId: string): Promise<void> {
  const admin = createAdminClient()
  const period = currentPeriodStart()

  const { data: existing } = await admin
    .from('usage_counters')
    .select('id, resumes_screened_count')
    .eq('organization_id', organizationId)
    .eq('period_start', period)
    .single()

  if (existing) {
    await admin
      .from('usage_counters')
      .update({ resumes_screened_count: existing.resumes_screened_count + 1 })
      .eq('id', existing.id)
  } else {
    await admin
      .from('usage_counters')
      .insert({ organization_id: organizationId, period_start: period, resumes_screened_count: 1 })
  }
}

/** Current month's usage, for display on the billing/usage dashboard. */
export async function getCurrentUsage(organizationId: string): Promise<{
  screeningsUsed: number
  activeJobs: number
}> {
  const supabase = await createClient()

  const [usageRes, jobsRes] = await Promise.all([
    supabase
      .from('usage_counters')
      .select('resumes_screened_count')
      .eq('organization_id', organizationId)
      .eq('period_start', currentPeriodStart())
      .single(),
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
  ])

  return {
    screeningsUsed: usageRes.data?.resumes_screened_count ?? 0,
    activeJobs: jobsRes.count ?? 0,
  }
}
