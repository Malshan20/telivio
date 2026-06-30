import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'
import { polar, getPolarProductId } from '@/lib/polar'
import { PLANS, type PlanId } from '@/lib/plans'

/**
 * GET /api/billing/checkout?plan=growth
 *
 * Redirects the current user into a Polar-hosted checkout for the
 * requested plan. `metadata.organizationId` is the load-bearing piece here
 * — Polar has no native per-organization customer concept, so this is how
 * the webhook (see /api/billing/webhook) knows which of OUR organizations
 * just subscribed, regardless of which person on that org's team checked out.
 */
export async function GET(request: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Only the workspace owner can change billing — keeps "who can spend the
  // company's money" unambiguous, same rule as renaming the org.
  if (ctx.role !== 'owner') {
    return NextResponse.redirect(
      new URL('/dashboard/billing?error=insufficient_permissions', request.url)
    )
  }

  const { searchParams, origin } = new URL(request.url)
  const requestedPlan = searchParams.get('plan') as PlanId | null

  if (!requestedPlan || !(requestedPlan in PLANS)) {
    return NextResponse.redirect(new URL('/dashboard/billing?error=invalid_plan', request.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, polar_customer_id')
    .eq('id', ctx.organizationId)
    .single()

  if (!org) {
    return NextResponse.redirect(new URL('/dashboard/billing?error=org_not_found', request.url))
  }

  try {
    const checkout = await polar.checkouts.create({
      products: [getPolarProductId(requestedPlan)],
      customerEmail: user?.email,
      // Reuse the existing Polar customer if this org has billed before,
      // so Polar doesn't create a duplicate customer record on a plan change.
      customerTaxId: org.polar_customer_id ? undefined : ctx.organizationId,
      successUrl: `${origin}/dashboard/billing?checkout_success=true`,
      metadata: {
        organizationId: ctx.organizationId,
        plan: requestedPlan,
      },
    })

    return NextResponse.redirect(checkout.url)
  } catch (err: unknown) {
    console.error('Polar checkout creation failed:', err)
    return NextResponse.redirect(new URL('/dashboard/billing?error=checkout_failed', request.url))
  }
}
