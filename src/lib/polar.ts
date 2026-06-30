import { Polar } from '@polar-sh/sdk'

/**
 * Polar.sh is the merchant of record for Telivio's subscriptions — it
 * handles card processing, tax, and compliance, and we mirror its webhook
 * events into our own `organizations` table as the source of truth for
 * what each organization can access in the app.
 *
 * IMPORTANT — Polar has no native "organization" customer concept; it is
 * user-centric (one Polar Customer per person, not per company). Since
 * Telivio's billing unit is the ORGANIZATION, we map each org to the Polar
 * Customer created for its `owner` user, and carry `organizationId` through
 * every checkout via `metadata` so the webhook can resolve it back to the
 * right org. See /api/billing/checkout and /api/billing/webhook.
 */
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
})

/** Maps our internal plan IDs to the Product IDs created in the Polar dashboard. */
export function getPolarProductId(plan: 'starter' | 'growth' | 'agency'): string {
  const map: Record<string, string | undefined> = {
    starter: process.env.POLAR_PRODUCT_STARTER,
    growth: process.env.POLAR_PRODUCT_GROWTH,
    agency: process.env.POLAR_PRODUCT_AGENCY,
  }
  const id = map[plan]
  if (!id) {
    throw new Error(
      `Missing Polar product ID for plan "${plan}" — set POLAR_PRODUCT_${plan.toUpperCase()} in your environment`
    )
  }
  return id
}

/** Reverse lookup: given a Polar product ID from a webhook, which plan is it? */
export function getPlanFromPolarProductId(productId: string): 'starter' | 'growth' | 'agency' | null {
  if (productId === process.env.POLAR_PRODUCT_STARTER) return 'starter'
  if (productId === process.env.POLAR_PRODUCT_GROWTH) return 'growth'
  if (productId === process.env.POLAR_PRODUCT_AGENCY) return 'agency'
  return null
}
