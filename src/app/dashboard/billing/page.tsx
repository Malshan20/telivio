'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { PLANS, type PlanId } from '@/lib/plans'
import {
  Loader2, CheckCircle2, ExternalLink, Clock, AlertTriangle, Sparkles,
} from 'lucide-react'

interface UsageData {
  plan: PlanId
  planName: string
  planStatus: string
  hasAccess: boolean
  trialDaysRemaining: number
  trialEndsAt: string | null
  role: 'hr' | 'admin' | 'owner'
  usage: {
    activeJobs: number
    maxActiveJobs: number | null
    screeningsUsed: number
    maxScreeningsPerMonth: number | null
  }
}

function BillingContent() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOutPlan, setCheckingOutPlan] = useState<PlanId | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    fetchUsage()

    const checkoutSuccess = searchParams.get('checkout_success')
    const error = searchParams.get('error')
    const detail = searchParams.get('detail')

    if (checkoutSuccess) {
      toast.success('Subscription active! Thanks for upgrading.')
    } else if (error) {
      const messages: Record<string, string> = {
        insufficient_permissions: 'Only the workspace owner can manage billing.',
        invalid_plan: 'That plan doesn\'t exist.',
        org_not_found: 'Could not find your organization.',
        checkout_failed: detail ? `Checkout failed: ${detail}` : 'Failed to start checkout. Try again.',
        no_subscription_yet: 'Subscribe to a plan first to manage billing.',
        portal_failed: 'Failed to open the billing portal. Try again.',
      }
      toast.error(messages[error] || 'Something went wrong', { duration: 8000 })
    }
  }, [searchParams])

  async function fetchUsage() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/usage')
      const json = await res.json()
      if (res.ok) setData(json)
    } finally {
      setLoading(false)
    }
  }

  function startCheckout(plan: PlanId) {
    setCheckingOutPlan(plan)
    window.location.href = `/api/billing/checkout?plan=${plan}`
  }

  function openPortal() {
    setOpeningPortal(true)
    window.location.href = '/api/billing/portal'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-surface-400">Failed to load billing information.</div>
  }

  const isOwner = data.role === 'owner'
  const isTrialing = data.planStatus === 'trialing'
  const isPastDue = data.planStatus === 'past_due'
  const isCanceled = data.planStatus === 'canceled' || data.planStatus === 'trial_expired'

  return (
    <div className="animate-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Plan</h1>
        <p className="text-surface-400 text-sm mt-1">Manage your subscription and usage</p>
      </div>

      {isTrialing && (
        <div className="card p-4 border-brand-500/30 bg-brand-500/5 flex items-center gap-3">
          <Clock className="w-5 h-5 text-brand-400 flex-shrink-0" />
          <p className="text-sm text-surface-300">
            <strong className="text-white">{data.trialDaysRemaining} day{data.trialDaysRemaining === 1 ? '' : 's'}</strong> left in your free trial of the {data.planName} plan. No credit card required until you decide to subscribe.
          </p>
        </div>
      )}
      {isPastDue && (
        <div className="card p-4 border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-surface-300">
            Your last payment failed. Update your payment method to avoid losing access.
          </p>
        </div>
      )}
      {isCanceled && (
        <div className="card p-4 border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-surface-300">
            Your trial has ended or your subscription was canceled. Subscribe below to keep using Telivio.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-surface-500 mb-1">Current Plan</p>
          <p className="text-xl font-bold text-white">{data.planName}</p>
          <p className="text-xs text-surface-500 mt-1 capitalize">{data.planStatus.replace('_', ' ')}</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-surface-500 mb-1">Active Jobs</p>
          <p className="text-xl font-bold text-white">
            {data.usage.activeJobs}
            <span className="text-surface-500 text-sm font-normal"> / {data.usage.maxActiveJobs ?? '∞'}</span>
          </p>
          {data.usage.maxActiveJobs && (
            <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${Math.min(100, (data.usage.activeJobs / data.usage.maxActiveJobs) * 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="text-xs text-surface-500 mb-1">Screenings This Month</p>
          <p className="text-xl font-bold text-white">
            {data.usage.screeningsUsed}
            <span className="text-surface-500 text-sm font-normal"> / {data.usage.maxScreeningsPerMonth ?? '∞'}</span>
          </p>
          {data.usage.maxScreeningsPerMonth && (
            <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${Math.min(100, (data.usage.screeningsUsed / data.usage.maxScreeningsPerMonth) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {isOwner && data.planStatus === 'active' && (
        <button onClick={openPortal} disabled={openingPortal} className="btn-secondary flex items-center gap-2">
          {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          Manage billing & invoices
        </button>
      )}

      {!isOwner && (
        <p className="text-xs text-surface-500">
          Only the workspace owner can change plans or manage billing.
        </p>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {data.planStatus === 'active' ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.values(PLANS).map((plan) => {
            const isCurrent = plan.id === data.plan && data.planStatus === 'active'
            return (
              <div
                key={plan.id}
                className={`card p-6 flex flex-col ${plan.id === 'growth' ? 'border-brand-500/40' : ''}`}
              >
                {plan.id === 'growth' && (
                  <span className="badge bg-brand-500/10 text-brand-400 w-fit mb-3">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-surface-500 mt-1 mb-4">{plan.tagline}</p>
                <div className="mb-5">
                  <span className="text-3xl font-bold text-white">${plan.priceMonthly}</span>
                  <span className="text-surface-500 text-sm">/month</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                      {h.startsWith('Everything in') ? (
                        <span className="text-xs text-surface-500 italic">{h}</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          {h}
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => startCheckout(plan.id)}
                  disabled={!isOwner || isCurrent || checkingOutPlan !== null}
                  className={isCurrent ? 'btn-secondary' : 'btn-primary'}
                >
                  {checkingOutPlan === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    `${isTrialing || isCanceled ? 'Subscribe' : 'Switch'} to ${plan.name}`
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="text-surface-500 text-sm">Loading billing…</div>}>
      <BillingContent />
    </Suspense>
  )
}
