'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Candidate, Note } from '@/types'
import { formatDate, formatDateTime, getScoreColor, getScoreBg, getStatusConfig } from '@/lib/utils'
import { usePlanStatus } from '@/lib/usePlanStatus'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import {
  ArrowLeft, Zap, Calendar, Mail, Phone, Link2,
  Globe, CheckCircle2, Send, Loader2, Bot, Plus, Trash2,
  ExternalLink, Award, MapPin, DollarSign, Globe2, FileText, Download, XCircle,
} from 'lucide-react'

export default function CandidateProfilePage() {
  const params = useParams()
  const candidateId = params.id as string
  const { status: planStatus } = usePlanStatus()

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [rescoring, setRescoring] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [loadingResume, setLoadingResume] = useState(false)

  useEffect(() => { fetchCandidate() }, [candidateId])

  async function fetchCandidate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/candidates/${candidateId}`)
      const data = await res.json()
      setCandidate(data)
      if (data?.resume_url) {
        loadResumeUrl()
      }
    } catch {
      toast.error('Failed to load candidate')
    } finally {
      setLoading(false)
    }
  }

  async function loadResumeUrl() {
    setLoadingResume(true)
    try {
      const res = await fetch(`/api/candidates/resume-url?candidateId=${candidateId}`)
      const data = await res.json()
      if (res.ok) setResumeUrl(data.url)
    } catch {
      // Non-fatal — the rest of the profile still renders without a viewer link.
    } finally {
      setLoadingResume(false)
    }
  }

  async function updateStatus(status: string) {
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      toast.success('Status updated')
      fetchCandidate()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  async function addNote() {
    if (!note.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch('/api/candidates/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, note }),
      })
      if (!res.ok) throw new Error()
      toast.success('Note added')
      setNote('')
      fetchCandidate()
    } catch {
      toast.error('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  async function scheduleInterview() {
    setScheduling(true)
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, job_id: candidate?.job_id, sendEmail: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to schedule interview')
      toast.success('Interview scheduled and email sent!')
      fetchCandidate()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule interview')
    } finally {
      setScheduling(false)
    }
  }

  async function runAgent() {
    setRescoring(true)
    try {
      const res = await fetch('/api/agent/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scoring failed')
      toast.success('AI scoring complete!')
      fetchCandidate()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Scoring failed')
    } finally {
      setRescoring(false)
    }
  }

  async function rejectCandidate() {
    if (!confirm(`Send a rejection email to ${candidate?.name} and mark them as rejected? This cannot be undone.`)) {
      return
    }
    setRejecting(true)
    try {
      const res = await fetch(`/api/candidates/${candidateId}/reject`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject candidate')
      toast.success(data.emailSent ? 'Candidate rejected — email sent' : 'Candidate rejected (email failed to send)')
      fetchCandidate()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject candidate')
    } finally {
      setRejecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (!candidate) return <div className="text-surface-400">Candidate not found.</div>

  const status = getStatusConfig(candidate.status)
  const interview = (candidate.interviews as any[])?.[0]

  return (
    <div className="animate-in space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/candidates" className="text-surface-500 hover:text-white flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Candidates
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile */}
        <div className="space-y-4">
          {/* Identity card */}
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-brand-400">
                  {candidate.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white text-lg">{candidate.name}</h2>
                <span className={`badge mt-1 ${status.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0" /> {candidate.email}
              </a>
              {candidate.phone && (
                <div className="flex items-center gap-2 text-sm text-surface-400">
                  <Phone className="w-4 h-4 flex-shrink-0" /> {candidate.phone}
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2 text-sm text-surface-400">
                  <MapPin className="w-4 h-4 flex-shrink-0" /> {candidate.location}
                </div>
              )}
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors">
                  <Link2 className="w-4 h-4 flex-shrink-0" /> LinkedIn Profile
                </a>
              )}
              {candidate.portfolio_url && (
                <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors">
                  <Globe className="w-4 h-4 flex-shrink-0" /> Portfolio
                </a>
              )}
            </div>

            {(candidate.salary_expectation || candidate.years_experience || candidate.work_authorization || candidate.earliest_start_date) && (
              <div className="mt-4 pt-4 border-t border-surface-800 space-y-2">
                {candidate.salary_expectation && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 flex-shrink-0 text-surface-500" />
                    <span className="text-surface-500">Salary:</span>
                    <span className="text-surface-300">{candidate.salary_expectation}</span>
                  </div>
                )}
                {candidate.years_experience && (
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 flex-shrink-0 text-surface-500" />
                    <span className="text-surface-500">Experience:</span>
                    <span className="text-surface-300">{candidate.years_experience} years</span>
                  </div>
                )}
                {candidate.earliest_start_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-surface-500" />
                    <span className="text-surface-500">Start date:</span>
                    <span className="text-surface-300">{formatDate(candidate.earliest_start_date)}</span>
                  </div>
                )}
                {candidate.work_authorization && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe2 className="w-4 h-4 flex-shrink-0 text-surface-500" />
                    <span className="text-surface-500">Authorization:</span>
                    <span className="text-surface-300 capitalize">{candidate.work_authorization.replace(/_/g, ' ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Applied job */}
          {(candidate.job as any) && (
            <div className="card p-4">
              <p className="text-xs text-surface-500 mb-1">Applied for</p>
              <Link
                href={`/dashboard/jobs/${candidate.job_id}`}
                className="text-sm font-medium text-white hover:text-brand-400 transition-colors flex items-center gap-1"
              >
                {(candidate.job as any).title} <ExternalLink className="w-3 h-3" />
              </Link>
              <p className="text-xs text-surface-500 mt-1">{formatDate(candidate.created_at)}</p>
            </div>
          )}

          {/* Status control */}
          <div className="card p-4">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">Move to Stage</p>
            <p className="text-xs text-surface-600 mb-3">
              Rejection is handled separately below — it sends an email automatically.
            </p>
            <div className="space-y-1.5">
              {(['applied', 'screened', 'interview', 'offer'] as const).map((s) => {
                const sc = getStatusConfig(s)
                return (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      candidate.status === s
                        ? 'bg-surface-700 text-white font-medium'
                        : 'text-surface-400 hover:bg-surface-800 hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {interview?.scheduling_link ? (
              <a
                href={interview.scheduling_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" /> View Scheduling Link
              </a>
            ) : (
              <button
                onClick={scheduleInterview}
                disabled={scheduling}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                {scheduling ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            )}

            <button
              onClick={runAgent}
              disabled={rescoring}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {rescoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {rescoring ? 'Scoring...' : 'Re-run AI Scoring'}
            </button>

            {candidate.status !== 'rejected' && candidate.status !== 'offer' && candidate.score !== null && (
              <button
                onClick={rejectCandidate}
                disabled={rejecting}
                className="btn-danger w-full flex items-center justify-center gap-2"
              >
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {rejecting ? 'Sending...' : 'Reject Candidate'}
              </button>
            )}
          </div>
        </div>

        {/* Right: AI analysis + Notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Score */}
          {candidate.score !== null ? (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-brand-400" />
                <h3 className="font-semibold text-white">AI Analysis</h3>
              </div>

              <div className="flex items-center gap-6 mb-5">
                <div>
                  <div className={`text-5xl font-bold ${getScoreColor(candidate.score)}`}>
                    {candidate.score}
                  </div>
                  <div className="text-xs text-surface-500 mt-1">out of 100</div>
                </div>
                <div className="flex-1">
                  <div className="w-full h-3 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${candidate.score && candidate.score >= 75 ? 'bg-emerald-500' : candidate.score && candidate.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${candidate.score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-surface-600 mt-1">
                    <span>0</span>
                    <span className={`font-medium ${getScoreColor(candidate.score)}`}>
                      {candidate.score && candidate.score >= 75 ? 'Strong Match' : candidate.score && candidate.score >= 50 ? 'Partial Match' : 'Poor Match'}
                    </span>
                    <span>100</span>
                  </div>
                </div>
              </div>

              {candidate.reasoning && (
                <div className="bg-surface-800/50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-surface-300 leading-relaxed">{candidate.reasoning}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {candidate.strengths && candidate.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                    </p>
                    <ul className="space-y-2">
                      {candidate.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-surface-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {candidate.weaknesses && candidate.weaknesses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded-full border border-red-400 inline-block" /> Gaps
                    </p>
                    <ul className="space-y-2">
                      {candidate.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-surface-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Bot className="w-10 h-10 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-400 font-medium">AI scoring pending</p>
              <p className="text-surface-600 text-sm mt-1 mb-4">Run the agent to score this candidate</p>
              <button onClick={runAgent} disabled={rescoring} className="btn-primary mx-auto flex items-center gap-2">
                {rescoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                Run AI Scoring
              </button>
            </div>
          )}

          {/* Resume file + extracted text */}
          {(candidate.resume_url || candidate.resume_text) && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">Resume</h3>
                {candidate.resume_url && (
                  loadingResume ? (
                    <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
                  ) : resumeUrl ? (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Original
                    </a>
                  ) : (
                    <button onClick={loadResumeUrl} className="text-xs text-brand-400 hover:text-brand-300">
                      Load file
                    </button>
                  )
                )}
              </div>

              {candidate.resume_filename && (
                <div className="flex items-center gap-2 mb-3 text-sm text-surface-400">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  {candidate.resume_filename}
                </div>
              )}

              {candidate.resume_text ? (
                <pre className="text-xs text-surface-400 leading-relaxed whitespace-pre-wrap font-mono bg-surface-800/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {candidate.resume_text}
                </pre>
              ) : (
                <p className="text-xs text-surface-600">
                  No text could be extracted from this file automatically — download the original above to review it.
                </p>
              )}
            </div>
          )}

          {/* Cover note from candidate */}
          {candidate.cover_note && (
            <div className="card p-5">
              <h3 className="font-semibold text-white mb-3 text-sm">Note from Candidate</h3>
              <p className="text-sm text-surface-300 leading-relaxed whitespace-pre-line">{candidate.cover_note}</p>
            </div>
          )}

          {/* Notes — Growth+ feature */}
          {planStatus && !planStatus.features.candidateNotes ? (
            <UpgradePrompt feature="Candidate notes" requiredPlan="Growth" />
          ) : (
            <div className="card p-5">
              <h3 className="font-semibold text-white mb-4">Notes</h3>

              <div className="flex gap-2 mb-4">
                <textarea
                  className="input resize-none flex-1"
                  placeholder="Add a note about this candidate..."
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) addNote()
                  }}
                />
                <button
                  onClick={addNote}
                  disabled={addingNote || !note.trim()}
                  className="btn-primary flex-shrink-0 flex items-center gap-1 self-start"
                >
                  {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-3">
                {!(candidate.notes as any[])?.length ? (
                  <p className="text-sm text-surface-600 text-center py-4">No notes yet</p>
                ) : (
                  (candidate.notes as Note[]).map((n) => (
                    <div key={n.id} className="bg-surface-800/50 rounded-lg p-3">
                      <p className="text-sm text-surface-300">{n.note}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-surface-600">
                          {(n as any).user?.full_name || 'HR'} · {formatDate(n.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
