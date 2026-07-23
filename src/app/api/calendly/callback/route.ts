import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/calendly'

/**
 * OAuth callback — Calendly redirects here after the user grants access.
 * Exchanges the code for tokens and stores them, then sends the user back
 * to Settings with a success or error indicator.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    // Calendly sends error=access_denied when the user cancels
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendly_error=${encodeURIComponent(errorParam)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendly_error=missing_params`
    )
  }

  let organizationId: string
  let userId: string

  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    organizationId = decoded.organizationId
    userId = decoded.userId

    // Reject state tokens older than 10 minutes
    if (!organizationId || !userId || Date.now() - decoded.ts > 10 * 60 * 1000) {
      throw new Error('State expired or invalid')
    }
  } catch {
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendly_error=invalid_state`
    )
  }

  const result = await exchangeCodeForTokens(code, organizationId, userId)

  if (!result.success) {
    console.error('Calendly OAuth exchange failed:', result.error)
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendly_error=exchange_failed`
    )
  }

  return NextResponse.redirect(
    `${origin}/dashboard/settings?calendly_connected=true`
  )
}
