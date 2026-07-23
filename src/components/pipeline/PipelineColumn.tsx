'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Candidate, CandidateStatus } from '@/types'
import { cn } from '@/lib/utils'

interface PipelineColumnProps {
  id: CandidateStatus
  label: string
  color: string
  dot: string
  candidates: Candidate[]
  children: React.ReactNode
}

export default function PipelineColumn({ id, label, color, dot, candidates, children }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-3 rounded-xl border-2 p-3 transition-all min-h-[200px]',
        color,
        isOver ? 'bg-surface-800/60 scale-[1.01]' : 'bg-surface-900/50'
      )}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', dot)} />
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        <span className="text-xs font-medium text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">
          {candidates.length}
        </span>
      </div>

      <SortableContext items={candidates.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {candidates.length === 0 ? (
            <div className={cn(
              'flex-1 flex items-center justify-center py-8 rounded-lg border-2 border-dashed transition-colors',
              isOver ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-800'
            )}>
              <p className="text-xs text-surface-600">Drop here</p>
            </div>
          ) : (
            children
          )}
        </div>
      </SortableContext>
    </div>
  )
}
