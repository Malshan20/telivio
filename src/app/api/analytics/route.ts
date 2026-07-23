import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgBillingContext } from '@/lib/org-context'
import { getPlan } from '@/lib/plans'

/**
 * Real analytics computed from data already in the database — no new
 * tracking infrastructure needed. "Applications per role" and "conversion
 * rates" (applied -> screened -> interview -> offer) come straight from
 * candidates.status grouped by job.
 */
export async function GET() {
  try {
    const ctx = await getOrgBillingContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!getPlan(ctx.plan).features.analyticsDashboard) {
      return NextResponse.json(
        { error: 'Analytics is available on the Growth plan and above.', code: 'feature_locked' },
        { status: 402 }
      )
    }

    const supabase = await createClient()

    const [jobsRes, candidatesRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, title, status, created_at')
        .eq('organization_id', ctx.organizationId)
        .order('created_at', { ascending: false }),
      supabase
        .from('candidates')
        .select('id, job_id, status, score, created_at')
        .eq('organization_id', ctx.organizationId),
    ])

    const jobs = jobsRes.data ?? []
    const candidates = candidatesRes.data ?? []

    const perRole = jobs.map((job) => {
      const jobCandidates = candidates.filter((c) => c.job_id === job.id)
      const applied = jobCandidates.length
      const screened = jobCandidates.filter((c) => c.score !== null).length
      const interview = jobCandidates.filter((c) => c.status === 'interview' || c.status === 'offer').length
      const offer = jobCandidates.filter((c) => c.status === 'offer').length
      const rejected = jobCandidates.filter((c) => c.status === 'rejected').length

      const avgScore = screened > 0
        ? Math.round(jobCandidates.filter((c) => c.score !== null).reduce((sum, c) => sum + (c.score ?? 0), 0) / screened)
        : null

      return {
        jobId: job.id,
        title: job.title,
        status: job.status,
        applied,
        screened,
        interview,
        offer,
        rejected,
        avgScore,
        conversionToInterview: applied > 0 ? Math.round((interview / applied) * 100) : 0,
        conversionToOffer: applied > 0 ? Math.round((offer / applied) * 100) : 0,
      }
    })

    const totals = {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === 'active').length,
      totalApplications: candidates.length,
      totalScreened: candidates.filter((c) => c.score !== null).length,
      totalInterviews: candidates.filter((c) => c.status === 'interview' || c.status === 'offer').length,
      totalOffers: candidates.filter((c) => c.status === 'offer').length,
      totalRejected: candidates.filter((c) => c.status === 'rejected').length,
      overallAvgScore: (() => {
        const scored = candidates.filter((c) => c.score !== null)
        if (scored.length === 0) return null
        return Math.round(scored.reduce((sum, c) => sum + (c.score ?? 0), 0) / scored.length)
      })(),
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentCandidates = candidates.filter((c) => new Date(c.created_at) >= thirtyDaysAgo)
    const byDay: Record<string, number> = {}
    for (const c of recentCandidates) {
      const day = c.created_at.slice(0, 10)
      byDay[day] = (byDay[day] || 0) + 1
    }

    return NextResponse.json({ perRole, totals, applicationsByDay: byDay })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
