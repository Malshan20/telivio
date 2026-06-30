import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'

/**
 * POST /api/agency/switch  { organizationId: "..." }
 *
 * Switches the caller's PRIMARY workspace (public.users.organization_id)
 * to a different organization — used by an agency user moving between
 * their own agency workspace and a client's child workspace.
 *
 * This is deliberately a full primary-workspace switch, not a per-tab
 * "viewing as" context: simpler to reason about and matches how the rest
 * of the app already resolves organization_id (every query keys off
 * users.organization_id via getOrgContext()). The tradeoff is that
 * switching affects ALL of a user's open tabs/sessions at once, not just
 * the current one — acceptable for how infrequently agency users expect
 * to switch clients.
 *
 * Access is granted if the target organization is EITHER:
 *   (a) the agency's own org (always allowed to switch back), OR
 *   (b) a child workspace whose parent_organization_id is the caller's
 *       current agency org, OR
 *   (c) a workspace the caller has an explicit organization_memberships row for.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = await request.json()
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Resolve the caller's own top-level agency org — if their CURRENT org
    // already has a parent, walk up to it, so switching always anchors to
    // the agency root rather than chaining child->child.
    const { data: currentOrg } = await admin
      .from('organizations')
      .select('id, parent_organization_id')
      .eq('id', ctx.organizationId)
      .single()

    const agencyRootId = currentOrg?.parent_organization_id ?? ctx.organizationId

    let allowed = organizationId === agencyRootId

    if (!allowed) {
      const { data: target } = await admin
        .from('organizations')
        .select('id, parent_organization_id')
        .eq('id', organizationId)
        .single()

      if (target?.parent_organization_id === agencyRootId) {
        allowed = true
      }
    }

    if (!allowed) {
      const { data: membership } = await admin
        .from('organization_memberships')
        .select('id')
        .eq('user_id', ctx.userId)
        .eq('organization_id', organizationId)
        .single()

      allowed = !!membership
    }

    if (!allowed) {
      return NextResponse.json({ error: 'You do not have access to that workspace' }, { status: 403 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('users')
      .update({ organization_id: organizationId })
      .eq('id', ctx.userId)

    if (error) throw error

    return NextResponse.json({ success: true, organizationId })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to switch workspace' },
      { status: 500 }
    )
  }
}
