'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CheckCircle2, Loader2, AlertTriangle, ArrowRight } from 'lucide-react'

type VerifyState = 'verifying' | 'succeeded' | 'processing_timeout' | 'not_completed' | 'error'

const MAX_ATTEMPTS = 6
const POLL_DELAY_MS = 1500

/**
 * Landing page Polar redirects to right after checkout, carrying the real
 * checkout_id (Polar substitutes {CHECKOUT_ID} in the success URL). This
 * calls /api/billing/verify-checkout, which fetches the checkout from Polar
 * directly and updates the organization's plan immediately — no webhook
 * required for this to work.
 *
 * Polar's own guidance is that a success redirect alone isn't a fully
 * reliable fulfillment signal (a closed tab means this page never runs),
 * so the existing webhook route is left in place untouched as a backup —
 * this page just makes the common case (customer stays on the page)
 * instant instead of waiting on webhook delivery.
 */
function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const checkoutId = searchParams.get('checkout_id')

  const [state, setState] = useState<VerifyState>('verifying')
  const [message, setMessage] = useState('')
  const attemptRef = useRef(0)
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (!checkoutId) {
      setState('error')
      setMessage('No checkout reference was provided in the URL.')
      return
    }
    // Guard against React StrictMode / effect re-run double-firing the
    // first verification attempt in development.
    if (hasRunRef.current) return
    hasRunRef.current = true

    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutId])

  async function verify() {
    try {
      const res = await fetch('/api/billing/verify-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setState('error')
        setMessage(data.error || 'Failed to verify checkout')
        return
      }

      if (data.status === 'succeeded') {
        setState('succeeded')
        toast.success('Subscription activated!')
        setTimeout(() => {
          router.push('/dashboard/billing')
          router.refresh()
        }, 2000)
        return
      }

      if (data.status === 'processing' || data.status === 'pending') {
        attemptRef.current += 1
        if (attemptRef.current < MAX_ATTEMPTS) {
          setTimeout(verify, POLL_DELAY_MS)
        } else {
          setState('processing_timeout')
          setMessage(data.message || 'Payment is taking longer than expected to confirm.')
        }
        return
      }

      // failed / expired
      setState('not_completed')
      setMessage(data.message || 'Payment was not completed.')
    } catch (err: unknown) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong verifying your payment')
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card p-8 max-w-md w-full text-center">
        {state === 'verifying' && (
          <>
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-white mb-2">Confirming your payment…</h1>
            <p className="text-sm text-surface-400">This usually takes just a couple of seconds.</p>
          </>
        )}

        {state === 'succeeded' && (
          <>
            <div className="w-14 h-14 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-lg font-semibold text-white mb-2">You're all set!</h1>
            <p className="text-sm text-surface-400">Your subscription is active. Redirecting you to Billing…</p>
          </>
        )}

        {(state === 'processing_timeout' || state === 'error' || state === 'not_completed') && (
          <>
            <div className="w-14 h-14 bg-amber-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-lg font-semibold text-white mb-2">
              {state === 'not_completed' ? 'Payment not completed' : 'Still working on it'}
            </h1>
            <p className="text-sm text-surface-400 mb-6">{message}</p>
            <button onClick={() => router.push('/dashboard/billing')} className="btn-primary inline-flex items-center gap-2">
              Go to Billing <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-surface-500 text-sm">Loading…</div>}>
      <BillingSuccessContent />
    </Suspense>
  )
}
