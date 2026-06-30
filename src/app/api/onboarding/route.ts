import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TRIAL_DAYS, PLANS, type PlanId } from '@/lib/plans'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Called once, right after a brand-new HR user signs up and confirms their
 * email. Creates their company's organization row and links their
 * public.users profile to it. This is the multi-tenant equivalent of the
 * old "auto-create user row" trigger — we can't do that automatically
 * anymore because we don't know the organization until the person tells us.
 *
 * Uses the ADMIN client deliberately: a brand-new user has no
 * organization_id yet, so current_user_org_id() resolves to NULL and the
 * normal RLS policies on `organizations` (scoped to "your own org") would
 * block both the slug-uniqueness check and the insert itself. This route
 * is the one deliberate, narrow exception — it only ever creates a new org
 * for the calling user and immediately attaches them to it as owner.
 *
 * NOTE: This is a simple "create new org" flow only. If you later want
 * teammates to join an *existing* organization (Company A's second HR
 * hire), add an invite-token flow here instead of always creating new orgs.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // If this user already has a profile + organization, don't let them
    // create a second one by replaying this endpoint.
    const { data: existingProfile } = await admin
      .from('users')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.organization_id) {
      return NextResponse.json({ error: 'Organization already set up' }, { status: 409 })
    }

    const body = await request.json()
    const { companyName, fullName, plan } = body

    if (!companyName || companyName.trim().length < 2) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const chosenPlan: PlanId = plan && plan in PLANS ? plan : 'starter'

    const baseSlug = slugify(companyName)
    let slug = baseSlug
    let attempt = 0

    // Ensure slug uniqueness — append a short suffix on collision.
    while (attempt < 5) {
      const { data: existing } = await admin
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existing) break
      attempt += 1
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
    }

    // Every plan gets the same 14-day trial, no credit card required up
    // front — Polar checkout only happens later, either when the trial
    // ends or the org chooses to upgrade early from /dashboard/billing.
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: companyName.trim(),
        slug,
        plan: chosenPlan,
        plan_status: 'trialing',
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single()

    if (orgError || !org) {
      throw new Error(orgError?.message || 'Failed to create organization')
    }

    // First user of a new organization is its owner.
    const { error: userError } = await admin
      .from('users')
      .upsert({
        id: user.id,
        organization_id: org.id,
        email: user.email!,
        full_name: fullName || user.user_metadata?.full_name || null,
        role: 'owner',
      })

    if (userError) {
      throw new Error(userError.message)
    }

    return NextResponse.json({ success: true, organization: org })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
