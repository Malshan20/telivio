'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Candidate } from '@/types'
import { formatDate, getScoreColor, getScoreBg, getStatusConfig, exportToCSV } from '@/lib/utils'
import { Users, Search, Download, ChevronRight, Clock, Filter } from 'lucide-react'

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [minScore, setMinScore] = useState('')

  useEffect(() => { fetchCandidates() }, [])

  async function fetchCandidates() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (minScore) params.set('minScore', minScore)
      const res = await fetch(`/api/candidates?${params}`)
      const data = await res.json()
      setCandidates(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  const filtered = candidates.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  function handleExport() {
    const data = filtered.map((c) => ({
      Name: c.name,
      Email: c.email,
      Job: (c.job as any)?.title || '',
      Score: c.score ?? 'Pending',
      Status: c.status,
      Applied: formatDate(c.created_at),
    }))
    exportToCSV(data, 'candidates')
  }

  const statuses = ['', 'applied', 'screened', 'interview', 'offer', 'rejected']

  return (
    <div className="animate-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidates</h1>
          <p className="text-surface-400 text-sm mt-1">{candidates.length} total across all jobs</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input className="input pl-9" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setTimeout(fetchCandidates, 0) }}>
          <option value="">All Statuses</option>
          {statuses.filter(Boolean).map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <select className="input w-auto" value={minScore} onChange={(e) => { setMinScore(e.target.value); setTimeout(fetchCandidates, 0) }}>
          <option value="">Any Score</option>
          <option value="75">Score ≥ 75</option>
          <option value="60">Score ≥ 60</option>
          <option value="90">Score ≥ 90</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Candidate</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Job</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">AI Score</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Applied</th>
                <th className="px-5 py-3.5 text-right text-xs font-medium text-surface-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-surface-500">
                    <Users className="w-8 h-8 mx-auto mb-3 text-surface-700" />
                    No candidates found
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const status = getStatusConfig(c.status)
                  return (
                    <tr key={c.id} className="hover:bg-surface-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-surface-300">
                              {c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{c.name}</p>
                            <p className="text-xs text-surface-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-surface-300 truncate max-w-[160px]">
                          {(c.job as any)?.title || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {c.score !== null ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${getScoreColor(c.score)}`}>{c.score}</span>
                            <div className="w-16 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${c.score && c.score >= 75 ? 'bg-emerald-500' : c.score && c.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${c.score}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-surface-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-surface-500">{formatDate(c.created_at)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/candidates/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium"
                        >
                          Profile <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
