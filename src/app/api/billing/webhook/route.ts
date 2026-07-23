import { Webhooks } from '@polar-sh/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { getPlanFromPolarProductId } from '@/lib/polar'

/**
 * Polar webhooks are the SOURCE OF TRUTH for subscription state — never
 * trust the client (e.g. a "checkout succeeded" redirect) for this. Every
 * handler below reads `metadata.organizationId` (set when we created the
 * checkout in /api/billing/checkout) to resolve which of OUR organizations
 * the event is about, since Polar itself has no organization concept.
 */
export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionCreated: async (payload) => {
    await syncSubscription(payload.data)
  },

  onSubscriptionActive: async (payload) => {
    await syncSubscription(payload.data)
  },

  onSubscriptionUpdated: async (payload) => {
    await syncSubscription(payload.data)
  },

  onSubscriptionCanceled: async (payload) => {
    await syncSubscription(payload.data)
  },

  onSubscriptionRevoked: async (payload) => {
    // Access actually ends now (vs. "canceled" which may still be active
    // until the end of the current billing period).
    const orgId = (payload.data.metadata as Record<string, string> | undefined)?.organizationId
    if (!orgId) return

    const supabase = createAdminClient()
    await supabase
      .from('organizations')
      .update({ plan_status: 'canceled' })
      .eq('id', orgId)
  },
})

async function syncSubscription(subscription: {
  id: string
  status: string
  customerId: string
  productId: string
  metadata?: Record<string, unknown>
}) {
  const organizationId = subscription.metadata?.organizationId as string | undefined
  if (!organizationId) {
    console.warn('Polar subscription event missing organizationId in metadata:', subscription.id)
    return
  }

  const plan = getPlanFromPolarProductId(subscription.productId)
  if (!plan) {
    console.warn('Polar subscription references an unknown product:', subscription.productId)
    return
  }

  // Map Polar's subscription status vocabulary onto ours. Polar uses
  // 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete' —
  // we only distinguish the ones that change what a user can do in the app.
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    unpaid: 'past_due',
    canceled: 'canceled',
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
  }
  const planStatus = statusMap[subscription.status] ?? 'past_due'

  const supabase = createAdminClient()
  await supabase
    .from('organizations')
    .update({
      plan,
      plan_status: planStatus,
      polar_customer_id: subscription.customerId,
      polar_subscription_id: subscription.id,
    })
    .eq('id', organizationId)
}
