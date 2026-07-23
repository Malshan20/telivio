'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { Job } from '@/types'
import {
  Plus, Briefcase, Users, ChevronRight, Search,
  MoreVertical, Archive, Trash2, Eye, Zap, Share2,
} from 'lucide-react'
import CreateJobModal from '@/components/jobs/CreateJobModal'
import ShareJobModal from '@/components/jobs/ShareJobModal'

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [shareJob, setShareJob] = useState<Job | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'closed'>('all')

  useEffect(() => {
    fetchJobs()
  }, [])

  async function fetchJobs() {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(data)
    } catch {
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  async function updateJobStatus(jobId: string, status: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success('Job updated')
      fetchJobs()
    } catch {
      toast.error('Failed to update job')
    }
  }

  async function deleteJob(jobId: string) {
    if (!confirm('Delete this job? All associated candidates will be removed.')) return
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Job deleted')
      fetchJobs()
    } catch {
      toast.error('Failed to delete job')
    }
  }

  const filtered = jobs
    .filter((j) => filter === 'all' || j.status === filter)
    .filter((j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.department?.toLowerCase().includes(search.toLowerCase()))

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-500/10 text-emerald-400',
      paused: 'bg-amber-500/10 text-amber-400',
      closed: 'bg-surface-700 text-surface-400',
    }
    return `badge ${map[status] || map.closed}`
  }

  return (
    <div className="animate-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-surface-400 text-sm mt-1">{jobs.length} total positions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            className="input pl-9"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-surface-800 rounded-lg p-1">
          {(['all', 'active', 'paused', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                filter === s
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-surface-800 rounded w-3/4 mb-3" />
              <div className="h-3 bg-surface-800 rounded w-1/2 mb-6" />
              <div className="h-3 bg-surface-800 rounded w-full mb-2" />
              <div className="h-3 bg-surface-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Briefcase className="w-10 h-10 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400 font-medium">No jobs found</p>
          <p className="text-surface-600 text-sm mt-1 mb-5">
            {search ? 'Try a different search term' : 'Create your first job opening'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
              <Plus className="w-4 h-4 mr-2 inline" /> Create Job
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onStatusChange={updateJobStatus}
              onDelete={deleteJob}
              onShare={setShareJob}
              statusBadge={statusBadge}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onCreated={(job) => { setShowCreate(false); fetchJobs(); setShareJob(job) }}
        />
      )}

      {shareJob && (
        <ShareJobModal
          jobId={shareJob.id}
          jobTitle={shareJob.title}
          onClose={() => setShareJob(null)}
        />
      )}
    </div>
  )
}

function JobCard({
  job, onStatusChange, onDelete, onShare, statusBadge,
}: {
  job: Job
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onShare: (job: Job) => void
  statusBadge: (status: string) => string
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const candidateCount = (job as any).candidates?.[0]?.count || 0

  return (
    <div className="card p-5 flex flex-col gap-4 hover:border-surface-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{job.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {job.department && (
              <span className="text-xs text-surface-500">{job.department}</span>
            )}
            {job.location && (
              <>
                <span className="text-surface-700">·</span>
                <span className="text-xs text-surface-500">{job.location}</span>
              </>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 rounded-lg hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-white transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-surface-800 border border-surface-700 rounded-xl shadow-panel z-10 py-1">
              <Link
                href={`/dashboard/jobs/${job.id}`}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <Eye className="w-3.5 h-3.5" /> View Details
              </Link>
              <button
                onClick={() => { onShare(job); setMenuOpen(false) }}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-white transition-colors w-full text-left"
              >
                <Share2 className="w-3.5 h-3.5" /> Copy Apply Link
              </button>
              <button
                onClick={() => { onStatusChange(job.id, job.status === 'active' ? 'paused' : 'active'); setMenuOpen(false) }}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-white transition-colors w-full text-left"
              >
                <Archive className="w-3.5 h-3.5" />
                {job.status === 'active' ? 'Pause Job' : 'Activate Job'}
              </button>
              <button
                onClick={() => { onDelete(job.id); setMenuOpen(false) }}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-surface-500 line-clamp-2">{job.description}</p>

      <div className="flex items-center justify-between pt-2 border-t border-surface-800">
        <div className="flex items-center gap-3">
          <span className={statusBadge(job.status)}>{job.status}</span>
          <span className="flex items-center gap-1 text-xs text-surface-500">
            <Users className="w-3.5 h-3.5" /> {candidateCount}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {job.status === 'active' && (
            <button
              onClick={() => onShare(job)}
              className="text-xs text-surface-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          )}
          <Link
            href={`/dashboard/jobs/${job.id}`}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
          >
            View <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
