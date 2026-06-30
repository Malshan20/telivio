import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Public, unauthenticated endpoint used by /apply/[jobId] to fetch the
 * posting organization's white-label branding (display name + accent
 * color only). Deliberately a narrow API route rather than a public RLS
 * policy on `organizations` — RLS grants row access, not column access,
 * so a public SELECT policy on that table would expose every column
 * (polar_customer_id, email_template_overrides, etc) to any unauthenticated
 * caller. This route hand-picks exactly the two fields that are safe to
 * show a job applicant, using the admin client to bypass RLS internally.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    const { data: job } = await admin
      .from('jobs')
      .select('organization_id, status')
      .eq('id', id)
      .single()

    if (!job || job.status !== 'active') {
      return NextResponse.json({ enabled: false })
    }

    const { data: org } = await admin
      .from('organizations')
      .select('white_label_enabled, white_label_display_name, white_label_accent_color, name')
      .eq('id', job.organization_id)
      .single()

    if (!org?.white_label_enabled) {
      return NextResponse.json({ enabled: false })
    }

    return NextResponse.json({
      enabled: true,
      displayName: org.white_label_display_name || org.name,
      accentColor: org.white_label_accent_color || null,
    })
  } catch {
    // Branding is purely cosmetic — never block the apply flow over it.
    return NextResponse.json({ enabled: false })
  }
}
