import { createAdminClient } from '@/lib/supabase/server'

const CALENDLY_AUTH_BASE = 'https://auth.calendly.com'
const CALENDLY_API_BASE = 'https://api.calendly.com'

const CALENDLY_CLIENT_ID = process.env.CALENDLY_CLIENT_ID!
const CALENDLY_CLIENT_SECRET = process.env.CALENDLY_CLIENT_SECRET!
const CALENDLY_REDIRECT_URI = process.env.CALENDLY_REDIRECT_URI!

/**
 * Basic auth header — Calendly requires credentials in the Authorization
 * header (not the body) for all token exchange and refresh requests.
 */
function basicAuthHeader(): string {
  const credentials = Buffer.from(`${CALENDLY_CLIENT_ID}:${CALENDLY_CLIENT_SECRET}`).toString('base64')
  return `Basic ${credentials}`
}

export interface CalendlyConnection {
  id: string
  organization_id: string
  cal_user_id: string | null    // Calendly user URI — primary key for API calls
  cal_username: string | null   // Calendly scheduling slug e.g. "jane-smith"
  default_event_type_id: string | null  // Selected event type URI
  access_token: string
  refresh_token: string
  expires_at: string
}

/**
 * Builds the Calendly OAuth authorize URL.
 * Calendly does NOT require a scope parameter — it grants full API access.
 */
export function getCalendlyAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CALENDLY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: CALENDLY_REDIRECT_URI,
    state,
  })
  return `${CALENDLY_AUTH_BASE}/oauth/authorize?${params.toString()}`
}

/**
 * Exchanges the authorization code for access + refresh tokens.
 * Stores user URI, org URI (as fallback), and scheduling slug.
 *
 * Key fixes vs the previous version:
 * - Always calls /users/me (reliable source of user URI + slug + org URI)
 * - Stores org URI separately so listEventTypes can fall back to it
 * - Logs clearly when /users/me fails so it's debuggable
 */
export async function exchangeCodeForTokens(
  code: string,
  organizationId: string,
  connectedByUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${CALENDLY_AUTH_BASE}/oauth/token`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALENDLY_REDIRECT_URI,
      }).toString(),
    })

    if (!response.ok) {
      const errText = await response.text()
      return { success: false, error: `Calendly token exchange failed: ${errText}` }
    }

    const data = await response.json()
    const { access_token, refresh_token, expires_in, owner, organization } = data

    if (!access_token || !refresh_token) {
      return { success: false, error: 'Calendly did not return valid tokens' }
    }

    const expiresAt = new Date(Date.now() + (expires_in || 7200) * 1000).toISOString()

    // /users/me is the authoritative source — the token response `owner`
    // field can sometimes be an org URI rather than a user URI on certain
    // plan types. /users/me always returns the correct user URI and slug.
    let calUserUri: string | null = owner ?? null
    let calOrgUri: string | null = organization ?? null
    let calUsername: string | null = null

    const meRes = await fetch(`${CALENDLY_API_BASE}/users/me`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (meRes.ok) {
      const me = await meRes.json()
      calUserUri = me?.resource?.uri ?? calUserUri
      calUsername = me?.resource?.slug ?? null
      calOrgUri = me?.resource?.current_organization ?? calOrgUri
    } else {
      // Log so it's debuggable — we still proceed with whatever the token
      // response gave us, but event type listing may be degraded.
      console.error(
        `[Calendly] /users/me returned ${meRes.status} — ` +
        `falling back to token owner field: ${calUserUri}`
      )
    }

    // Store both user URI (primary) and org URI (fallback for event type listing).
    // We concatenate them with a separator into cal_user_id so we don't need
    // a schema change — format: "user_uri|||org_uri" where org_uri may be absent.
    const storedUserField = calOrgUri
      ? `${calUserUri ?? ''}|||${calOrgUri}`
      : calUserUri

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
          cal_user_id: storedUserField,
          connected_by: connectedByUserId,
        },
        { onConflict: 'organization_id' }
      )

    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Parses the stored cal_user_id field back into user URI and org URI.
 * Format stored: "user_uri|||org_uri" or just "user_uri" for legacy rows.
 */
function parseStoredUserField(storedValue: string | null): {
  userUri: string | null
  orgUri: string | null
} {
  if (!storedValue) return { userUri: null, orgUri: null }
  const parts = storedValue.split('|||')
  const userUri = parts[0] || null
  const orgUri = parts[1] || null
  return { userUri, orgUri }
}

/**
 * Refreshes an expired Calendly access token.
 * Calendly tokens expire after 2 hours.
 */
async function refreshAccessToken(connection: CalendlyConnection): Promise<string | null> {
  try {
    const response = await fetch(`${CALENDLY_AUTH_BASE}/oauth/token`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }).toString(),
    })

    if (!response.ok) return null

    const data = await response.json()
    const { access_token, refresh_token, expires_in } = data
    if (!access_token) return null

    const expiresAt = new Date(Date.now() + (expires_in || 7200) * 1000).toISOString()

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
 * refreshing automatically if it expires within the next 5 minutes.
 */
export async function getValidAccessToken(organizationId: string): Promise<{
  token: string | null
  connection: CalendlyConnection | null
  error?: string
}> {
  const supabase = createAdminClient()
  const { data: connection, error } = await supabase
    .from('cal_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error || !connection) {
    return {
      token: null,
      connection: null,
      error: 'This organization has not connected Calendly. Go to Settings → Integrations to connect.',
    }
  }

  const expiresAt = new Date(connection.expires_at).getTime()
  const isExpiringSoon = expiresAt - Date.now() < 5 * 60 * 1000

  if (!isExpiringSoon) {
    return { token: connection.access_token, connection }
  }

  const newToken = await refreshAccessToken(connection)
  if (!newToken) {
    return {
      token: null,
      connection,
      error: 'Calendly token expired and could not be refreshed — please reconnect in Settings → Integrations.',
    }
  }

  return { token: newToken, connection }
}

/**
 * Lists ALL event types for the connected Calendly account.
 *
 * Strategy:
 * 1. Try user-scoped query first (most precise — just this user's types)
 * 2. If that returns nothing, fall back to org-scoped query
 * 3. NO active=true filter — we return all event types regardless of status
 *    so the user can see and select any of them, including recently created ones
 * 4. count=100 (Calendly's max) to avoid missing anything through pagination
 */
export async function listEventTypes(organizationId: string): Promise<{
  eventTypes: { id: string; title: string; slug: string; length: number; active: boolean }[]
  error?: string
}> {
  const { token, connection, error } = await getValidAccessToken(organizationId)
  if (!token || !connection) {
    return { eventTypes: [], error: error || 'Not connected to Calendly' }
  }

  const { userUri, orgUri } = parseStoredUserField(connection.cal_user_id)

  const mapEventTypes = (collection: any[]) =>
    collection.map((et) => ({
      id: et.uri,
      title: et.name,
      slug: et.slug,
      length: et.duration,
      active: et.active ?? true,
    }))

  // Strategy 1: user-scoped (primary)
  if (userUri && userUri.startsWith('https://')) {
    try {
      const res = await fetch(
        `${CALENDLY_API_BASE}/event_types?user=${encodeURIComponent(userUri)}&count=100`,
        { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const collection = data?.collection ?? []
        if (collection.length > 0) {
          return { eventTypes: mapEventTypes(collection) }
        }
        // Zero results — fall through to org-scope fallback
        console.warn('[Calendly] user-scoped event types returned 0 results, trying org scope')
      } else {
        console.warn(`[Calendly] user-scoped event types: ${res.status}`)
      }
    } catch (err) {
      console.error('[Calendly] user-scoped event types error:', err)
    }
  }

  // Strategy 2: org-scoped fallback
  if (orgUri && orgUri.startsWith('https://')) {
    try {
      const res = await fetch(
        `${CALENDLY_API_BASE}/event_types?organization=${encodeURIComponent(orgUri)}&count=100`,
        { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const collection = data?.collection ?? []
        return { eventTypes: mapEventTypes(collection) }
      } else {
        const errText = await res.text()
        console.error(`[Calendly] org-scoped event types: ${res.status}`, errText)
        return {
          eventTypes: [],
          error: `Calendly API returned ${res.status}. Try disconnecting and reconnecting your account.`,
        }
      }
    } catch (err) {
      return {
        eventTypes: [],
        error: err instanceof Error ? err.message : 'Failed to fetch event types',
      }
    }
  }

  // Both URIs missing or not valid — the /users/me call must have failed at connection time
  return {
    eventTypes: [],
    error: 'Could not determine your Calendly account identity. Please disconnect and reconnect in Settings → Integrations.',
  }
}

/**
 * Builds a Calendly scheduling link pre-filled with the candidate's name and email.
 * URL format: https://calendly.com/{user-slug}/{event-type-slug}?name=...&email=...
 */
export async function createSchedulingLink(
  organizationId: string,
  candidateName: string,
  candidateEmail: string,
  jobTitle: string
): Promise<{ link: string | null; error?: string }> {
  const { token, connection, error } = await getValidAccessToken(organizationId)

  if (!token || !connection) {
    return { link: null, error: error || 'Calendly is not connected for this organization.' }
  }

  const username = connection.cal_username
  const eventTypeUri = connection.default_event_type_id

  if (!username) {
    return {
      link: null,
      error: 'Calendly is connected but your scheduling slug is missing. Try disconnecting and reconnecting.',
    }
  }

  if (!eventTypeUri) {
    return {
      link: null,
      error: 'Calendly is connected but no default event type is selected. Go to Settings → Integrations to pick one.',
    }
  }

  // Resolve the event slug from the stored URI by matching against the
  // user's event types list. We need the slug (not the URI) for the URL.
  try {
    const { eventTypes } = await listEventTypes(organizationId)
    const eventType = eventTypes.find((et) => et.id === eventTypeUri)

    if (!eventType) {
      return {
        link: null,
        error: 'The selected event type no longer exists in Calendly. Go to Settings → Integrations to pick another one.',
      }
    }

    // Calendly shows "This Calendly URL is not valid" to anyone who visits
    // a link for an inactive/unpublished event type — including candidates.
    // We must never hand out a link for one, even if it was saved as the
    // default earlier and later got deactivated in Calendly directly.
    if (!eventType.active) {
      return {
        link: null,
        error: `The selected event type ("${eventType.title}") is inactive in Calendly, so candidates would get a broken link. Go to Settings → Integrations, re-activate it in Calendly, or pick a different active event type.`,
      }
    }

    const params = new URLSearchParams({
      name: candidateName,
      email: candidateEmail,
    })

    return { link: `https://calendly.com/${username}/${eventType.slug}?${params.toString()}` }
  } catch (err: unknown) {
    return {
      link: null,
      error: err instanceof Error ? err.message : 'Failed to build scheduling link',
    }
  }
}

/**
 * Removes the Calendly connection from the database.
 * Does not revoke the token on Calendly's side (the user can do that in
 * their Calendly account settings under Integrations → OAuth Apps).
 */
export async function disconnectCalendly(organizationId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('cal_connections')
    .delete()
    .eq('organization_id', organizationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
