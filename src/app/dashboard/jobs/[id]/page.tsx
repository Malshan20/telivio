'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Job, Candidate } from '@/types'
import { formatDate, getScoreColor, getScoreBg, getStatusConfig, exportToCSV } from '@/lib/utils'
import {
  ArrowLeft, Users, Zap, Download, ExternalLink, Loader2,
  Bot, ChevronRight, Clock, CheckCircle2, Share2, XCircle,
} from 'lucide-react'
import ShareJobModal from '@/components/jobs/ShareJobModal'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  useEffect(() => {
    fetchJob()
  }, [jobId])

  async function fetchJob() {
    setLoading(true)
    try {
      const [jobRes, candRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}`),
        fetch(`/api/candidates?jobId=${jobId}`),
      ])
      const jobData = await jobRes.json()
      const candData = await candRes.json()
      setJob(jobData)
      setCandidates(candData)
    } catch {
      toast.error('Failed to load job')
    } finally {
      setLoading(false)
    }
  }

  async function runBatchAgent() {
    setRunning(true)
    try {
      const res = await fetch('/api/agent/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, batch: true }),
      })
      const data = await res.json()
      toast.success(`Processed ${data.processed} candidates`)
      fetchJob()
    } catch {
      toast.error('Agent failed')
    } finally {
      setRunning(false)
    }
  }

  async function rejectCandidate(candidateId: string) {
    const target = candidates.find((c) => c.id === candidateId)
    if (!confirm(`Send a rejection email to ${target?.name || 'this candidate'} and mark them as rejected? This cannot be undone.`)) {
      return
    }
    setRejectingId(candidateId)
    try {
      const res = await fetch(`/api/candidates/${candidateId}/reject`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject candidate')
      toast.success(data.emailSent ? 'Candidate rejected — email sent' : 'Candidate rejected (email failed to send)')
      setSelectedCandidate(null)
      fetchJob()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject candidate')
    } finally {
      setRejectingId(null)
    }
  }

  function handleExport() {
    const exportData = candidates.map((c) => ({
      Name: c.name,
      Email: c.email,
      Score: c.score ?? 'Pending',
      Status: c.status,
      Reasoning: c.reasoning ?? '',
      Strengths: (c.strengths || []).join('; '),
      Weaknesses: (c.weaknesses || []).join('; '),
      Applied: formatDate(c.created_at),
    }))
    exportToCSV(exportData, `candidates-${job?.title || jobId}`)
  }

  const pending = candidates.filter((c) => c.status === 'applied').length
  const screened = candidates.filter((c) => c.score !== null).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (!job) {
    return <div className="text-surface-400">Job not found.</div>
  }

  return (
    <div className="animate-in space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/jobs" className="text-surface-500 hover:text-white flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Jobs
        </Link>
        <span className="text-surface-700">/</span>
        <span className="text-surface-300 text-sm">{job.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{job.title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {job.department && <span className="text-sm text-surface-400">{job.department}</span>}
            {job.location && <span className="text-sm text-surface-500">{job.location}</span>}
            <span className={`badge ${job.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-700 text-surface-400'}`}>
              {job.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {job.status === 'active' && (
            <button onClick={() => setShowShare(true)} className="btn-secondary flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share / Apply Link
            </button>
          )}
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          {pending > 0 && (
            <button
              onClick={runBatchAgent}
              disabled={running}
              className="btn-primary flex items-center gap-2"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {running ? 'Scoring...' : `Score ${pending} Pending`}
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: candidates.length },
          { label: 'Pending', value: pending },
          { label: 'Scored', value: screened },
          { label: 'Interviews', value: candidates.filter((c) => c.status === 'interview').length },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-surface-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Candidate list */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between">
            <h2 className="section-title">Candidates</h2>
            <span className="text-xs text-surface-500">{candidates.length} total</span>
          </div>
          <div className="divide-y divide-surface-800 max-h-[600px] overflow-y-auto">
            {candidates.length === 0 ? (
              <div className="px-5 py-12 text-center text-surface-500 text-sm">
                <Users className="w-8 h-8 mx-auto mb-3 text-surface-700" />
                No candidates yet
              </div>
            ) : (
              candidates.map((c) => {
                const status = getStatusConfig(c.status)
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCandidate(selectedCandidate?.id === c.id ? null : c)}
                    className={`w-full flex items-center gap-4 px-5 py-3.5 hover:bg-surface-800/50 transition-colors text-left ${
                      selectedCandidate?.id === c.id ? 'bg-surface-800/50' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-surface-300">
                        {c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-surface-500 truncate">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {c.score !== null ? (
                        <div className={`px-2 py-1 rounded-lg border text-xs font-bold ${getScoreBg(c.score)} ${getScoreColor(c.score)}`}>
                          {c.score}
                        </div>
                      ) : (
                        <span className="text-surface-600 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      <span className={`badge text-xs ${status.color}`}>{status.label}</span>
                      <ChevronRight className={`w-4 h-4 text-surface-600 transition-transform ${selectedCandidate?.id === c.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* AI Reasoning panel */}
        <div className="lg:col-span-2">
          {selectedCandidate ? (
            <div className="card p-5 space-y-4 sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{selectedCandidate.name}</h3>
                <Link
                  href={`/dashboard/candidates/${selectedCandidate.id}`}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  Full Profile <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {selectedCandidate.score !== null ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl font-bold ${getScoreColor(selectedCandidate.score)}`}>
                      {selectedCandidate.score}
                      <span className="text-base font-normal text-surface-500">/100</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-brand-400 mb-1">
                        <Zap className="w-3 h-3" /> AI Score
                      </div>
                      <div className="w-32 h-2 bg-surface-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${selectedCandidate.score && selectedCandidate.score >= 75 ? 'bg-emerald-500' : selectedCandidate.score && selectedCandidate.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${selectedCandidate.score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedCandidate.reasoning && (
                    <div>
                      <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Reasoning</p>
                      <p className="text-sm text-surface-300 leading-relaxed">{selectedCandidate.reasoning}</p>
                    </div>
                  )}

                  {selectedCandidate.strengths && selectedCandidate.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Strengths</p>
                      <ul className="space-y-1.5">
                        {selectedCandidate.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedCandidate.weaknesses && selectedCandidate.weaknesses.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Gaps</p>
                      <ul className="space-y-1.5">
                        {selectedCandidate.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                            <span className="w-3.5 h-3.5 rounded-full border border-red-400/50 flex-shrink-0 mt-0.5" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedCandidate.status !== 'rejected' && selectedCandidate.status !== 'offer' && (
                    <button
                      onClick={() => rejectCandidate(selectedCandidate.id)}
                      disabled={rejectingId === selectedCandidate.id}
                      className="btn-danger w-full flex items-center justify-center gap-2"
                    >
                      {rejectingId === selectedCandidate.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {rejectingId === selectedCandidate.id ? 'Sending...' : 'Reject Candidate'}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <Bot className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                  <p className="text-sm text-surface-500">AI scoring in progress...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Bot className="w-10 h-10 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-400 text-sm font-medium">Select a candidate</p>
              <p className="text-surface-600 text-xs mt-1">View AI score and reasoning</p>
            </div>
          )}
        </div>
      </div>

      {showShare && (
        <ShareJobModal
          jobId={job.id}
          jobTitle={job.title}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
