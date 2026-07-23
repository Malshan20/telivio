import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'
import { polar } from '@/lib/polar'

/**
 * GET /api/billing/portal
 *
 * Polar does not expose a cancel/restore subscription API — subscription
 * management (canceling, updating payment method, viewing invoices) only
 * happens through Polar's own hosted Customer Portal. This route just
 * resolves the org's Polar customer ID and redirects there.
 */
export async function GET(request: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (ctx.role !== 'owner') {
    return NextResponse.redirect(
      new URL('/dashboard/billing?error=insufficient_permissions', request.url)
    )
  }

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('polar_customer_id')
    .eq('id', ctx.organizationId)
    .single()

  if (!org?.polar_customer_id) {
    return NextResponse.redirect(
      new URL('/dashboard/billing?error=no_subscription_yet', request.url)
    )
  }

  try {
    const session = await polar.customerSessions.create({
      customerId: org.polar_customer_id,
    })
    return NextResponse.redirect(session.customerPortalUrl)
  } catch (err: unknown) {
    console.error('Polar customer portal session failed:', err)
    return NextResponse.redirect(new URL('/dashboard/billing?error=portal_failed', request.url))
  }
}
