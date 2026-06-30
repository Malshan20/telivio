export type PlanId = 'starter' | 'growth' | 'agency'
export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'trial_expired'

export interface PlanDefinition {
  id: PlanId
  name: string
  priceMonthly: number
  tagline: string
  maxActiveJobs: number | null // null = unlimited
  maxScreeningsPerMonth: number | null // null = unlimited
  features: {
    bulkResumeUpload: boolean
    customEmailTemplates: boolean
    candidateNotes: boolean
    priorityAiProcessing: boolean
    analyticsDashboard: boolean
    multipleWorkspaces: boolean
    whiteLabel: boolean
  }
  supportLabel: string
  highlights: string[]
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    tagline: 'For small businesses and founders doing their own hiring',
    maxActiveJobs: 3,
    maxScreeningsPerMonth: 100,
    features: {
      bulkResumeUpload: false,
      customEmailTemplates: false,
      candidateNotes: false,
      priorityAiProcessing: false,
      analyticsDashboard: false,
      multipleWorkspaces: false,
      whiteLabel: false,
    },
    supportLabel: 'Email support',
    highlights: [
      '3 active job postings',
      'Up to 100 resume screenings/month',
      'AI scoring with written reasoning',
      'Automated invite & rejection emails',
      'Cal.com interview scheduling',
      'Kanban pipeline',
      'CSV export',
      'Email support',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 99,
    tagline: 'For growing startups hiring across multiple roles at once',
    maxActiveJobs: 10,
    maxScreeningsPerMonth: 500,
    features: {
      bulkResumeUpload: true,
      customEmailTemplates: true,
      candidateNotes: true,
      priorityAiProcessing: true,
      analyticsDashboard: true,
      multipleWorkspaces: false,
      whiteLabel: false,
    },
    supportLabel: 'Chat support',
    highlights: [
      'Everything in Starter, plus:',
      '10 active job postings',
      'Up to 500 resume screenings/month',
      'Bulk resume upload',
      'Custom email templates',
      'Candidate notes & comments',
      'Priority AI processing',
      'Analytics dashboard',
      'Chat support',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    priceMonthly: 199,
    tagline: 'For recruitment agencies managing hiring for multiple clients',
    maxActiveJobs: null,
    maxScreeningsPerMonth: null,
    features: {
      bulkResumeUpload: true,
      customEmailTemplates: true,
      candidateNotes: true,
      priorityAiProcessing: true,
      analyticsDashboard: true,
      multipleWorkspaces: true,
      whiteLabel: true,
    },
    supportLabel: 'Priority support — 24hr response',
    highlights: [
      'Everything in Growth, plus:',
      'Unlimited job postings',
      'Unlimited resume screenings',
      'Multiple client workspaces',
      'White-label branding',
      'Priority support — 24hr response',
    ],
  },
}

export const TRIAL_DAYS = 14

export function getPlan(planId: string | null | undefined): PlanDefinition {
  if (planId && planId in PLANS) return PLANS[planId as PlanId]
  return PLANS.starter
}

const PLAN_RANK: Record<PlanId, number> = { starter: 0, growth: 1, agency: 2 }

export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return PLAN_RANK[to] > PLAN_RANK[from]
}

export interface OrgBillingState {
  plan: PlanId
  plan_status: PlanStatus
  trial_ends_at: string | null
}

/**
 * Whether the organization currently has paid-feature access — either an
 * active paid subscription, or still inside their 14-day trial window.
 * Used to gate job creation / screening / dashboard access at the point of
 * action, not just to display a banner.
 */
export function hasActiveAccess(org: OrgBillingState): boolean {
  if (org.plan_status === 'active') return true
  if (org.plan_status === 'trialing' && org.trial_ends_at) {
    return new Date(org.trial_ends_at).getTime() > Date.now()
  }
  return false
}

export function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
