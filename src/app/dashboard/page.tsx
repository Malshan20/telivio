import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, getScoreColor } from '@/lib/utils'
import {
  Briefcase, Users, CalendarCheck, TrendingUp,
  ArrowRight, Zap, Clock, CheckCircle2, XCircle,
} from 'lucide-react'

async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    // Mid-onboarding — no organization yet. Send them to set one up
    // instead of rendering an empty dashboard.
    redirect('/onboarding')
  }

  const orgId = profile.organization_id

  const [jobsRes, candidatesRes, interviewsRes] = await Promise.all([
    supabase.from('jobs').select('id, title, status, created_at').eq('organization_id', orgId),
    supabase.from('candidates').select('id, name, email, score, status, created_at, job:jobs(title)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(8),
    supabase.from('interviews').select('id, status, scheduled_time, candidate:candidates(name), job:jobs(title)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
  ])

  const jobs = jobsRes.data || []
  const candidates = candidatesRes.data || []
  const interviews = interviewsRes.data || []

  const scoredCandidates = candidates.filter((c) => c.score !== null)
  const avgScore = scoredCandidates.length
    ? Math.round(scoredCandidates.reduce((sum, c) => sum + (c.score || 0), 0) / scoredCandidates.length)
    : 0

  return {
    stats: {
      activeJobs: jobs.filter((j) => j.status === 'active').length,
      totalCandidates: candidates.length,
      interviews: candidates.filter((c) => c.status === 'interview').length,
      avgScore,
    },
    recentCandidates: candidates.slice(0, 6),
    recentInterviews: interviews,
    jobs,
  }
}

export default async function DashboardPage() {
  const { stats, recentCandidates, recentInterviews, jobs } = await getDashboardData()

  const statCards = [
    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-brand-400', bg: 'bg-brand-500/10' },
    { label: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'In Interview', value: stats.interviews, icon: CalendarCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Avg AI Score', value: `${stats.avgScore}/100`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="animate-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-surface-400 text-sm mt-1">AI recruiting agent overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-surface-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Candidates */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
            <h2 className="section-title">Recent Candidates</h2>
            <Link href="/dashboard/candidates" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-surface-800">
            {recentCandidates.length === 0 ? (
              <div className="px-5 py-10 text-center text-surface-500 text-sm">
                No candidates yet. <Link href="/dashboard/jobs" className="text-brand-400 hover:underline">Post a job</Link> to get started.
              </div>
            ) : (
              recentCandidates.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/candidates/${c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-surface-300">
                      {c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <p className="text-xs text-surface-500 truncate">{(c.job as any)?.title || 'Unknown Job'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.score !== null ? (
                      <span className={`text-sm font-bold ${getScoreColor(c.score)}`}>
                        {c.score}
                      </span>
                    ) : (
                      <span className="text-xs text-surface-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Scoring...
                      </span>
                    )}
                    <StatusDot status={c.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-4">
          {/* Pipeline summary */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Pipeline</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Applied', count: recentCandidates.filter(c => c.status === 'applied').length, color: 'bg-surface-600' },
                { label: 'Screened', count: recentCandidates.filter(c => c.status === 'screened').length, color: 'bg-blue-500' },
                { label: 'Interview', count: recentCandidates.filter(c => c.status === 'interview').length, color: 'bg-brand-500' },
                { label: 'Offer', count: recentCandidates.filter(c => c.status === 'offer').length, color: 'bg-emerald-500' },
                { label: 'Rejected', count: recentCandidates.filter(c => c.status === 'rejected').length, color: 'bg-red-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
                  <span className="text-sm text-surface-400 flex-1">{label}</span>
                  <span className="text-sm font-semibold text-white">{count}</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/pipeline" className="btn-secondary w-full mt-4 flex items-center justify-center gap-2 text-center">
              View Kanban <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Active jobs */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Active Jobs</h3>
              <Link href="/dashboard/jobs" className="text-xs text-brand-400 hover:text-brand-300">
                Manage
              </Link>
            </div>
            {jobs.filter(j => j.status === 'active').slice(0, 4).length === 0 ? (
              <p className="text-xs text-surface-500 text-center py-4">No active jobs</p>
            ) : (
              <div className="space-y-2">
                {jobs.filter(j => j.status === 'active').slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/jobs/${job.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-800 transition-colors"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                    <span className="text-sm text-surface-300 truncate">{job.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Agent status */}
          <div className="card p-5 border-brand-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <h3 className="text-sm font-semibold text-white">AI Agent</h3>
            </div>
            <p className="text-xs text-surface-400">
              Autonomous agent is active. New candidate applications are automatically scored and routed.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-brand-400">
              <Zap className="w-3.5 h-3.5" />
              Powered by Groq LLaMA 3
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    applied: 'bg-surface-500',
    screened: 'bg-blue-400',
    interview: 'bg-brand-400',
    offer: 'bg-emerald-400',
    rejected: 'bg-red-400',
  }
  return <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-surface-500'}`} />
}
