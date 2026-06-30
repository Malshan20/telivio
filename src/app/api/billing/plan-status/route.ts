import { NextResponse } from 'next/server'
import { getOrgBillingContext } from '@/lib/org-context'
import { getPlan, trialDaysRemaining } from '@/lib/plans'

/**
 * Used by client components that need to know "can this org use feature X"
 * without doing a full server-side fetch — e.g. showing/hiding the Notes
 * panel, the Analytics nav item, or an upgrade prompt at the point of use.
 */
export async function GET() {
  const ctx = await getOrgBillingContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = getPlan(ctx.plan)

  return NextResponse.json({
    plan: ctx.plan,
    planStatus: ctx.planStatus,
    hasAccess: ctx.hasAccess,
    role: ctx.role,
    trialDaysRemaining: ctx.planStatus === 'trialing' ? trialDaysRemaining(ctx.trialEndsAt) : 0,
    features: plan.features,
    limits: {
      maxActiveJobs: plan.maxActiveJobs,
      maxScreeningsPerMonth: plan.maxScreeningsPerMonth,
    },
  })
}
