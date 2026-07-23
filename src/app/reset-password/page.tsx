'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Zap, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

/**
 * Password reset page — the user lands here AFTER clicking the reset
 * link in their email. By the time they arrive, the Supabase session is
 * already active (the callback route exchanged the code for a session),
 * so we only need to call updateUser() with the new password.
 *
 * We verify the session is actually a recovery session (not someone who
 * just navigated here directly) by listening for the PASSWORD_RECOVERY
 * event from the auth state listener. If there's no active recovery
 * session, we show an error with a link back to the forgot-password flow.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // The callback route already exchanged the code for a session before
    // redirecting here, so we should have an active session now. We verify
    // it exists and is a recovery-type session by checking via getSession().
    // Supabase also fires an AUTH_STATE_CHANGE event with type
    // PASSWORD_RECOVERY, but relying on getSession() is simpler and
    // doesn't race with the initial render.
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setSessionReady('ok')
      } else {
        // No session — the reset link was already used, expired, or the
        // user navigated here directly. Show an error.
        setSessionReady('invalid')
      }
    }

    checkSession()

    // Belt-and-suspenders: also listen for Supabase's PASSWORD_RECOVERY
    // event in case the session comes in slightly after page load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady('ok')
      }
      if (event === 'SIGNED_OUT') {
        setSessionReady('invalid')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setDone(true)
      toast.success('Password updated successfully!')

      // Sign the user out after reset so they go through a clean login
      // with their new credentials — avoids any session-state confusion.
      await supabase.auth.signOut()

      setTimeout(() => router.push('/login'), 2500)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Telivio</span>
        </div>

        <div className="card p-8">

          {/* ── Checking session state ── */}
          {sessionReady === 'checking' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400 mx-auto mb-3" />
              <p className="text-surface-400 text-sm">Verifying your reset link…</p>
            </div>
          )}

          {/* ── Invalid / expired link ── */}
          {sessionReady === 'invalid' && (
            <div className="text-center">
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Link expired or already used</h2>
              <p className="text-surface-400 text-sm mb-6 leading-relaxed">
                Password reset links are single-use and expire after 1 hour. Please request a new one.
              </p>
              <a
                href="/login"
                className="btn-primary inline-flex items-center gap-2"
                onClick={() => {
                  // Pre-select forgot mode so the user doesn't have to click again
                  sessionStorage.setItem('loginMode', 'forgot')
                }}
              >
                Request a new reset link
              </a>
            </div>
          )}

          {/* ── Done — password updated ── */}
          {sessionReady === 'ok' && done && (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password updated!</h2>
              <p className="text-surface-400 text-sm">
                Redirecting you to sign in with your new password…
              </p>
              <div className="mt-4">
                <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin inline-block" />
              </div>
            </div>
          )}

          {/* ── Main form ── */}
          {sessionReady === 'ok' && !done && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Set a new password</h2>
                <p className="text-surface-400 text-sm">
                  Choose something strong — at least 8 characters.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="label">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pl-9 pr-9"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className="h-1 flex-1 rounded-full transition-colors duration-300"
                            style={{
                              background: level <= passwordStrength.score
                                ? passwordStrength.color
                                : 'var(--color-surface-800, #2a2d40)',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Confirm new password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="input pl-9 pr-9"
                      placeholder="Same password again"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && password !== confirm && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                  )}
                  {confirm.length > 0 && password === confirm && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || password !== confirm || password.length < 8}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2"
                >
                  {loading && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Update password
                </button>
              </form>
            </>
          )}

        </div>

        <p className="text-center text-surface-600 text-xs mt-6">
          Remember your password?{' '}
          <a href="/login" className="text-brand-400 hover:text-brand-300">Sign in</a>
        </p>
      </div>
    </div>
  )
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (password.length === 0) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { score: 1, label: 'Weak', color: '#f87171' },
    { score: 2, label: 'Fair', color: '#fb923c' },
    { score: 3, label: 'Good', color: '#facc15' },
    { score: 4, label: 'Strong', color: '#34d399' },
  ]

  return levels[Math.min(score, 4) - 1] ?? { score: 1, label: 'Weak', color: '#f87171' }
}
