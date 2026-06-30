import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalAuthorizeUrl } from '@/lib/cal'

/**
 * Starts the Cal.com OAuth flow for the current user's organization.
 * Redirects to Cal.com's consent screen. The organization_id is embedded
 * in `state` so the callback knows which tenant is connecting.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?cal_error=no_organization', request.url)
    )
  }

  // Only owners/admins should be able to connect the org's calendar.
  if (profile.role === 'hr') {
    return NextResponse.redirect(
      new URL('/dashboard/settings?cal_error=insufficient_permissions', request.url)
    )
  }

  // Encode org id + a short nonce in state. In production, sign this
  // (e.g. HMAC) so the callback can verify it wasn't tampered with.
  const state = Buffer.from(
    JSON.stringify({ organizationId: profile.organization_id, userId: user.id, ts: Date.now() })
  ).toString('base64url')

  const authorizeUrl = getCalAuthorizeUrl(state)
  return NextResponse.redirect(authorizeUrl)
}
