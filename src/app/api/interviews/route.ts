import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'
import { createSchedulingLink } from '@/lib/calendly'
import { sendInterviewInvite } from '@/lib/resend'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const candidateId = searchParams.get('candidateId')

    let query = supabase
      .from('interviews')
      .select(`*, candidate:candidates(name, email, score), job:jobs(title)`)
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false })

    if (jobId) query = query.eq('job_id', jobId)
    if (candidateId) query = query.eq('candidate_id', candidateId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch interviews' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { candidate_id, job_id, sendEmail = true } = body

    // Fetch candidate and job info, scoped to this organization
    const { data: candidate } = await supabase
      .from('candidates')
      .select(`*, job:jobs(title)`)
      .eq('id', candidate_id)
      .eq('organization_id', ctx.organizationId)
      .single()

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', ctx.organizationId)
      .single()
    const organizationName = org?.name || 'Our Company'

    // Create a scheduling link on THIS organization's own Calendly account
    const { link, error: calError } = await createSchedulingLink(
      ctx.organizationId,
      candidate.name,
      candidate.email,
      candidate.job.title
    )

    if (!link) {
      return NextResponse.json(
        { error: calError || 'Calendly is not connected for this organization. Go to Settings → Integrations.' },
        { status: 400 }
      )
    }

    // Create interview record
    const { data: interview, error } = await supabase
      .from('interviews')
      .insert({
        organization_id: ctx.organizationId,
        candidate_id,
        job_id: job_id || candidate.job_id,
        scheduling_link: link,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Send email if requested
    if (sendEmail) {
      const { id: emailId } = await sendInterviewInvite({
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobTitle: candidate.job.title,
        schedulingLink: link,
        companyName: organizationName,
      })

      if (emailId) {
        await supabase.from('email_logs').insert({
          organization_id: ctx.organizationId,
          candidate_id,
          email_type: 'interview_invite',
          to_email: candidate.email,
          subject: `Interview Invitation — ${candidate.job.title}`,
          resend_id: emailId,
          status: 'sent',
        })
      }
    }

    // Update candidate status
    await supabase
      .from('candidates')
      .update({ status: 'interview' })
      .eq('id', candidate_id)
      .eq('organization_id', ctx.organizationId)

    return NextResponse.json(interview, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create interview' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body
    delete updates.organization_id

    const { data, error } = await supabase
      .from('interviews')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update interview' },
      { status: 500 }
    )
  }
}
