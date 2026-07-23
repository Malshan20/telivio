import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Explicit organization_id filter — defensive even with RLS, since the
    // `jobs` table also has a public-read policy for active postings (used
    // by the /apply page) and we don't want that policy to accidentally
    // widen what an authenticated dashboard request can see.
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        candidates(
          id, name, email, score, status, created_at, reasoning, strengths, weaknesses
        )
      `)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    // Never allow organization_id to be changed via this route.
    delete body.organization_id

    const { data, error } = await supabase
      .from('jobs')
      .update(body)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete job' },
      { status: 500 }
    )
  }
}
