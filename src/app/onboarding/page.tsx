'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Zap, Building2, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) {
      toast.error('Company name is required')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, fullName }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set up your workspace')
      }

      toast.success(`Welcome to Telivio, ${companyName}!`)
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Telivio</span>
        </div>

        <div className="card p-8">
          <div className="w-12 h-12 bg-brand-600/15 rounded-xl flex items-center justify-center mb-5">
            <Building2 className="w-6 h-6 text-brand-400" />
          </div>

          <h1 className="text-xl font-bold text-white mb-1.5">Set up your workspace</h1>
          <p className="text-surface-400 text-sm mb-6">
            Tell us about your company. This creates a private workspace — your jobs, candidates, and data stay completely separate from every other company on Telivio.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input
                className="input"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Your Full Name</label>
              <input
                className="input"
                placeholder="e.g. Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Setting up...' : 'Create my workspace'}
            </button>
          </form>
        </div>

        <p className="text-center text-surface-600 text-xs mt-5">
          You'll be the owner of this workspace and can invite teammates later.
        </p>
      </div>
    </div>
  )
}
