import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOrgBillingContext } from '@/lib/org-context'
import { getPlan } from '@/lib/plans'

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * GET — lists this agency's child workspaces.
 * POST — creates a new client workspace under this agency.
 *
 * Both require the Agency plan's multipleWorkspaces feature. Child
 * workspaces are real, fully isolated organizations (their own jobs,
 * candidates, RLS boundary) — the ONLY thing that ties them to the agency
 * is organizations.parent_organization_id. They deliberately ride the
 * parent's Polar subscription rather than needing their own: a child
 * workspace is created with plan_status='active' immediately (no
 * standalone trial), since the agency is already paying.
 */
export async function GET() {
  const ctx = await getOrgBillingContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!getPlan(ctx.plan).features.multipleWorkspaces) {
    return NextResponse.json(
      { error: 'Multiple workspaces are available on the Agency plan.', code: 'feature_locked' },
      { status: 402 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('parent_organization_id', ctx.organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ workspaces: data ?? [] })
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgBillingContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!getPlan(ctx.plan).features.multipleWorkspaces) {
      return NextResponse.json(
        { error: 'Multiple workspaces are available on the Agency plan.', code: 'feature_locked' },
        { status: 402 }
      )
    }

    if (ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Only the agency owner can create client workspaces' }, { status: 403 })
    }

    const { name } = await request.json()
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Workspace name must be at least 2 characters' }, { status: 400 })
    }

    // Admin client: the creating user doesn't belong to the NEW child org
    // yet (their organization_id stays pointed at the agency itself), so
    // normal RLS would block both the slug check and the insert.
    const admin = createAdminClient()

    const baseSlug = slugify(name)
    let slug = baseSlug
    let attempt = 0
    while (attempt < 5) {
      const { data: existing } = await admin.from('organizations').select('id').eq('slug', slug).single()
      if (!existing) break
      attempt += 1
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
    }

    const { data: workspace, error } = await admin
      .from('organizations')
      .insert({
        name: name.trim(),
        slug,
        parent_organization_id: ctx.organizationId,
        plan: 'agency',
        plan_status: 'active', // Rides the agency's own subscription — no separate trial/billing.
      })
      .select()
      .single()

    if (error || !workspace) {
      throw new Error(error?.message || 'Failed to create workspace')
    }

    // Grant the creating user membership access to switch into it.
    await admin.from('organization_memberships').insert({
      user_id: ctx.userId,
      organization_id: workspace.id,
      role: 'admin',
    })

    return NextResponse.json({ workspace }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
