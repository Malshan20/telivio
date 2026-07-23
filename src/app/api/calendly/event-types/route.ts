import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'
import { listEventTypes, getValidAccessToken } from '@/lib/calendly'

const CALENDLY_API_BASE = 'https://api.calendly.com'

// Belt-and-suspenders: getOrgContext() already reads cookies() which forces
// this route to be dynamic, but we're explicit here too since this route's
// entire purpose is to always return the CURRENT state of a third-party
// account that changes outside our control (event types get added/edited/
// removed in Calendly directly, with no way for us to know without asking).
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET — lists all Calendly event types for this organization.
 *
 * If cal_user_id is in the old format (plain URI, no org URI appended),
 * we also attempt to re-fetch and refresh it so future calls have the
 * full dual-URI format without requiring a reconnect.
 *
 * PATCH — saves the chosen default event type URI.
 */
export async function GET() {
  const ctx = await getOrgContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Attempt auto-refresh of stored user/org URIs if the connection is in
  // the old single-URI format (no '|||' separator). This happens silently
  // so the user doesn't need to reconnect — they'll just see their event
  // types appear correctly after the first request.
  const { token, connection } = await getValidAccessToken(ctx.organizationId)
  if (token && connection && connection.cal_user_id && !connection.cal_user_id.includes('|||')) {
    try {
      const meRes = await fetch(`${CALENDLY_API_BASE}/users/me`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (meRes.ok) {
        const me = await meRes.json()
        const userUri = me?.resource?.uri
        const orgUri = me?.resource?.current_organization
        const slug = me?.resource?.slug

        if (userUri && orgUri) {
          const supabase = await createClient()
          await supabase
            .from('cal_connections')
            .update({
              cal_user_id: `${userUri}|||${orgUri}`,
              cal_username: slug || connection.cal_username,
            })
            .eq('organization_id', ctx.organizationId)
        }
      }
    } catch {
      // Non-fatal — listEventTypes will still try with what it has.
    }
  }

  const { eventTypes, error } = await listEventTypes(ctx.organizationId)

  // Explicit no-cache headers on the HTTP response itself — belt-and-
  // suspenders against any CDN or reverse proxy in front of the app
  // (Vercel Edge, Cloudflare, nginx) that might cache a GET JSON response
  // regardless of Next.js's own `dynamic`/`revalidate` config, which only
  // controls Next's internal rendering/data cache, not intermediary layers.
  const noCacheHeaders = {
    'Cache-Control': 'no-store, must-revalidate',
    'Pragma': 'no-cache',
  }

  if (error && eventTypes.length === 0) {
    return NextResponse.json({ error }, { status: 400, headers: noCacheHeaders })
  }

  return NextResponse.json({ eventTypes }, { headers: noCacheHeaders })
}

export async function PATCH(request: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventTypeId } = await request.json()
  if (!eventTypeId) {
    return NextResponse.json({ error: 'eventTypeId is required' }, { status: 400 })
  }

  // Never allow saving an inactive event type as the default — candidates
  // would land on Calendly's "This Calendly URL is not valid" page. The
  // dropdown already disables inactive options, but this is the real
  // enforcement point in case that's ever bypassed (e.g. a stale client,
  // browser devtools, or a future UI variant).
  const { eventTypes, error: listError } = await listEventTypes(ctx.organizationId)
  const chosen = eventTypes.find((et) => et.id === eventTypeId)

  if (!chosen) {
    return NextResponse.json(
      { error: listError || 'That event type could not be found in your Calendly account.' },
      { status: 400 }
    )
  }

  if (!chosen.active) {
    return NextResponse.json(
      { error: `"${chosen.title}" is inactive in Calendly and would produce a broken link for candidates. Activate it in Calendly first, or pick a different event type.` },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cal_connections')
    .update({ default_event_type_id: eventTypeId })
    .eq('organization_id', ctx.organizationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, eventTypeId })
}
