import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'

/**
 * The resumes bucket is private, so the candidate profile page can't just
 * link to resume_url directly — it needs a short-lived signed URL. We
 * verify the candidate belongs to the caller's organization before
 * generating one, on top of storage RLS already restricting which paths
 * an org can read.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const candidateId = searchParams.get('candidateId')

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: candidate } = await supabase
      .from('candidates')
      .select('resume_url, resume_filename')
      .eq('id', candidateId)
      .eq('organization_id', ctx.organizationId)
      .single()

    if (!candidate?.resume_url) {
      return NextResponse.json({ error: 'No resume on file for this candidate' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from('resumes')
      .createSignedUrl(candidate.resume_url, 60 * 10) // 10 minute expiry

    if (error || !data) {
      throw new Error(error?.message || 'Failed to generate signed URL')
    }

    return NextResponse.json({
      url: data.signedUrl,
      filename: candidate.resume_filename,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get resume URL' },
      { status: 500 }
    )
  }
}
