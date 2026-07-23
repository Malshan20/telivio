import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgBillingContext } from '@/lib/org-context'
import { getPlan } from '@/lib/plans'

const MAX_SUBJECT_LENGTH = 150
const MAX_INTRO_LENGTH = 600

export async function GET() {
  const ctx = await getOrgBillingContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select('email_template_overrides')
    .eq('id', ctx.organizationId)
    .single()

  return NextResponse.json({ overrides: data?.email_template_overrides ?? {} })
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getOrgBillingContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!getPlan(ctx.plan).features.customEmailTemplates) {
      return NextResponse.json(
        { error: 'Custom email templates are available on the Growth plan and above.', code: 'feature_locked' },
        { status: 402 }
      )
    }

    if (ctx.role === 'hr') {
      return NextResponse.json({ error: 'Only owners and admins can edit email templates' }, { status: 403 })
    }

    const body = await request.json()
    const { interviewInviteSubject, interviewInviteIntro, rejectionSubject } = body

    if (interviewInviteSubject && interviewInviteSubject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json({ error: `Subject must be under ${MAX_SUBJECT_LENGTH} characters` }, { status: 400 })
    }
    if (interviewInviteIntro && interviewInviteIntro.length > MAX_INTRO_LENGTH) {
      return NextResponse.json({ error: `Intro must be under ${MAX_INTRO_LENGTH} characters` }, { status: 400 })
    }
    if (rejectionSubject && rejectionSubject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json({ error: `Subject must be under ${MAX_SUBJECT_LENGTH} characters` }, { status: 400 })
    }

    const overrides = {
      interview_invite: {
        subject: interviewInviteSubject?.trim() || undefined,
        intro: interviewInviteIntro?.trim() || undefined,
      },
      rejection: {
        subject: rejectionSubject?.trim() || undefined,
      },
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organizations')
      .update({ email_template_overrides: overrides })
      .eq('id', ctx.organizationId)
      .select('email_template_overrides')
      .single()

    if (error) throw error

    return NextResponse.json({ overrides: data.email_template_overrides })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save email templates' },
      { status: 500 }
    )
  }
}
