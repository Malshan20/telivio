'use client'

import { useState } from 'react'
import { Note } from '@/types'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Send, MessageSquare, Loader2 } from 'lucide-react'

interface NotesPanelProps {
  candidateId: string
  notes: Note[]
  onNoteAdded: () => void
}

export default function NotesPanel({ candidateId, notes, onNoteAdded }: NotesPanelProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/candidates/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, note: text.trim() }),
      })
      if (!res.ok) throw new Error()
      setText('')
      onNoteAdded()
      toast.success('Note added')
    } catch {
      toast.error('Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-surface-400" />
        <h3 className="font-semibold text-white text-sm">Notes</h3>
        <span className="ml-auto text-xs text-surface-600">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Add note */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          className="input resize-none flex-1 text-sm"
          placeholder="Add a note… (Ctrl+Enter to submit)"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
          }}
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="btn-primary px-3 self-start flex-shrink-0"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {/* Notes list */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-surface-600 text-center py-4">No notes yet</p>
        ) : (
          [...notes].reverse().map((note) => (
            <div key={note.id} className="bg-surface-800/50 rounded-lg p-3 space-y-1.5">
              <p className="text-sm text-surface-300 leading-relaxed">{note.note}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-600">
                  {(note as any).user?.full_name || 'HR'} · {formatDate(note.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
