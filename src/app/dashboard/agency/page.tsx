'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { usePlanStatus } from '@/lib/usePlanStatus'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import { Loader2, Plus, Building2, ArrowRight, X } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  created_at: string
}

export default function AgencyWorkspacesPage() {
  const router = useRouter()
  const { status: planStatus, loading: planLoading } = usePlanStatus()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    if (planLoading) return
    if (planStatus && !planStatus.features.multipleWorkspaces) {
      setLoading(false)
      return
    }
    fetchWorkspaces()
  }, [planLoading, planStatus])

  async function fetchWorkspaces() {
    setLoading(true)
    try {
      const res = await fetch('/api/agency/workspaces')
      const data = await res.json()
      if (res.ok) setWorkspaces(data.workspaces)
    } finally {
      setLoading(false)
    }
  }

  async function createWorkspace() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/agency/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create workspace')
      toast.success(`${data.workspace.name} workspace created`)
      setShowCreate(false)
      setNewName('')
      fetchWorkspaces()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  async function switchTo(organizationId: string) {
    setSwitchingId(organizationId)
    try {
      const res = await fetch('/api/agency/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to switch workspace')
      toast.success('Switched workspace')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to switch workspace')
    } finally {
      setSwitchingId(null)
    }
  }

  if (planLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (planStatus && !planStatus.features.multipleWorkspaces) {
    return (
      <div className="animate-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Workspaces</h1>
          <p className="text-surface-400 text-sm mt-1">Manage hiring for multiple clients from one place</p>
        </div>
        <UpgradePrompt feature="Multiple client workspaces" requiredPlan="Agency" />
      </div>
    )
  }

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Workspaces</h1>
          <p className="text-surface-400 text-sm mt-1">Each workspace is fully isolated — separate jobs, candidates, and pipeline</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Workspace
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="card p-10 text-center">
          <Building2 className="w-10 h-10 text-surface-700 mx-auto mb-3" />
          <p className="text-surface-400 text-sm font-medium">No client workspaces yet</p>
          <p className="text-surface-600 text-xs mt-1">Create one for each client you're hiring for</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <div key={ws.id} className="card p-5 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-brand-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4.5 h-4.5 text-brand-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{ws.name}</p>
                  <p className="text-xs text-surface-500">/{ws.slug}</p>
                </div>
              </div>
              <button
                onClick={() => switchTo(ws.id)}
                disabled={switchingId === ws.id}
                className="btn-secondary flex items-center gap-1.5 flex-shrink-0 text-xs"
              >
                {switchingId === ws.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Switch
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-sm bg-surface-900 border border-surface-700 rounded-2xl shadow-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">New Client Workspace</h2>
              <button onClick={() => setShowCreate(false)} className="text-surface-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="label">Client / Workspace Name</label>
            <input
              autoFocus
              className="input mb-4"
              placeholder="e.g. Acme Corp"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
            />
            <button onClick={createWorkspace} disabled={creating || !newName.trim()} className="btn-primary w-full">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Workspace'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
