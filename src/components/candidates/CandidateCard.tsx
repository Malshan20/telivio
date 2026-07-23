import Link from 'next/link'
import { Candidate } from '@/types'
import { formatDate, getScoreColor, getStatusConfig } from '@/lib/utils'
import { Clock, Zap, ChevronRight } from 'lucide-react'

interface CandidateCardProps {
  candidate: Candidate
  showJob?: boolean
  compact?: boolean
}

export default function CandidateCard({ candidate, showJob = true, compact = false }: CandidateCardProps) {
  const status = getStatusConfig(candidate.status)

  const initials = candidate.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link
      href={`/dashboard/candidates/${candidate.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/50 transition-colors group"
    >
      <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-surface-300">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{candidate.name}</p>
        {showJob && (candidate.job as any)?.title && (
          <p className="text-xs text-surface-500 truncate">{(candidate.job as any).title}</p>
        )}
        {!showJob && !compact && (
          <p className="text-xs text-surface-500 truncate">{candidate.email}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {candidate.score !== null ? (
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-brand-400" />
            <span className={`text-sm font-bold ${getScoreColor(candidate.score)}`}>
              {candidate.score}
            </span>
          </div>
        ) : (
          <span className="text-xs text-surface-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
          </span>
        )}

        {!compact && (
          <span className={`badge text-xs ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        )}

        <ChevronRight className="w-3.5 h-3.5 text-surface-700 group-hover:text-surface-500 transition-colors" />
      </div>
    </Link>
  )
}
