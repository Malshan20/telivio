import { NextRequest, NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org-context'
import { disconnectCalendly } from '@/lib/calendly'

/**
 * Removes the Calendly connection for the current organization.
 */
export async function POST(request: NextRequest) {
  const ctx = await getOrgContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await disconnectCalendly(ctx.organizationId)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
