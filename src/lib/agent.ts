import { createAdminClient } from '@/lib/supabase/server'
import { scoreResume } from '@/lib/groq'
import { sendInterviewInvite } from '@/lib/resend'
import { createSchedulingLink } from '@/lib/calendly'
import { canScreenResume, incrementScreeningCount } from '@/lib/usage'
import { hasActiveAccess, getPlan, type PlanId, type PlanStatus } from '@/lib/plans'

const DEFAULT_INTERVIEW_THRESHOLD = 75

export interface AgentResult {
  candidateId: string
  score: number
  decision: 'interview' | 'below_threshold'
  emailSent: boolean
  schedulingLink?: string | null
  calError?: string
  error?: string
}

/**
 * Thrown when an organization is out of trial/plan access, or has hit its
 * monthly screening limit. Callers (API routes) catch this specifically to
 * return a 402 with upgrade messaging instead of a generic 500.
 */
export class PlanLimitError extends Error {
  code: 'trial_expired' | 'screening_limit_reached'
  constructor(message: string, code: 'trial_expired' | 'screening_limit_reached') {
    super(message)
    this.code = code
    this.name = 'PlanLimitError'
  }
}

/**
 * Runs the AI screening flow for one candidate:
 *   score → decide → (schedule interview + email) | (leave for HR to reject)
 *
 * IMPORTANT: this no longer auto-rejects anyone. A candidate scoring below
 * the organization's threshold is left in "screened" status with their
 * score visible — an HR user must explicitly click "Reject" (see
 * /api/candidates/[id]/reject) before any rejection email goes out. This
 * is intentional: the AI screens and recommends, a human makes the final
 * call to turn someone away.
 *
 * Every external action (Calendly, candidate/job lookups, email logging) is
 * scoped to the candidate's organization_id, so this never crosses tenant
 * boundaries — Company A's agent run can never touch Company B's Calendly
 * connection or data, even if IDs were guessed.
 */
export async function runRecruitingAgent(candidateId: string): Promise<AgentResult> {
  const supabase = createAdminClient()

  // 1. Fetch candidate with job + organization info (org gives us the
  // interview threshold, billing/plan state, email overrides, and the
  // name for email branding)
  const { data: candidate, error: fetchError } = await supabase
    .from('candidates')
    .select(`
      *,
      job:jobs(*),
      organization:organizations(name, interview_threshold, plan, plan_status, trial_ends_at, email_template_overrides)
    `)
    .eq('id', candidateId)
    .single()

  if (fetchError || !candidate) {
    throw new Error(`Candidate not found: ${fetchError?.message}`)
  }

  const organizationId: string = candidate.organization_id
  const organizationName: string = candidate.organization?.name || 'Our Company'
  const interviewThreshold: number = candidate.organization?.interview_threshold ?? DEFAULT_INTERVIEW_THRESHOLD
  const plan: PlanId = candidate.organization?.plan ?? 'starter'
  const planStatus: PlanStatus = candidate.organization?.plan_status ?? 'trialing'
  const trialEndsAt: string | null = candidate.organization?.trial_ends_at ?? null
  const emailOverrides = (getPlan(plan).features.customEmailTemplates
    ? candidate.organization?.email_template_overrides
    : null) as { interview_invite?: { subject?: string; intro?: string } } | null
  if (!organizationId) {
    throw new Error('Candidate is missing organization_id — data integrity issue')
  }

  // 1b. Plan enforcement — checked BEFORE the Groq call so a blocked
  // screening never costs us an AI API call. Trial/subscription access
  // first, then the monthly screening cap.
  if (!hasActiveAccess({ plan, plan_status: planStatus, trial_ends_at: trialEndsAt })) {
    throw new PlanLimitError(
      'This organization\'s trial has ended or its subscription is inactive. Ask an owner to upgrade in Settings → Billing.',
      'trial_expired'
    )
  }

  const screeningCheck = await canScreenResume(organizationId, plan)
  if (!screeningCheck.allowed) {
    throw new PlanLimitError(
      `This organization has used all ${screeningCheck.limit} resume screenings included in the ${getPlan(plan).name} plan this month. Upgrade for more capacity.`,
      'screening_limit_reached'
    )
  }

  // 2. Prepare resume text — combine the extracted resume content with
  // the structured application fields, so the AI has full context even
  // if PDF/DOCX text extraction came back thin or empty.
  const applicationContext = `
    Name: ${candidate.name}
    Email: ${candidate.email}
    ${candidate.location ? `Location: ${candidate.location}` : ''}
    ${candidate.years_experience ? `Years of experience: ${candidate.years_experience}` : ''}
    ${candidate.salary_expectation ? `Salary expectation: ${candidate.salary_expectation}` : ''}
    ${candidate.work_authorization ? `Work authorization: ${candidate.work_authorization}` : ''}
    ${candidate.linkedin_url ? `LinkedIn: ${candidate.linkedin_url}` : ''}
    ${candidate.portfolio_url ? `Portfolio: ${candidate.portfolio_url}` : ''}
    ${candidate.cover_note ? `Note from candidate: ${candidate.cover_note}` : ''}
  `.trim()

  const resumeText = candidate.resume_text
    ? `${applicationContext}\n\n--- RESUME CONTENT ---\n${candidate.resume_text}`
    : `${applicationContext}\n\n(Resume file was uploaded but text could not be extracted automatically — scoring based on application details only.)`

  // 3. AI Scoring via Groq
  let scoreResult
  try {
    scoreResult = await scoreResume(
      resumeText,
      candidate.job.title,
      candidate.job.description,
      candidate.job.requirements
    )
  } catch (err: unknown) {
    throw new Error(`AI scoring failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  const { score, reasoning, strengths, weaknesses } = scoreResult
  const decision: 'interview' | 'below_threshold' = score >= interviewThreshold ? 'interview' : 'below_threshold'

  // Count this screening against the org's monthly usage now that we know
  // it actually succeeded — a failed Groq call (caught above) never burns
  // quota the organization didn't get value from.
  await incrementScreeningCount(organizationId)

  // 4. Update candidate with AI score. Status becomes "screened" either
  // way at this point — below-threshold candidates STAY at "screened"
  // (not "rejected") until an HR user explicitly clicks Reject.
  await supabase
    .from('candidates')
    .update({
      score,
      reasoning,
      strengths,
      weaknesses,
      status: 'screened',
    })
    .eq('id', candidateId)

  let emailSent = false
  let schedulingLink: string | null = null
  let calError: string | undefined

  // 5. Decision Engine — interview track is still automatic; rejection
  // is NOT. A below-threshold score just leaves the candidate visible
  // to HR (status: "screened") with a "Reject" action available in the
  // dashboard. See /api/candidates/[id]/reject for that manual step.
  if (decision === 'interview') {
    // INTERVIEW FLOW — uses THIS organization's own Calendly connection
    try {
      const { link, error: schedulingError } = await createSchedulingLink(
        organizationId,
        candidate.name,
        candidate.email,
        candidate.job.title
      )

      schedulingLink = link
      calError = schedulingError

      // Store interview record (even without a link, so HR sees it pending
      // and gets a clear signal to connect/configure Calendly).
      await supabase
        .from('interviews')
        .insert({
          organization_id: organizationId,
          candidate_id: candidateId,
          job_id: candidate.job_id,
          scheduling_link: link,
          status: link ? 'pending' : 'pending',
        })

      // Only send the email if we actually have a working scheduling link.
      if (link) {
        const { id: emailId, error: emailError } = await sendInterviewInvite({
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          jobTitle: candidate.job.title,
          schedulingLink: link,
          companyName: organizationName,
          customSubject: emailOverrides?.interview_invite?.subject,
          customIntro: emailOverrides?.interview_invite?.intro,
        })

        if (!emailError && emailId) {
          emailSent = true

          await supabase.from('email_logs').insert({
            organization_id: organizationId,
            candidate_id: candidateId,
            email_type: 'interview_invite',
            to_email: candidate.email,
            subject: `Interview Invitation — ${candidate.job.title}`,
            resend_id: emailId,
            status: 'sent',
          })
        }
      } else {
        console.warn(
          `Skipped interview email for candidate ${candidateId}: ${schedulingError}`
        )
      }

      // Update candidate status regardless — HR can still see they qualified
      // even if scheduling needs manual follow-up because Calendly isn't connected.
      await supabase
        .from('candidates')
        .update({ status: 'interview' })
        .eq('id', candidateId)

    } catch (err: unknown) {
      console.error('Interview flow error:', err)
      calError = err instanceof Error ? err.message : 'Unknown scheduling error'
    }
  }
  // No "else" branch — below-threshold candidates are intentionally left
  // as-is for HR to review and manually reject (or override) in the dashboard.

  return {
    candidateId,
    score,
    decision,
    emailSent,
    schedulingLink,
    calError,
  }
}

/**
 * Runs the agent for every unscored ("applied") candidate in a job.
 * Jobs are already organization-scoped, so this naturally stays within
 * one tenant — it never needs to know the organizationId directly.
 *
 * "Priority AI processing" (Growth+) is implemented here concretely: a
 * Starter org gets a small artificial delay between each candidate in a
 * batch (gentler on shared rate limits), while Growth/Agency orgs process
 * back-to-back with no delay — a real, measurable difference in how fast
 * a big batch finishes, not just a cosmetic label.
 */
export async function runBatchAgent(jobId: string): Promise<{
  processed: number
  results: AgentResult[]
  errors: string[]
}> {
  const supabase = createAdminClient()

  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('id, organization:organizations(plan)')
    .eq('job_id', jobId)
    .eq('status', 'applied')

  if (error || !candidates) {
    throw new Error(`Failed to fetch candidates: ${error?.message}`)
  }

  const orgPlan: PlanId = (candidates[0]?.organization as unknown as { plan?: PlanId } | null)?.plan ?? 'starter'
  const isPriority = getPlan(orgPlan).features.priorityAiProcessing
  const delayMs = isPriority ? 0 : 500

  const results: AgentResult[] = []
  const errors: string[] = []

  for (const candidate of candidates) {
    try {
      const result = await runRecruitingAgent(candidate.id)
      results.push(result)
    } catch (err: unknown) {
      if (err instanceof PlanLimitError) {
        // Stop the whole batch the moment the org runs out of capacity —
        // continuing would just generate the same error for every
        // remaining candidate.
        errors.push(err.message)
        break
      }
      errors.push(`Candidate ${candidate.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return {
    processed: results.length,
    results,
    errors,
  }
}
