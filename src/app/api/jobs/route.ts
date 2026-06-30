import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext, getOrgBillingContext } from '@/lib/org-context'
import { canCreateActiveJob } from '@/lib/usage'
import { getPlan } from '@/lib/plans'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // RLS already scopes this to ctx.organizationId, but filtering explicitly
    // too keeps the query planner happy and the intent obvious.
    let query = supabase
      .from('jobs')
      .select(`
        *,
        candidates(count)
      `)
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgBillingContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!ctx.hasAccess) {
      return NextResponse.json(
        { error: 'Your trial has ended. Upgrade your plan to keep posting jobs.', code: 'trial_expired' },
        { status: 402 }
      )
    }

    const jobLimit = await canCreateActiveJob(ctx.organizationId, ctx.plan)
    if (!jobLimit.allowed) {
      return NextResponse.json(
        {
          error: `You've reached the ${jobLimit.limit} active job limit on the ${getPlan(ctx.plan).name} plan. Close an existing job or upgrade to post more.`,
          code: 'job_limit_reached',
          current: jobLimit.current,
          limit: jobLimit.limit,
        },
        { status: 402 }
      )
    }

    const supabase = await createClient()
    const body = await request.json()
    const { title, description, requirements, department, location, employment_type, salary_range } = body

    if (!title || !description || !requirements) {
      return NextResponse.json(
        { error: 'title, description, and requirements are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        organization_id: ctx.organizationId,
        title,
        description,
        requirements,
        department,
        location,
        employment_type,
        salary_range,
        created_by: ctx.userId,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
