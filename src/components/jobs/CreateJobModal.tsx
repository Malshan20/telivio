'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, Briefcase, Loader2 } from 'lucide-react'
import { Job } from '@/types'

interface CreateJobModalProps {
  onClose: () => void
  onCreated: (job: Job) => void
}

export default function CreateJobModal({ onClose, onCreated }: CreateJobModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    department: '',
    location: '',
    employment_type: 'full-time',
    salary_range: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.description || !form.requirements) {
      toast.error('Title, description, and requirements are required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const created = await res.json()

      if (!res.ok) {
        throw new Error(created.error || 'Failed to create job')
      }

      toast.success('Job created successfully!')
      onCreated(created)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-900 border border-surface-700 rounded-2xl shadow-panel animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600/20 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Create New Job</h2>
              <p className="text-xs text-surface-500">AI agent will auto-screen candidates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-800 flex items-center justify-center text-surface-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Job Title *</label>
                <input
                  name="title"
                  className="input"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="label">Department</label>
                <input
                  name="department"
                  className="input"
                  placeholder="e.g. Engineering"
                  value={form.department}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  name="location"
                  className="input"
                  placeholder="e.g. Remote / New York"
                  value={form.location}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Employment Type</label>
                <select
                  name="employment_type"
                  className="input"
                  value={form.employment_type}
                  onChange={handleChange}
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="label">Salary Range</label>
                <input
                  name="salary_range"
                  className="input"
                  placeholder="e.g. $80k–$120k"
                  value={form.salary_range}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="label">Job Description *</label>
              <textarea
                name="description"
                className="input min-h-[120px] resize-none"
                placeholder="Describe the role, responsibilities, team, and what success looks like..."
                value={form.description}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Requirements *</label>
              <p className="text-xs text-surface-500 mb-2">
                Be specific — the AI agent uses this to score resumes.
              </p>
              <textarea
                name="requirements"
                className="input min-h-[120px] resize-none"
                placeholder="• 3+ years of experience with React and TypeScript&#10;• Strong understanding of web performance&#10;• Experience with REST APIs and GraphQL&#10;• Bachelor's degree in Computer Science or equivalent"
                value={form.requirements}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-800">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
