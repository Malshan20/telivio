import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'

/**
 * Returns the Calendly connection status for the current organization.
 * cal_user_id is stored as "user_uri|||org_uri" — we parse out just the
 * user URI for display purposes.
 */
export async function GET() {
  const ctx = await getOrgContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('cal_connections')
    .select('cal_username, cal_user_id, default_event_type_id, expires_at')
    .eq('organization_id', ctx.organizationId)
    .single()

  if (!data) {
    return NextResponse.json({ connected: false })
  }

  // Parse out just the user URI from the combined "user_uri|||org_uri" format
  const userUri = data.cal_user_id?.split('|||')[0] ?? null

  return NextResponse.json({
    connected: true,
    username: data.cal_username,
    userUri,
    defaultEventTypeId: data.default_event_type_id,
    expiresAt: data.expires_at,
  })
}
