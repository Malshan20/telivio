import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext, getOrgBillingContext } from '@/lib/org-context'
import { getPlan } from '@/lib/plans'

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgBillingContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!getPlan(ctx.plan).features.candidateNotes) {
      return NextResponse.json(
        { error: 'Candidate notes are available on the Growth plan and above. Upgrade in Settings → Billing.', code: 'feature_locked' },
        { status: 402 }
      )
    }

    const supabase = await createClient()
    const body = await request.json()
    const { candidate_id, note } = body

    if (!candidate_id || !note) {
      return NextResponse.json({ error: 'candidate_id and note are required' }, { status: 400 })
    }

    // Verify the candidate belongs to this organization before attaching
    // a note to it — prevents an HR user from one company writing a note
    // onto a candidate that (somehow) belongs to a different company.
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, organization_id')
      .eq('id', candidate_id)
      .eq('organization_id', ctx.organizationId)
      .single()

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        organization_id: ctx.organizationId,
        candidate_id,
        note,
        created_by: ctx.userId,
      })
      .select(`*, user:users(full_name, email)`)
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add note' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('id')

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('organization_id', ctx.organizationId)
      .eq('created_by', ctx.userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete note' },
      { status: 500 }
    )
  }
}
