import { NextResponse } from 'next/server'
import { getOrgBillingContext } from '@/lib/org-context'
import { getCurrentUsage } from '@/lib/usage'
import { getPlan, trialDaysRemaining } from '@/lib/plans'

/**
 * Powers /dashboard/billing — current plan, trial countdown, and this
 * month's usage against the plan's limits. Separate from
 * /api/billing/plan-status (which client components poll for feature
 * gating) since this one does two extra queries that most pages don't need.
 */
export async function GET() {
  const ctx = await getOrgBillingContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const usage = await getCurrentUsage(ctx.organizationId)
  const plan = getPlan(ctx.plan)

  return NextResponse.json({
    plan: ctx.plan,
    planName: plan.name,
    planStatus: ctx.planStatus,
    hasAccess: ctx.hasAccess,
    trialDaysRemaining: ctx.planStatus === 'trialing' ? trialDaysRemaining(ctx.trialEndsAt) : 0,
    trialEndsAt: ctx.trialEndsAt,
    role: ctx.role,
    usage: {
      activeJobs: usage.activeJobs,
      maxActiveJobs: plan.maxActiveJobs,
      screeningsUsed: usage.screeningsUsed,
      maxScreeningsPerMonth: plan.maxScreeningsPerMonth,
    },
  })
}
