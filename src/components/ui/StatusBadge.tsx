import { CandidateStatus } from '@/types'
import { getStatusConfig } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: CandidateStatus
  showDot?: boolean
  className?: string
}

export default function StatusBadge({ status, showDot = true, className }: StatusBadgeProps) {
  const config = getStatusConfig(status)
  return (
    <span className={cn('badge', config.color, className)}>
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />}
      {config.label}
    </span>
  )
}
