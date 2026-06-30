import { Lock } from 'lucide-react'
import Link from 'next/link'

export default function UpgradePrompt({
  feature,
  requiredPlan = 'Growth',
}: {
  feature: string
  requiredPlan?: 'Growth' | 'Agency'
}) {
  return (
    <div className="card p-6 text-center border-dashed">
      <div className="w-10 h-10 bg-brand-600/15 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Lock className="w-5 h-5 text-brand-400" />
      </div>
      <p className="text-sm font-medium text-white mb-1">{feature} is a {requiredPlan} feature</p>
      <p className="text-xs text-surface-500 mb-4">
        Upgrade your plan to unlock this and other {requiredPlan === 'Agency' ? 'agency-level' : 'growth'} features.
      </p>
      <Link href="/dashboard/billing" className="btn-primary inline-flex items-center gap-2">
        View plans
      </Link>
    </div>
  )
}
