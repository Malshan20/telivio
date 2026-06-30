import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/cal'

/**
 * Cal.com redirects here after the HR user approves (or denies) the
 * connection. We exchange the auth code for tokens and store them scoped
 * to the organization that initiated the flow (decoded from `state`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/dashboard/settings?cal_error=${encodeURIComponent(oauthError)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard/settings?cal_error=missing_code`)
  }

  let organizationId: string
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    organizationId = decoded.organizationId
    userId = decoded.userId

    // Reject stale state (older than 10 minutes) to limit replay risk.
    if (!decoded.ts || Date.now() - decoded.ts > 10 * 60 * 1000) {
      return NextResponse.redirect(`${origin}/dashboard/settings?cal_error=state_expired`)
    }
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/settings?cal_error=invalid_state`)
  }

  const result = await exchangeCodeForTokens(code, organizationId, userId)

  if (!result.success) {
    console.error('Cal.com OAuth exchange failed:', result.error)
    return NextResponse.redirect(`${origin}/dashboard/settings?cal_error=exchange_failed`)
  }

  return NextResponse.redirect(`${origin}/dashboard/settings?cal_connected=true`)
}
