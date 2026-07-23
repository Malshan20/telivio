import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import { hasActiveAccess, trialDaysRemaining } from '@/lib/plans'
import { Clock, AlertTriangle } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(plan, plan_status, trial_ends_at)')
    .eq('id', user.id)
    .single()

  // Belt-and-suspenders: middleware already enforces this, but a layout
  // is also a safe place to guard against any edge case (e.g. SSR cache).
  if (!profile?.organization_id) redirect('/onboarding')

  const org = profile.organization as unknown as { plan: string; plan_status: string; trial_ends_at: string | null } | null
  const billingState = org
    ? { plan: org.plan as 'starter' | 'growth' | 'agency', plan_status: org.plan_status as any, trial_ends_at: org.trial_ends_at }
    : null

  const isTrialing = billingState?.plan_status === 'trialing'
  const daysLeft = isTrialing ? trialDaysRemaining(billingState.trial_ends_at) : 0
  const showTrialBanner = isTrialing && daysLeft <= 7
  const isLocked = billingState ? !hasActiveAccess(billingState) : false

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar user={profile || { id: user.id, email: user.email || '', role: 'hr', created_at: '' }} />
      <main className="flex-1 overflow-y-auto">
        {isLocked && (
          <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-2.5 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">
              Your trial has ended. <Link href="/dashboard/billing" className="underline font-medium hover:text-red-200">Upgrade now</Link> to keep posting jobs and screening candidates.
            </p>
          </div>
        )}
        {!isLocked && showTrialBanner && (
          <div className="bg-brand-500/10 border-b border-brand-500/30 px-6 py-2.5 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <p className="text-sm text-surface-300">
              <strong className="text-white">{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong> left in your free trial.{' '}
              <Link href="/dashboard/billing" className="underline font-medium text-brand-400 hover:text-brand-300">Choose a plan</Link>
            </p>
          </div>
        )}
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
