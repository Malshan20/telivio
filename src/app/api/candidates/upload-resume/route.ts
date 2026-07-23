import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { extractResumeText, ACCEPTED_RESUME_TYPES, MAX_RESUME_SIZE_BYTES } from '@/lib/resume-parser'

/**
 * Public resume upload endpoint, used by the unauthenticated /apply/[jobId]
 * page. Like the candidate creation route, the applicant doesn't have (or
 * need) an organization context — we resolve organization_id from the job
 * and use it as the storage path prefix, which is what the storage RLS
 * policies key off of for read access later.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const jobId = formData.get('jobId') as string | null

    if (!file || !jobId) {
      return NextResponse.json({ error: 'file and jobId are required' }, { status: 400 })
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      return NextResponse.json({ error: 'Resume file is too large (max 10MB)' }, { status: 413 })
    }

    if (!ACCEPTED_RESUME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('organization_id, status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'active') {
      return NextResponse.json({ error: 'This job is no longer accepting applications' }, { status: 410 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Path prefix MUST start with organization_id — the storage RLS read
    // policy splits on '/' and checks the first segment against the
    // caller's own org. Get this wrong and HR will get permission errors
    // trying to view resumes (or worse, see the wrong org's files).
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${job.organization_id}/${jobId}/${crypto.randomUUID()}-${safeFilename}`

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const resumeText = await extractResumeText(buffer, file.type, file.name)

    return NextResponse.json({
      success: true,
      resumeUrl: path,
      resumeFilename: file.name,
      resumeText,
      textExtracted: resumeText.length > 0,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload resume' },
      { status: 500 }
    )
  }
}
