'use client'

import { useEffect, useState } from 'react'
import type { PlanId, PlanStatus } from '@/lib/plans'

export interface PlanStatusResponse {
  plan: PlanId
  planStatus: PlanStatus
  hasAccess: boolean
  role: 'hr' | 'admin' | 'owner'
  trialDaysRemaining: number
  features: {
    bulkResumeUpload: boolean
    customEmailTemplates: boolean
    candidateNotes: boolean
    priorityAiProcessing: boolean
    analyticsDashboard: boolean
    multipleWorkspaces: boolean
    whiteLabel: boolean
  }
  limits: {
    maxActiveJobs: number | null
    maxScreeningsPerMonth: number | null
  }
}

/**
 * Fetches the current organization's plan/feature state for client
 * components — used to show/hide Growth+/Agency-only UI (Notes panel,
 * Analytics nav link, white-label settings, etc) and trial-status banners.
 */
export function usePlanStatus() {
  const [status, setStatus] = useState<PlanStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/billing/plan-status')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setStatus(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { status, loading }
}
