import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'
import { runRecruitingAgent, runBatchAgent, PlanLimitError } from '@/lib/agent'

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { candidateId, jobId, batch } = body

    if (batch && jobId) {
      // Verify the job belongs to this organization before batch-processing
      // it — runBatchAgent uses the admin client internally, so this check
      // is the only thing standing between "my job" and "someone else's job".
      const { data: job } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', jobId)
        .eq('organization_id', ctx.organizationId)
        .single()

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      const result = await runBatchAgent(jobId)
      return NextResponse.json(result)
    }

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId or jobId required' }, { status: 400 })
    }

    // Same guard for a single candidate — confirm it's actually in this org
    // before running the agent (which itself uses the admin client and
    // would otherwise happily score/email a candidate from any tenant).
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidateId)
      .eq('organization_id', ctx.organizationId)
      .single()

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const result = await runRecruitingAgent(candidateId)
    return NextResponse.json(result)

  } catch (err: unknown) {
    console.error('Agent error:', err)

    if (err instanceof PlanLimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 402 })
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    )
  }
}
