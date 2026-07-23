import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'
import { polar } from '@/lib/polar'
import { PLANS, type PlanId } from '@/lib/plans'

/**
 * Verifies a completed Polar checkout directly (no webhook dependency) and
 * updates the organization's plan/status immediately. This is what the new
 * /dashboard/billing/success page calls right after Polar redirects back.
 *
 * IMPORTANT — Polar's own docs explicitly say: "Don't rely solely on the
 * success redirect. Always use webhooks for order fulfillment," because a
 * user closing the tab right after paying (before this page finishes
 * loading) would never trigger this route, and the org would silently stay
 * un-upgraded. This route intentionally does NOT replace webhooks — the
 * existing /api/billing/webhook route is untouched and still the durable
 * source of truth if this direct path is ever missed. This route exists so
 * the *normal* case (staying on the page) updates instantly rather than
 * waiting on webhook delivery.
 *
 * Security: a checkout_id alone isn't proof of ownership, so we verify the
 * checkout's own metadata.organizationId matches the CALLER's session
 * organization before touching the database — otherwise anyone who guessed
 * or intercepted another org's checkout_id could activate a plan for
 * themselves using someone else's completed payment.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { checkoutId } = await request.json()
    if (!checkoutId) {
      return NextResponse.json({ error: 'checkoutId is required' }, { status: 400 })
    }

    let checkout: any
    try {
      checkout = await polar.checkouts.get({ id: checkoutId })
    } catch (err: unknown) {
      console.error('Failed to fetch checkout from Polar:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to fetch checkout from Polar' },
        { status: 502 }
      )
    }

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    // Defensive field extraction — the SDK's exact casing for nested/derived
    // fields isn't something we can verify against a live account here, so
    // we check both camelCase and snake_case variants rather than assume one.
    const metadata = checkout.metadata ?? {}
    const checkoutOrgId: string | undefined = metadata.organizationId
    const checkoutPlan: string | undefined = metadata.plan
    const customerId: string | null = checkout.customerId ?? checkout.customer_id ?? null
    const subscriptionId: string | null =
      checkout.subscription?.id ?? checkout.subscriptionId ?? checkout.subscription_id ?? null

    if (!checkoutOrgId) {
      return NextResponse.json(
        { error: 'This checkout has no organization reference — it may have been created outside Telivio\'s own checkout flow.' },
        { status: 400 }
      )
    }

    // Ownership check — never let a caller activate a plan using a checkout
    // that belongs to a different organization.
    if (checkoutOrgId !== ctx.organizationId) {
      return NextResponse.json({ error: 'This checkout does not belong to your organization' }, { status: 403 })
    }

    if (checkout.status === 'failed' || checkout.status === 'expired') {
      return NextResponse.json({ status: checkout.status, message: 'Payment was not completed.' })
    }

    if (checkout.status === 'open') {
      return NextResponse.json({ status: 'pending', message: 'Waiting for payment to be submitted.' })
    }

    // Per Polar's own API reference: "confirmed" means the customer clicked
    // Pay — it is explicitly NOT proof the payment succeeded. Only
    // "succeeded" is the definitive success signal. Anything short of that
    // is reported back as still-processing so the success page can poll
    // again rather than activate a plan on an unconfirmed charge.
    if (checkout.status !== 'succeeded') {
      return NextResponse.json({ status: 'processing', message: 'Payment is being confirmed — this can take a few seconds.' })
    }

    if (!checkoutPlan || !(checkoutPlan in PLANS)) {
      return NextResponse.json({ error: 'Could not determine which plan this checkout was for' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: updated, error } = await supabase
      .from('organizations')
      .update({
        plan: checkoutPlan as PlanId,
        plan_status: 'active',
        polar_customer_id: customerId,
        polar_subscription_id: subscriptionId,
      })
      .eq('id', ctx.organizationId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ status: 'succeeded', organization: updated })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to verify checkout' },
      { status: 500 }
    )
  }
}
