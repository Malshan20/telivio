import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const [jobsResult, candidatesResult, interviewsResult] = await Promise.all([
      supabase.from('jobs').select('id, status').eq('organization_id', ctx.organizationId),
      supabase.from('candidates').select('id, status, score').eq('organization_id', ctx.organizationId),
      supabase.from('interviews').select('id, status').eq('organization_id', ctx.organizationId),
    ])

    const jobs = jobsResult.data || []
    const candidates = candidatesResult.data || []
    const interviews = interviewsResult.data || []

    const scoredCandidates = candidates.filter((c) => c.score !== null)
    const avgScore = scoredCandidates.length
      ? Math.round(scoredCandidates.reduce((sum, c) => sum + (c.score || 0), 0) / scoredCandidates.length)
      : 0

    const stats = {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === 'active').length,
      totalCandidates: candidates.length,
      screened: candidates.filter((c) => c.status === 'screened').length,
      interviews: candidates.filter((c) => c.status === 'interview').length,
      offers: candidates.filter((c) => c.status === 'offer').length,
      rejected: candidates.filter((c) => c.status === 'rejected').length,
      avgScore,
      scheduledInterviews: interviews.filter((i) => i.status === 'scheduled').length,
    }

    return NextResponse.json(stats)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
