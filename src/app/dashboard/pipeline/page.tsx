'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Candidate, CandidateStatus } from '@/types'
import { getScoreColor, getStatusConfig } from '@/lib/utils'
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay, closestCorners,
  type DraggableAttributes, type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Clock, Zap, Users, ChevronRight } from 'lucide-react'

const COLUMNS: { id: CandidateStatus; label: string; color: string; dot: string }[] = [
  { id: 'applied',   label: 'Applied',   color: 'border-surface-600',  dot: 'bg-surface-500' },
  { id: 'screened',  label: 'Screened',  color: 'border-blue-500/40',  dot: 'bg-blue-400' },
  { id: 'interview', label: 'Interview', color: 'border-brand-500/40', dot: 'bg-brand-400' },
  { id: 'offer',     label: 'Offer',     color: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  { id: 'rejected',  label: 'Rejected',  color: 'border-red-500/30',   dot: 'bg-red-400' },
]

export default function PipelinePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => { fetchCandidates() }, [])

  async function fetchCandidates() {
    setLoading(true)
    try {
      const res = await fetch('/api/candidates')
      const data = await res.json()
      setCandidates(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(candidateId: string, status: CandidateStatus) {
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Failed to update status')
      fetchCandidates() // revert
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const candidate = candidates.find((c) => c.id === event.active.id)
    setActiveCandidate(candidate || null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Check if dropping over a column
    const overColumn = COLUMNS.find((c) => c.id === overId)
    if (overColumn) {
      setCandidates((prev) =>
        prev.map((c) => c.id === activeId ? { ...c, status: overColumn.id } : c)
      )
      return
    }

    // Check if dropping over another candidate
    const overCandidate = candidates.find((c) => c.id === overId)
    if (overCandidate && overCandidate.status !== candidates.find((c) => c.id === activeId)?.status) {
      setCandidates((prev) =>
        prev.map((c) => c.id === activeId ? { ...c, status: overCandidate.status } : c)
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCandidate(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const candidate = candidates.find((c) => c.id === activeId)
    if (!candidate) return

    const targetStatus = COLUMNS.find((c) => c.id === overId)?.id
      || candidates.find((c) => c.id === overId)?.status

    if (targetStatus && targetStatus !== candidate.status) {
      if (targetStatus === 'rejected') {
        // Rejection always sends an email — never do this silently via a
        // plain status PATCH. Confirm, then go through the same endpoint
        // the "Reject Candidate" buttons elsewhere in the app use.
        if (!confirm(`Send a rejection email to ${candidate.name} and mark them as rejected? This cannot be undone.`)) {
          fetchCandidates() // revert the optimistic drag-drop move
          return
        }
        rejectWithEmail(activeId, candidate.name)
      } else {
        // Optimistic update already done in handleDragOver
        updateStatus(activeId, targetStatus as CandidateStatus)
        toast.success(`Moved to ${targetStatus}`)
      }
    }
  }

  async function rejectWithEmail(candidateId: string, candidateName: string) {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/reject`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject candidate')
      toast.success(data.emailSent ? `${candidateName} rejected — email sent` : `${candidateName} rejected (email failed to send)`)
      fetchCandidates()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject candidate')
      fetchCandidates() // revert the optimistic drag-drop move
    }
  }

  const getColumnCandidates = (status: CandidateStatus) =>
    candidates.filter((c) => c.status === status)

  if (loading) {
    return (
      <div className="animate-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-surface-400 text-sm mt-1">Drag candidates between stages</p>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="card p-4 space-y-3">
              <div className="h-4 bg-surface-800 rounded animate-pulse w-2/3" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-surface-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-surface-400 text-sm mt-1">
            {candidates.length} candidates · drag to move between stages
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-500 bg-surface-800 px-3 py-2 rounded-lg border border-surface-700">
          <GripVertical className="w-3.5 h-3.5" />
          Drag & drop to update status
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colCandidates = getColumnCandidates(col.id)
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                candidates={colCandidates}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeCandidate ? (
            <div className="pipeline-card opacity-95 shadow-panel rotate-1 w-64">
              <CandidateCard candidate={activeCandidate} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function KanbanColumn({
  column,
  candidates,
}: {
  column: typeof COLUMNS[0]
  candidates: Candidate[]
}) {
  const { setNodeRef, isOver } = useSortable({
    id: column.id,
    data: { type: 'column' },
  })

  return (
    <div
      ref={setNodeRef}
      id={column.id}
      className={`flex flex-col gap-3 rounded-xl border-2 p-3 transition-colors min-h-[200px] ${
        column.color
      } ${isOver ? 'bg-surface-800/50' : 'bg-surface-900/50'}`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.dot}`} />
          <span className="text-sm font-semibold text-white">{column.label}</span>
        </div>
        <span className="text-xs font-medium text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">
          {candidates.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={candidates.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {candidates.length === 0 ? (
            <div className={`flex-1 flex items-center justify-center py-8 rounded-lg border-2 border-dashed transition-colors ${
              isOver ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-800'
            }`}>
              <p className="text-xs text-surface-600">Drop here</p>
            </div>
          ) : (
            candidates.map((candidate) => (
              <SortableCard key={candidate.id} candidate={candidate} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableCard({ candidate }: { candidate: Candidate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id,
    data: { type: 'candidate', candidate },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <CandidateCard candidate={candidate} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  )
}

function CandidateCard({
  candidate,
  dragAttributes,
  dragListeners,
  isDragging,
}: {
  candidate: Candidate
  dragAttributes?: DraggableAttributes
  dragListeners?: DraggableSyntheticListeners
  isDragging?: boolean
}) {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-lg p-3 group hover:border-surface-600 transition-all">
      <div className="flex items-start gap-2">
        <button
          {...dragAttributes}
          {...dragListeners}
          className="mt-0.5 text-surface-600 hover:text-surface-400 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-white truncate">{candidate.name}</p>
            {!isDragging && (
              <Link
                href={`/dashboard/candidates/${candidate.id}`}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronRight className="w-3.5 h-3.5 text-surface-400 hover:text-white" />
              </Link>
            )}
          </div>
          <p className="text-xs text-surface-500 truncate mt-0.5">
            {(candidate.job as any)?.title || candidate.email}
          </p>

          <div className="flex items-center gap-2 mt-2">
            {candidate.score !== null ? (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-brand-400" />
                <span className={`text-xs font-bold ${getScoreColor(candidate.score)}`}>
                  {candidate.score}
                </span>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-xs text-surface-600">
                <Clock className="w-3 h-3" /> Pending
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
