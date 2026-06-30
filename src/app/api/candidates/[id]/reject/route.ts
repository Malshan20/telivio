import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgBillingContext } from '@/lib/org-context'
import { generateRejectionEmail } from '@/lib/groq'
import { sendRejectionEmail } from '@/lib/resend'
import { getPlan } from '@/lib/plans'

/**
 * Manually triggered by an HR user clicking "Reject" on a candidate.
 * Unlike the old behavior, rejection is never automatic — the AI agent
 * only scores and (if above threshold) schedules an interview. A human
 * always makes the final call to turn a candidate away, and this route
 * is the one place that actually sends the rejection email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgBillingContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: candidate } = await supabase
      .from('candidates')
      .select(`*, job:jobs(title), organization:organizations(name, email_template_overrides)`)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .single()

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    if (candidate.status === 'rejected') {
      return NextResponse.json({ error: 'This candidate has already been rejected' }, { status: 409 })
    }

    const organizationName = (candidate.organization as { name?: string } | null)?.name || 'Our Company'
    const jobTitle = (candidate.job as { title?: string } | null)?.title || 'this position'
    const overrides = getPlan(ctx.plan).features.customEmailTemplates
      ? (candidate.organization as { email_template_overrides?: { rejection?: { subject?: string } } } | null)?.email_template_overrides
      : null

    // Generate a personalized rejection email via Groq, same as before —
    // it just now happens on-demand instead of automatically.
    const { subject, body } = await generateRejectionEmail(
      candidate.name,
      jobTitle,
      candidate.score ?? 0
    )

    const { id: emailId, error: emailError } = await sendRejectionEmail({
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      jobTitle,
      subject,
      body,
      companyName: organizationName,
      customSubject: overrides?.rejection?.subject,
    })

    if (emailError) {
      return NextResponse.json({ error: `Failed to send rejection email: ${emailError}` }, { status: 502 })
    }

    if (emailId) {
      await supabase.from('email_logs').insert({
        organization_id: ctx.organizationId,
        candidate_id: candidate.id,
        email_type: 'rejection',
        to_email: candidate.email,
        subject,
        resend_id: emailId,
        status: 'sent',
      })
    }

    const { data: updated, error: updateError } = await supabase
      .from('candidates')
      .update({ status: 'rejected' })
      .eq('id', candidate.id)
      .eq('organization_id', ctx.organizationId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ success: true, candidate: updated, emailSent: !!emailId })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reject candidate' },
      { status: 500 }
    )
  }
}
