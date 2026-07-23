import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'
import { getCalendlyAuthorizeUrl } from '@/lib/calendly'

/**
 * Starts the Calendly OAuth flow for the current organization.
 * The state param encodes org and user IDs plus a timestamp (as a
 * lightweight CSRF token — in production use a signed/encrypted nonce).
 */
export async function GET(request: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const state = Buffer.from(
    JSON.stringify({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      ts: Date.now(),
    })
  ).toString('base64url')

  const authorizeUrl = getCalendlyAuthorizeUrl(state)
  return NextResponse.redirect(authorizeUrl)
}
