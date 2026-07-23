'use client'

import { useEffect, useState } from 'react'
import { usePlanStatus } from '@/lib/usePlanStatus'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import { Loader2, TrendingUp, Users, CheckCircle2, Briefcase } from 'lucide-react'

interface RoleStats {
  jobId: string
  title: string
  status: string
  applied: number
  screened: number
  interview: number
  offer: number
  rejected: number
  avgScore: number | null
  conversionToInterview: number
  conversionToOffer: number
}

interface AnalyticsData {
  perRole: RoleStats[]
  totals: {
    totalJobs: number
    activeJobs: number
    totalApplications: number
    totalScreened: number
    totalInterviews: number
    totalOffers: number
    totalRejected: number
    overallAvgScore: number | null
  }
  applicationsByDay: Record<string, number>
}

export default function AnalyticsPage() {
  const { status: planStatus, loading: planLoading } = usePlanStatus()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (planLoading) return
    if (planStatus && !planStatus.features.analyticsDashboard) {
      setLoading(false)
      return
    }
    fetchAnalytics()
  }, [planLoading, planStatus])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const res = await fetch('/api/analytics')
      const json = await res.json()
      if (res.ok) setData(json)
    } finally {
      setLoading(false)
    }
  }

  if (planLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (planStatus && !planStatus.features.analyticsDashboard) {
    return (
      <div className="animate-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-surface-400 text-sm mt-1">Applications per role and conversion rates</p>
        </div>
        <UpgradePrompt feature="Analytics dashboard" requiredPlan="Growth" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-surface-400">Failed to load analytics.</div>
  }

  const { totals, perRole } = data

  return (
    <div className="animate-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-surface-400 text-sm mt-1">Applications per role and conversion rates</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Active Jobs" value={totals.activeJobs} />
        <StatCard icon={Users} label="Total Applications" value={totals.totalApplications} />
        <StatCard icon={TrendingUp} label="Interviews" value={totals.totalInterviews} />
        <StatCard icon={CheckCircle2} label="Offers" value={totals.totalOffers} />
      </div>

      {totals.overallAvgScore !== null && (
        <div className="card p-5">
          <p className="text-xs text-surface-500 mb-1">Average AI Score (all scored candidates)</p>
          <p className="text-2xl font-bold text-white">{totals.overallAvgScore}<span className="text-surface-500 text-base font-normal"> / 100</span></p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Per-Role Breakdown</h2>
        {perRole.length === 0 ? (
          <div className="card p-8 text-center text-surface-500 text-sm">
            No jobs yet — post a role to see analytics here.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800 text-left text-xs text-surface-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium text-right">Applied</th>
                  <th className="px-4 py-3 font-medium text-right">Screened</th>
                  <th className="px-4 py-3 font-medium text-right">Interview</th>
                  <th className="px-4 py-3 font-medium text-right">Offer</th>
                  <th className="px-4 py-3 font-medium text-right">Avg Score</th>
                  <th className="px-4 py-3 font-medium text-right">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {perRole.map((role) => (
                  <tr key={role.jobId} className="border-b border-surface-800/50 last:border-0">
                    <td className="px-4 py-3 text-white font-medium">{role.title}</td>
                    <td className="px-4 py-3 text-right text-surface-300">{role.applied}</td>
                    <td className="px-4 py-3 text-right text-surface-300">{role.screened}</td>
                    <td className="px-4 py-3 text-right text-surface-300">{role.interview}</td>
                    <td className="px-4 py-3 text-right text-surface-300">{role.offer}</td>
                    <td className="px-4 py-3 text-right text-surface-300">{role.avgScore ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-emerald-400 font-medium">{role.conversionToInterview}%</span>
                      <span className="text-surface-600 text-xs"> to interview</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-brand-400" />
        <p className="text-xs text-surface-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
