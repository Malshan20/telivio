import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'
import { runRecruitingAgent, PlanLimitError } from '@/lib/agent'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const status = searchParams.get('status')
    const minScore = searchParams.get('minScore')

    let query = supabase
      .from('candidates')
      .select(`
        *,
        job:jobs(id, title),
        interviews(id, status, scheduling_link, scheduled_time)
      `)
      .eq('organization_id', ctx.organizationId)
      .order('score', { ascending: false })

    if (jobId) query = query.eq('job_id', jobId)
    if (status) query = query.eq('status', status)
    if (minScore) query = query.gte('score', parseInt(minScore))

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch candidates' },
      { status: 500 }
    )
  }
}

/**
 * Public application endpoint — used by the unauthenticated /apply/[jobId]
 * page. The applicant doesn't know (or need to know) which organization
 * owns the job, so we resolve organization_id server-side from the job
 * itself and stamp it onto the new candidate row. This is what keeps a
 * candidate correctly siloed to Company A vs Company B without trusting
 * anything the client sends.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      job_id, name, email, phone, location, salary_expectation,
      years_experience, earliest_start_date, work_authorization, cover_note,
      resume_text, resume_url, resume_filename, linkedin_url, portfolio_url,
    } = body

    if (!job_id || !name || !email) {
      return NextResponse.json(
        { error: 'job_id, name, and email are required' },
        { status: 400 }
      )
    }

    if (!resume_url) {
      return NextResponse.json(
        { error: 'Please upload a resume before submitting' },
        { status: 400 }
      )
    }

    // Admin client: public applicants are never authenticated, so this
    // must bypass RLS — but we still manually enforce tenant correctness
    // below by resolving organization_id from the job, not from the client.
    const supabase = createAdminClient()

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, organization_id, status, title')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'active') {
      return NextResponse.json({ error: 'This job is no longer accepting applications' }, { status: 410 })
    }

    // Check for duplicate application within the same job
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('job_id', job_id)
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied for this position' },
        { status: 409 }
      )
    }

    // Create candidate record, stamped with the JOB'S organization_id —
    // never trust a client-supplied organization_id for this.
    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({
        organization_id: job.organization_id,
        job_id,
        name,
        email,
        phone,
        location,
        salary_expectation,
        years_experience,
        earliest_start_date: earliest_start_date || null,
        work_authorization,
        cover_note,
        resume_text,
        resume_url,
        resume_filename,
        linkedin_url,
        portfolio_url,
        status: 'applied',
      })
      .select()
      .single()

    if (error) throw error

    // Trigger AI agent asynchronously (fire and forget)
    // In production, use a queue (Inngest, Trigger.dev, etc.)
    // NOTE: if this organization is out of trial/plan access or monthly
    // screening capacity, this throws PlanLimitError and the candidate is
    // left at status "applied" — never silently advanced or rejected. This
    // is intentional: a billing problem on the company's side should never
    // be visible to (or affect) the applicant, but it DOES mean candidates
    // can pile up unscored if HR doesn't notice their plan lapsed.
    runRecruitingAgent(candidate.id).catch((err) => {
      if (err instanceof PlanLimitError) {
        console.warn(
          `Candidate ${candidate.id} left unscored — organization ${job.organization_id} is over its plan limit (${err.code}): ${err.message}`
        )
      } else {
        console.error('Background agent error for candidate', candidate.id, err)
      }
    })

    return NextResponse.json(
      { success: true, candidateId: candidate.id, message: 'Application submitted successfully' },
      { status: 201 }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit application' },
      { status: 500 }
    )
  }
}
