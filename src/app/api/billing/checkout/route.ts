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
      externalCustomerId: org.polar_customer_id ? undefined : ctx.organizationId,
      // Polar substitutes {CHECKOUT_ID} with the real checkout session ID at
      // redirect time — the new success page uses this to verify payment and
      // update the database directly, without depending on webhooks.
      successUrl: `${origin}/dashboard/billing/success?checkout_id={CHECKOUT_ID}`,
      metadata: {
        organizationId: ctx.organizationId,
        plan: requestedPlan,
      },
    })

    return NextResponse.redirect(checkout.url)
  } catch (err: unknown) {
    console.error('Polar checkout creation failed:', err)

    // Surface the real reason instead of a generic code — "checkout_failed"
    // used to mean literally anything (missing env var, wrong Polar
    // environment, invalid product ID, network error), which made this
    // undiagnosable from the UI alone. Truncate/sanitize since this goes
    // into a URL query param.
    const message = err instanceof Error ? err.message : 'Unknown error creating checkout'
    const safeMessage = encodeURIComponent(message.slice(0, 200))

    return NextResponse.redirect(
      new URL(`/dashboard/billing?error=checkout_failed&detail=${safeMessage}`, request.url)
    )
  }
}
