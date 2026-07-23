'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Save, Key, Bell, Zap, Copy, ExternalLink, Calendar, CheckCircle2, Loader2, Unlink, Building2, Mail, Palette, RefreshCw } from 'lucide-react'
import { usePlanStatus } from '@/lib/usePlanStatus'
import UpgradePrompt from '@/components/ui/UpgradePrompt'

function SettingsContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { status: planStatus } = usePlanStatus()
  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'agent' | 'emails'>('profile')

  const [org, setOrg] = useState<{ name: string; role: string; interview_threshold: number } | null>(null)
  const [orgNameInput, setOrgNameInput] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)
  const [thresholdInput, setThresholdInput] = useState(75)
  const [savingThreshold, setSavingThreshold] = useState(false)

  const [whiteLabel, setWhiteLabel] = useState({ enabled: false, displayName: '', accentColor: '' })
  const [savingWhiteLabel, setSavingWhiteLabel] = useState(false)

  const [emailTemplates, setEmailTemplates] = useState({
    interviewInviteSubject: '',
    interviewInviteIntro: '',
    rejectionSubject: '',
  })
  const [savingTemplates, setSavingTemplates] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) setProfile({ full_name: data.full_name || '', email: data.email || '' })
    }
    async function loadOrg() {
      try {
        const res = await fetch('/api/organization')
        const data = await res.json()
        if (res.ok) {
          setOrg({ name: data.name, role: data.role, interview_threshold: data.interview_threshold })
          setOrgNameInput(data.name)
          setThresholdInput(data.interview_threshold ?? 75)
          setWhiteLabel({
            enabled: !!data.white_label_enabled,
            displayName: data.white_label_display_name || '',
            accentColor: data.white_label_accent_color || '',
          })
        }
      } catch {
        // Non-fatal — the rest of settings still works without this.
      }
    }
    async function loadEmailTemplates() {
      try {
        const res = await fetch('/api/organization/email-templates')
        const data = await res.json()
        if (res.ok) {
          setEmailTemplates({
            interviewInviteSubject: data.overrides?.interview_invite?.subject || '',
            interviewInviteIntro: data.overrides?.interview_invite?.intro || '',
            rejectionSubject: data.overrides?.rejection?.subject || '',
          })
        }
      } catch {
        // Non-fatal
      }
    }
    loadProfile()
    loadOrg()
    loadEmailTemplates()
  }, [])

  // Surface a toast for the OAuth redirect outcome, then clean the URL
  // and switch to the Integrations tab so the result is visible.
  useEffect(() => {
    const connected = searchParams.get('calendly_connected')
    const calError = searchParams.get('calendly_error')

    if (connected) {
      toast.success('Calendly connected! Interview links will now use your Calendly account.')
      setActiveTab('integrations')
      router.replace('/dashboard/settings')
    } else if (calError) {
      const messages: Record<string, string> = {
        no_organization: 'Set up your workspace before connecting Calendly.',
        insufficient_permissions: 'Only workspace owners or admins can connect Calendly.',
        missing_code: 'Calendly did not return an authorization code. Try again.',
        invalid_state: 'That connection link expired or was invalid. Try again.',
        state_expired: 'That connection attempt expired. Try again.',
        exchange_failed: 'Failed to complete the Calendly connection. Try again.',
        access_denied: 'You declined the Calendly connection request.',
      }
      toast.error(messages[calError] || 'Failed to connect Calendly')
      setActiveTab('integrations')
      router.replace('/dashboard/settings')
    }
  }, [searchParams, router])

  async function saveProfile() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('users')
        .update({ full_name: profile.full_name })
        .eq('id', user.id)
      if (error) throw error
      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function saveOrgName() {
    if (!orgNameInput.trim() || orgNameInput.trim() === org?.name) return
    setSavingOrg(true)
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgNameInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update company name')
      setOrg((o) => (o ? { ...o, name: data.name } : o))
      toast.success('Company name updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update company name')
    } finally {
      setSavingOrg(false)
    }
  }

  async function saveThreshold(value: number) {
    setSavingThreshold(true)
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_threshold: value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update threshold')
      setOrg((o) => (o ? { ...o, interview_threshold: data.interview_threshold } : o))
      toast.success(`Interview threshold set to ${value}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update threshold')
      // Revert the slider to the last known-good value on failure.
      if (org) setThresholdInput(org.interview_threshold)
    } finally {
      setSavingThreshold(false)
    }
  }

  async function saveWhiteLabel() {
    if (whiteLabel.accentColor && !/^#[0-9a-fA-F]{6}$/.test(whiteLabel.accentColor)) {
      toast.error('Accent color must be a hex code like #6D5BFF')
      return
    }
    setSavingWhiteLabel(true)
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          white_label_enabled: whiteLabel.enabled,
          white_label_display_name: whiteLabel.displayName,
          white_label_accent_color: whiteLabel.accentColor,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save branding')
      toast.success('Branding saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save branding')
    } finally {
      setSavingWhiteLabel(false)
    }
  }

  async function saveEmailTemplates() {
    setSavingTemplates(true)
    try {
      const res = await fetch('/api/organization/email-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewInviteSubject: emailTemplates.interviewInviteSubject,
          interviewInviteIntro: emailTemplates.interviewInviteIntro,
          rejectionSubject: emailTemplates.rejectionSubject,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save email templates')
      toast.success('Email templates saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save email templates')
    } finally {
      setSavingTemplates(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'agent', label: 'AI Agent' },
    { id: 'emails', label: 'Email Templates' },
  ] as const

  return (
    <div className="animate-in space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-surface-400 text-sm mt-1">Manage your account and integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-surface-700 text-white'
                : 'text-surface-500 hover:text-surface-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-brand-600/20 rounded-lg flex items-center justify-center">
              <User className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <h2 className="font-semibold text-white">Profile Information</h2>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input className="input opacity-60 cursor-not-allowed" value={profile.email} disabled />
            <p className="text-xs text-surface-600 mt-1">Email cannot be changed here</p>
          </div>

          <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-brand-600/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <h2 className="font-semibold text-white">Company</h2>
          </div>

          <div>
            <label className="label">Company Name</label>
            <input
              className="input"
              value={orgNameInput}
              onChange={(e) => setOrgNameInput(e.target.value)}
              placeholder="Your company name"
              disabled={org?.role !== 'owner'}
            />
            {org?.role !== 'owner' && (
              <p className="text-xs text-surface-600 mt-1">
                Only the workspace owner can rename the company.
              </p>
            )}
          </div>

          {org?.role === 'owner' && (
            <button
              onClick={saveOrgName}
              disabled={savingOrg || !orgNameInput.trim() || orgNameInput.trim() === org?.name}
              className="btn-primary flex items-center gap-2"
            >
              {savingOrg ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Company Name
            </button>
          )}
        </div>
      )}

      {activeTab === 'profile' && planStatus?.features.whiteLabel && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-brand-600/20 rounded-lg flex items-center justify-center">
              <Palette className="w-4.5 h-4.5 text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">White-Label Branding</h2>
              <p className="text-xs text-surface-500">Shown on your public apply pages and candidate emails</p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={whiteLabel.enabled}
              onChange={(e) => setWhiteLabel((w) => ({ ...w, enabled: e.target.checked }))}
              disabled={org?.role !== 'owner'}
              className="w-4 h-4 rounded accent-brand-500"
            />
            <span className="text-sm text-surface-300">Enable white-label branding</span>
          </label>

          <div>
            <label className="label">Display Name</label>
            <input
              className="input"
              placeholder="Shown instead of your account name on apply pages"
              value={whiteLabel.displayName}
              onChange={(e) => setWhiteLabel((w) => ({ ...w, displayName: e.target.value }))}
              disabled={org?.role !== 'owner'}
            />
          </div>

          <div>
            <label className="label">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={whiteLabel.accentColor || '#6D5BFF'}
                onChange={(e) => setWhiteLabel((w) => ({ ...w, accentColor: e.target.value }))}
                disabled={org?.role !== 'owner'}
                className="w-10 h-10 rounded-lg border border-surface-700 bg-transparent cursor-pointer"
              />
              <input
                className="input flex-1 font-mono text-sm"
                placeholder="#6D5BFF"
                value={whiteLabel.accentColor}
                onChange={(e) => setWhiteLabel((w) => ({ ...w, accentColor: e.target.value }))}
                disabled={org?.role !== 'owner'}
              />
            </div>
          </div>

          {org?.role === 'owner' && (
            <button onClick={saveWhiteLabel} disabled={savingWhiteLabel} className="btn-primary flex items-center gap-2">
              {savingWhiteLabel ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Branding
            </button>
          )}
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-4">
          <CalendlyConnectionCard />

          {[
            {
              name: 'Groq AI',
              desc: 'Powers AI resume scoring and candidate reasoning. Configured once by Telivio — not per-company.',
              env: 'GROQ_API_KEY',
              docs: 'https://console.groq.com/keys',
              icon: '🧠',
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
            {
              name: 'Resend',
              desc: 'Sends interview invites and rejection emails on Telivio\'s behalf. Configured once by Telivio.',
              env: 'RESEND_API_KEY',
              docs: 'https://resend.com/api-keys',
              icon: '✉️',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
          ].map((integration) => (
            <div key={integration.name} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 ${integration.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{integration.name}</h3>
                    <p className="text-sm text-surface-400 mt-0.5">{integration.desc}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-xs bg-surface-800 text-surface-400 px-2 py-1 rounded font-mono border border-surface-700">
                        {integration.env}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(integration.env); toast.success('Copied!') }}
                        className="text-surface-500 hover:text-surface-300 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <a
                  href={integration.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center gap-1.5 flex-shrink-0 text-xs"
                >
                  Get Key <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}

          <div className="card p-5 border-brand-500/20 bg-brand-500/5">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white text-sm">Platform-level vs. your workspace</h3>
                <p className="text-sm text-surface-400 mt-1">
                  Groq and Resend are configured once for all of Telivio. <strong className="text-surface-300">Calendly is different</strong> — every company connects its <em>own</em> Calendly account above, so interviews always land on your team's calendar, never anyone else's.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agent' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-brand-600/20 rounded-lg flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-brand-400" />
              </div>
              <h2 className="font-semibold text-white">AI Agent Configuration</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Interview Score Threshold</label>
                <p className="text-xs text-surface-500 mb-2">
                  Candidates scoring at or above this threshold receive interview invites
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(Number(e.target.value))}
                    onMouseUp={(e) => saveThreshold(Number((e.target as HTMLInputElement).value))}
                    onTouchEnd={(e) => saveThreshold(Number((e.target as HTMLInputElement).value))}
                    disabled={org?.role !== 'owner' || savingThreshold}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-white font-bold w-10 text-right">
                    {savingThreshold ? <Loader2 className="w-4 h-4 animate-spin inline" /> : thresholdInput}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-surface-600 mt-1">
                  <span>50 (lenient)</span>
                  <span className="text-brand-400">Default: 75</span>
                  <span>95 (strict)</span>
                </div>
              </div>

              <div>
                <label className="label">AI Model</label>
                <select className="input">
                  <option value="openai/gpt-oss-120b">GPT-OSS 120B (Best Quality)</option>
                  <option value="openai/gpt-oss-20b">GPT-OSS 20B (Faster)</option>
                  <option value="qwen/qwen3.6-27b">Qwen 3.6 27B</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-surface-800">
                <div>
                  <p className="text-sm font-medium text-white">Auto-process on apply</p>
                  <p className="text-xs text-surface-500">Automatically score candidates when they apply</p>
                </div>
                <div className="w-11 h-6 bg-brand-600 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow" />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-surface-800">
                <div>
                  <p className="text-sm font-medium text-white">Send rejection emails</p>
                  <p className="text-xs text-surface-500">AI generates personalized rejection emails</p>
                </div>
                <div className="w-11 h-6 bg-brand-600 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow" />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-surface-800">
                <div>
                  <p className="text-sm font-medium text-white">Auto-schedule interviews</p>
                  <p className="text-xs text-surface-500">Send Calendly links to qualified candidates</p>
                </div>
                <div className="w-11 h-6 bg-brand-600 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow" />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5 border-amber-500/20 bg-amber-500/5">
            <p className="text-sm text-amber-300 font-medium mb-1">⚙️ Note</p>
            <p className="text-sm text-surface-400">
              Agent configuration is stored in environment variables in this version. 
              Per-job configuration and advanced rules are on the roadmap.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'emails' && (
        planStatus && !planStatus.features.customEmailTemplates ? (
          <UpgradePrompt feature="Custom email templates" requiredPlan="Growth" />
        ) : (
        <div className="space-y-4">
          {org && org.role !== 'owner' && org.role !== 'admin' && (
            <div className="card p-4 border-amber-500/20 bg-amber-500/5">
              <p className="text-sm text-amber-300">Only owners and admins can edit email templates.</p>
            </div>
          )}

          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-brand-600/20 rounded-lg flex items-center justify-center">
                <Mail className="w-4.5 h-4.5 text-brand-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Interview Invitation</h2>
                <p className="text-xs text-surface-500">Sent automatically when a candidate scores above your threshold</p>
              </div>
            </div>

            <div>
              <label className="label">Subject Line</label>
              <input
                className="input"
                placeholder="Interview Invitation — {{jobTitle}} at {{companyName}}"
                value={emailTemplates.interviewInviteSubject}
                onChange={(e) => setEmailTemplates((t) => ({ ...t, interviewInviteSubject: e.target.value }))}
                disabled={org?.role === 'hr'}
              />
              <p className="text-xs text-surface-600 mt-1">
                Leave blank to use the default. You can use <code className="text-surface-400">{'{{jobTitle}}'}</code> and <code className="text-surface-400">{'{{companyName}}'}</code>.
              </p>
            </div>

            <div>
              <label className="label">Opening Paragraph</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Congratulations! After reviewing your application for the {{jobTitle}} position, we're excited to invite you to an interview."
                value={emailTemplates.interviewInviteIntro}
                onChange={(e) => setEmailTemplates((t) => ({ ...t, interviewInviteIntro: e.target.value }))}
                disabled={org?.role === 'hr'}
              />
              <p className="text-xs text-surface-600 mt-1">
                Replaces the default opening line. The rest of the email (scheduling link, footer) stays the same.
              </p>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-white">Rejection Email</h2>
              <p className="text-xs text-surface-500">Sent when an HR user clicks Reject — the body is always AI-personalized per candidate, but you can override the subject line</p>
            </div>

            <div>
              <label className="label">Subject Line</label>
              <input
                className="input"
                placeholder="Regarding your application — {{jobTitle}}"
                value={emailTemplates.rejectionSubject}
                onChange={(e) => setEmailTemplates((t) => ({ ...t, rejectionSubject: e.target.value }))}
                disabled={org?.role === 'hr'}
              />
            </div>
          </div>

          {org?.role !== 'hr' && (
            <button onClick={saveEmailTemplates} disabled={savingTemplates} className="btn-primary flex items-center gap-2">
              {savingTemplates ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Email Templates
            </button>
          )}
        </div>
        )
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-surface-500 text-sm">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  )
}

/**
 * Per-organization Calendly connection card. Unlike Groq/Resend (configured
 * once for all of Telivio via env vars), this is genuinely per-tenant:
 * each company connects their OWN Calendly account via OAuth, so interview
 * bookings land on their calendar — never Telivio's, never another
 * customer's.
 */
function CalendlyConnectionCard() {
  const [status, setStatus] = useState<{
    connected: boolean
    username?: string
    defaultEventTypeId?: string
  } | null>(null)
  const [eventTypes, setEventTypes] = useState<{ id: string; title: string; slug: string; length: number; active: boolean }[]>([])
  const [loadingEventTypes, setLoadingEventTypes] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [savingEventType, setSavingEventType] = useState(false)

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    try {
      const res = await fetch('/api/calendly/status')
      const data = await res.json()
      setStatus(data)
      if (data.connected) {
        loadEventTypes()
      }
    } catch {
      setStatus({ connected: false })
    }
  }

  async function loadEventTypes() {
    setLoadingEventTypes(true)
    try {
      const res = await fetch(`/api/calendly/event-types?t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      // API returns { eventTypes: [...] }, not a bare array — this was
      // previously checked with Array.isArray(data) which is always false
      // for an object, so real event types never made it into state.
      if (res.ok && Array.isArray(data.eventTypes)) {
        setEventTypes(data.eventTypes)
      } else {
        setEventTypes([])
      }
    } catch {
      // Non-fatal — they can still see the connection, just not pick an event type yet.
    } finally {
      setLoadingEventTypes(false)
    }
  }

  async function handleSetEventType(eventTypeId: string) {
    setSavingEventType(true)
    try {
      const res = await fetch('/api/calendly/event-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventTypeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update event type')
      toast.success('Default interview event type updated')
      setStatus((s) => (s ? { ...s, defaultEventTypeId: eventTypeId } : s))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update event type')
    } finally {
      setSavingEventType(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Calendly? New interview invites will fail to generate scheduling links until you reconnect.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/calendly/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Calendly disconnected')
      setStatus({ connected: false })
      setEventTypes([])
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  if (!status) {
    return (
      <div className="card p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
        <span className="text-sm text-surface-500">Checking Calendly connection…</span>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Calendly</h3>
              {status.connected && (
                <span className="badge bg-emerald-500/10 text-emerald-400 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <p className="text-sm text-surface-400 mt-0.5">
              {status.connected
                ? `Interview bookings go to your own Calendly account${status.username ? ` (@${status.username})` : ''}.`
                : 'Connect your own Calendly account so interviews booked through Telivio land on your team\'s calendar — not Telivio\'s.'}
            </p>
          </div>
        </div>

        {status.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="btn-secondary flex items-center gap-1.5 flex-shrink-0 text-xs text-red-400 hover:text-red-300"
          >
            {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
            Disconnect
          </button>
        ) : (
          <a
            href="/api/calendly/connect"
            className="btn-primary flex items-center gap-1.5 flex-shrink-0 text-xs"
          >
            <Calendar className="w-3.5 h-3.5" /> Connect Calendly
          </a>
        )}
      </div>

      {status.connected && (
        <div className="mt-4 pt-4 border-t border-surface-800">
          <div className="flex items-center justify-between mb-1">
            <label className="label" style={{ margin: 0 }}>Default interview event type</label>
            <button
              onClick={loadEventTypes}
              disabled={loadingEventTypes}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingEventTypes ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-xs text-surface-500 mb-2">
            Which Calendly event type should Telivio use when scheduling interviews?
          </p>

          {loadingEventTypes ? (
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your event types…
            </div>
          ) : eventTypes.length === 0 ? (
            <div>
              <p className="text-xs text-surface-600 mb-2">
                No event types found. If you just created one in Calendly, click Refresh above.
              </p>
              <button onClick={loadEventTypes} className="text-xs text-brand-400 hover:text-brand-300">
                Try again
              </button>
            </div>
          ) : (
            <>
              {(() => {
                const currentEventType = eventTypes.find((et) => et.id === status.defaultEventTypeId)
                if (currentEventType && !currentEventType.active) {
                  return (
                    <div className="mb-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      ⚠️ "{currentEventType.title}" is currently <strong>inactive</strong> in Calendly.
                      Candidates cannot open links using it — pick an active event type below, or
                      re-activate this one in your Calendly account.
                    </div>
                  )
                }
                return null
              })()}
              <select
                className="input"
                value={status.defaultEventTypeId || ''}
                onChange={(e) => handleSetEventType(e.target.value)}
                disabled={savingEventType}
              >
                <option value="" disabled>Select an event type…</option>
                {eventTypes.map((et) => (
                  <option key={et.id} value={et.id} disabled={!et.active}>
                    {et.title} ({et.length} min){et.active ? '' : ' — inactive in Calendly'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-surface-600 mt-1.5">
                Only active event types can be selected — inactive ones are grayed out and would produce a broken link for candidates.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
