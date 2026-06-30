import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ connected: false })
    }

    const { data: connection } = await supabase
      .from('cal_connections')
      .select('cal_username, default_event_type_id, created_at')
      .eq('organization_id', profile.organization_id)
      .single()

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      calUsername: connection.cal_username,
      defaultEventTypeId: connection.default_event_type_id,
      connectedAt: connection.created_at,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to check status' },
      { status: 500 }
    )
  }
}
