'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'

type Mode = 'login' | 'signup' | 'forgot'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Show a banner if redirected here due to an auth callback error
  const authError = searchParams.get('error')

  // If they landed here because their reset link expired, drop them
  // straight into forgot-password mode so they can request a new one
  // without an extra click.
  useEffect(() => {
    if (authError === 'reset_link_expired') {
      setMode('forgot')
    }
  }, [authError])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
        router.push('/dashboard')
        router.refresh()

      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        toast.success('Account created! Check your email to confirm.')

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          // Supabase will append ?code=...&type=recovery to this URL.
          // Our callback route detects type=recovery and sends the user
          // to /reset-password instead of the dashboard.
          redirectTo: `${window.location.origin}/api/auth/callback?type=recovery`,
        })
        if (error) throw error
        setForgotSent(true)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-surface-900 border-r border-surface-800 p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Telivio</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Hire smarter with<br />
            <span className="text-gradient">autonomous AI</span>
          </h1>
          <p className="text-surface-400 text-lg leading-relaxed mb-8">
            Telivio screens resumes, scores candidates, and schedules interviews — all on autopilot.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🤖', title: 'AI Resume Scoring', desc: 'Groq-powered scoring with detailed reasoning' },
              { icon: '📅', title: 'Auto Scheduling', desc: 'Calendly integration for seamless interview booking' },
              { icon: '✉️', title: 'Smart Emails', desc: 'Personalized outreach via Resend' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{f.title}</p>
                  <p className="text-surface-500 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-surface-600 text-sm">© 2026 Telivio. All rights reserved.</p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">Telivio</span>
          </div>

          {/* Auth error banner */}
          {authError && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {authError === 'reset_link_expired'
                ? 'That reset link has expired or already been used. Request a new one below.'
                : 'Authentication failed. Please try again or request a new link.'}
            </div>
          )}

          {/* ── FORGOT PASSWORD — success state ── */}
          {mode === 'forgot' && forgotSent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-surface-400 text-sm mb-6 leading-relaxed">
                We sent a password reset link to <strong className="text-white">{email}</strong>.
                Click the link in that email to set a new password.
              </p>
              <p className="text-surface-600 text-xs mb-6">
                Didn't receive it? Check your spam folder, or{' '}
                <button
                  onClick={() => { setForgotSent(false) }}
                  className="text-brand-400 hover:text-brand-300"
                >
                  try again
                </button>.
              </p>
              <button
                onClick={() => { setMode('login'); setForgotSent(false) }}
                className="text-sm text-surface-400 hover:text-white flex items-center gap-1.5 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </div>

          ) : (
            <>
              {/* Back link for forgot mode */}
              {mode === 'forgot' && (
                <button
                  onClick={() => setMode('login')}
                  className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-white mb-6"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>
              )}

              <h2 className="text-2xl font-bold text-white mb-1">
                {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
              </h2>
              <p className="text-surface-400 text-sm mb-8">
                {mode === 'login'
                  ? 'Access your recruiting dashboard'
                  : mode === 'signup'
                    ? 'Start hiring with AI in minutes'
                    : 'Enter your email and we\'ll send a reset link'}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Jane Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input
                      type="email"
                      className="input pl-9"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="label" style={{ margin: 0 }}>Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setMode('forgot'); setPassword('') }}
                          className="text-xs text-brand-400 hover:text-brand-300"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input pl-9 pr-9"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2"
                >
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
                </button>
              </form>

              {mode !== 'forgot' && (
                <p className="text-center text-surface-500 text-sm mt-6">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-brand-400 hover:text-brand-300 font-medium"
                  >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-950" />}>
      <LoginContent />
    </Suspense>
  )
}
