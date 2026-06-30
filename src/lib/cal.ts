import { createAdminClient } from '@/lib/supabase/server'

const CAL_API_BASE = 'https://api.cal.com/v2'
const CAL_OAUTH_BASE = 'https://app.cal.com'

const CAL_CLIENT_ID = process.env.CAL_CLIENT_ID!
const CAL_CLIENT_SECRET = process.env.CAL_CLIENT_SECRET!
const CAL_REDIRECT_URI = process.env.CAL_REDIRECT_URI!

export interface CalConnection {
  id: string
  organization_id: string
  cal_user_id: string | null
  cal_username: string | null
  default_event_type_id: string | null
  access_token: string
  refresh_token: string
  expires_at: string
}

/**
 * Builds the URL that sends an organization's HR user to Cal.com's OAuth
 * consent screen. `state` should encode the organization_id (and ideally
 * a signed/short-lived nonce) so the callback knows who's connecting.
 *
 * `scope` is required by Cal.com's authorize endpoint — omitting it
 * produces "scope parameter is required for this OAuth client". These
 * scopes must also be enabled on the OAuth client itself in the Cal.com
 * dashboard (Settings → Developer → OAuth Clients → your app → Scopes),
 * or Cal.com will instead return error=invalid_request with
 * "Requested scope exceeds the client's registered scopes".
 */
const CAL_OAUTH_SCOPES = ['EVENT_TYPE_READ', 'BOOKING_READ', 'BOOKING_WRITE', 'PROFILE_READ']

export function getCalAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CAL_CLIENT_ID,
    redirect_uri: CAL_REDIRECT_URI,
    response_type: 'code',
    scope: CAL_OAUTH_SCOPES.join(' '),
    state,
  })
  return `${CAL_OAUTH_BASE}/auth/oauth2/authorize?${params.toString()}`
}

/**
 * Exchanges the authorization code (from the OAuth callback) for an
 * access token + refresh token, then stores them for the given organization.
 * Called once, right after Cal.com redirects back to /api/cal/callback.
 */
export async function exchangeCodeForTokens(
  code: string,
  organizationId: string,
  connectedByUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${CAL_OAUTH_BASE}/api/auth/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CAL_CLIENT_ID,
        client_secret: CAL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: CAL_REDIRECT_URI,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return { success: false, error: `Cal.com token exchange failed: ${errText}` }
    }

    const data = await response.json()
    const { access_token, refresh_token, expires_in } = data

    if (!access_token || !refresh_token) {
      return { success: false, error: 'Cal.com did not return tokens' }
    }

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

    // Fetch the connected Cal.com user's profile (username, id) for display
    let calUsername: string | null = null
    let calUserId: string | null = null
    try {
      const meRes = await fetch(`${CAL_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (meRes.ok) {
        const me = await meRes.json()
        calUsername = me?.data?.username ?? null
        calUserId = me?.data?.id ? String(me.data.id) : null
      }
    } catch {
      // Non-fatal — connection still succeeds without the display fields.
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('cal_connections')
      .upsert(
        {
          organization_id: organizationId,
          access_token,
          refresh_token,
          expires_at: expiresAt,
          cal_username: calUsername,
          cal_user_id: calUserId,
          connected_by: connectedByUserId,
        },
        { onConflict: 'organization_id' }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Refreshes an expired access token using the stored refresh token, and
 * persists the new tokens back to the database for this organization.
 */
async function refreshAccessToken(connection: CalConnection): Promise<string | null> {
  try {
    const response = await fetch(`${CAL_OAUTH_BASE}/api/auth/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CAL_CLIENT_ID,
        client_secret: CAL_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const { access_token, refresh_token, expires_in } = data
    if (!access_token) return null

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

    const supabase = createAdminClient()
    await supabase
      .from('cal_connections')
      .update({
        access_token,
        refresh_token: refresh_token || connection.refresh_token,
        expires_at: expiresAt,
      })
      .eq('organization_id', connection.organization_id)

    return access_token
  } catch {
    return null
  }
}

/**
 * Returns a valid (non-expired) access token for the given organization,
 * refreshing it first if it's expired or about to expire. Returns null if
 * the organization has never connected Cal.com.
 */
export async function getValidAccessToken(organizationId: string): Promise<{
  token: string | null
  connection: CalConnection | null
  error?: string
}> {
  const supabase = createAdminClient()
  const { data: connection, error } = await supabase
    .from('cal_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error || !connection) {
    return { token: null, connection: null, error: 'Organization has not connected Cal.com yet' }
  }

  const expiresAt = new Date(connection.expires_at).getTime()
  const isExpiringSoon = expiresAt - Date.now() < 60_000 // refresh if <60s left

  if (!isExpiringSoon) {
    return { token: connection.access_token, connection }
  }

  const newToken = await refreshAccessToken(connection)
  if (!newToken) {
    return { token: null, connection, error: 'Failed to refresh Cal.com token — reconnect required' }
  }

  return { token: newToken, connection }
}

/**
 * Creates an interview scheduling link on THIS ORGANIZATION'S OWN Cal.com
 * account (using their stored OAuth token) — not Telivio's, and not any
 * other customer's. Falls back with a clear error if not connected.
 */
export async function createSchedulingLink(
  organizationId: string,
  candidateName: string,
  candidateEmail: string,
  jobTitle: string
): Promise<{ link: string | null; error?: string }> {
  const { token, connection, error } = await getValidAccessToken(organizationId)

  if (!token || !connection) {
    return {
      link: null,
      error: error || 'This organization has not connected Cal.com. Go to Settings → Integrations to connect.',
    }
  }

  const eventTypeId = connection.default_event_type_id
  const username = connection.cal_username

  if (!eventTypeId || !username) {
    return {
      link: null,
      error: 'Cal.com is connected, but no default event type is set. Go to Settings → Integrations to choose one.',
    }
  }

  // Cal.com public booking links accept query params to prefill guest info.
  const link = `https://cal.com/${username}/${eventTypeId}?name=${encodeURIComponent(candidateName)}&email=${encodeURIComponent(candidateEmail)}&notes=${encodeURIComponent(`Interview for: ${jobTitle}`)}`

  return { link }
}

/**
 * Lists this organization's event types from THEIR Cal.com account, so
 * they can pick which one Telivio should use for interview bookings.
 */
export async function listEventTypes(organizationId: string): Promise<{
  eventTypes: { id: string; title: string; slug: string; length: number }[]
  error?: string
}> {
  const { token, error } = await getValidAccessToken(organizationId)
  if (!token) {
    return { eventTypes: [], error: error || 'Not connected' }
  }

  try {
    const response = await fetch(`${CAL_API_BASE}/event-types`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      return { eventTypes: [], error: `Cal.com API error: ${response.status}` }
    }

    const data = await response.json()
    const eventTypes = (data?.data || []).map((et: { id: number | string; title: string; slug: string; length: number }) => ({
      id: String(et.id),
      title: et.title,
      slug: et.slug,
      length: et.length,
    }))

    return { eventTypes }
  } catch (err: unknown) {
    return { eventTypes: [], error: err instanceof Error ? err.message : 'Failed to fetch event types' }
  }
}

/**
 * Disconnects this organization's Cal.com account from Telivio (removes
 * stored tokens). Does not revoke the token on Cal.com's side — that
 * still requires the user to also disconnect from their Cal.com settings
 * if they want to fully revoke it there too.
 */
export async function disconnectCal(organizationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('cal_connections')
    .delete()
    .eq('organization_id', organizationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export interface CalBooking {
  uid: string
  title: string
  startTime: string
  endTime: string
  status: string
  attendees: { email: string; name: string }[]
}

/**
 * Fetches bookings from THIS ORGANIZATION'S OWN Cal.com account.
 */
export async function getCalBookings(organizationId: string): Promise<{
  bookings: CalBooking[]
  error?: string
}> {
  const { token, error } = await getValidAccessToken(organizationId)
  if (!token) {
    return { bookings: [], error: error || 'Not connected' }
  }

  try {
    const response = await fetch(`${CAL_API_BASE}/bookings?take=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      return { bookings: [], error: `Cal.com API error: ${response.status}` }
    }

    const data = await response.json()
    return { bookings: data?.data || [] }
  } catch (err: unknown) {
    return { bookings: [], error: err instanceof Error ? err.message : 'Failed to fetch bookings' }
  }
}

/**
 * Cancels a booking on THIS ORGANIZATION'S OWN Cal.com account.
 */
export async function cancelCalBooking(
  organizationId: string,
  bookingUid: string
): Promise<{ success: boolean; error?: string }> {
  const { token, error } = await getValidAccessToken(organizationId)
  if (!token) {
    return { success: false, error: error || 'Not connected' }
  }

  try {
    const response = await fetch(`${CAL_API_BASE}/bookings/${bookingUid}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellationReason: 'Cancelled by recruiter' }),
    })

    if (!response.ok) {
      return { success: false, error: `Failed to cancel booking: ${response.status}` }
    }

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel booking' }
  }
}
