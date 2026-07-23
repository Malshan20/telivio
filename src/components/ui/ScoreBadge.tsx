import { getScoreColor, getScoreBg, getScoreLabel } from '@/lib/utils'
import { Zap } from 'lucide-react'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showBar?: boolean
}

export default function ScoreBadge({ score, size = 'md', showLabel = false, showBar = false }: ScoreBadgeProps) {
  const sizeMap = {
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-2.5 py-1',
    lg: 'text-2xl px-3 py-1.5',
  }

  return (
    <div className="flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1.5 rounded-lg border font-bold ${sizeMap[size]} ${getScoreBg(score)} ${getScoreColor(score)}`}>
        <Zap className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
        {score}
      </div>
      {showLabel && (
        <span className={`text-xs ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
      )}
      {showBar && (
        <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full rounded-full ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  )
}
