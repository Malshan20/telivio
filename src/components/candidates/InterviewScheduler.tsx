'use client'

import { useState } from 'react'
import { Interview } from '@/types'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Calendar, ExternalLink, Loader2, CheckCircle2, Clock } from 'lucide-react'

interface InterviewSchedulerProps {
  candidateId: string
  jobId: string
  interviews: Interview[]
  onScheduled: () => void
}

export default function InterviewScheduler({ candidateId, jobId, interviews, onScheduled }: InterviewSchedulerProps) {
  const [scheduling, setScheduling] = useState(false)
  const latest = interviews?.[0]

  async function handleSchedule() {
    setScheduling(true)
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, job_id: jobId, sendEmail: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success('Interview scheduled and email sent!')
      onScheduled()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Scheduling failed')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-brand-400" />
        <h3 className="font-semibold text-white text-sm">Interview</h3>
      </div>

      {latest ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {latest.status === 'scheduled' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clock className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-sm text-white capitalize">{latest.status}</span>
          </div>

          {latest.scheduled_time && (
            <p className="text-xs text-surface-400">
              {formatDateTime(latest.scheduled_time)}
            </p>
          )}

          {latest.scheduling_link && (
            <a
              href={latest.scheduling_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Scheduling Link
            </a>
          )}

          {latest.meeting_url && (
            <a
              href={latest.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Join Meeting
            </a>
          )}

          <button
            onClick={handleSchedule}
            disabled={scheduling}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-xs"
          >
            {scheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
            Resend Invite
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-surface-500">
            Send a Calendly scheduling link and interview invitation email to this candidate.
          </p>
          <button
            onClick={handleSchedule}
            disabled={scheduling}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            {scheduling ? 'Scheduling...' : 'Schedule Interview'}
          </button>
        </div>
      )}
    </div>
  )
}
