import { Candidate } from '@/types'
import { getScoreColor, getScoreLabel } from '@/lib/utils'
import { Zap, CheckCircle2, AlertCircle, Bot } from 'lucide-react'

interface AIScorePanelProps {
  candidate: Candidate
  onRescore?: () => void
  loading?: boolean
}

export default function AIScorePanel({ candidate, onRescore, loading }: AIScorePanelProps) {
  if (!candidate.score && candidate.score !== 0) {
    return (
      <div className="card p-6 text-center space-y-3">
        <Bot className="w-10 h-10 text-surface-700 mx-auto" />
        <div>
          <p className="text-surface-400 font-medium">AI analysis pending</p>
          <p className="text-surface-600 text-sm mt-1">
            The agent will score this candidate automatically
          </p>
        </div>
        {onRescore && (
          <button onClick={onRescore} disabled={loading} className="btn-secondary mx-auto flex items-center gap-2">
            {loading ? (
              <span className="w-4 h-4 border-2 border-surface-400 border-t-white rounded-full animate-spin" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
            Run Scoring
          </button>
        )}
      </div>
    )
  }

  const score = candidate.score

  return (
    <div className="card p-5 space-y-4">
      {/* Score header */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-brand-400" />
        <h3 className="font-semibold text-white text-sm">AI Analysis</h3>
        <span className="ml-auto text-xs text-surface-500">via Groq</span>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-4">
        <div>
          <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-surface-500 text-lg">/100</span>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className={getScoreColor(score)}>{getScoreLabel(score)}</span>
            <span className="text-surface-500">{score >= 75 ? '→ Interview' : '→ Rejected'}</span>
          </div>
          <div className="w-full h-2.5 bg-surface-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-surface-700">
            <span>0</span><span>25</span><span>50</span><span className="text-brand-600">75</span><span>100</span>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {candidate.reasoning && (
        <div className="bg-surface-800/50 rounded-lg p-3.5">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1.5">Summary</p>
          <p className="text-sm text-surface-300 leading-relaxed">{candidate.reasoning}</p>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 gap-3">
        {candidate.strengths && candidate.strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Strengths ({candidate.strengths.length})
            </p>
            <ul className="space-y-1.5">
              {candidate.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
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
              <AlertCircle className="w-3.5 h-3.5" /> Gaps ({candidate.weaknesses.length})
            </p>
            <ul className="space-y-1.5">
              {candidate.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {onRescore && (
        <button
          onClick={onRescore}
          disabled={loading}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-xs"
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-surface-400 border-t-white rounded-full animate-spin" />
          ) : (
            <Bot className="w-3.5 h-3.5" />
          )}
          Re-run AI Scoring
        </button>
      )}
    </div>
  )
}
