'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The Verdict Card — Telivio's signature visual.
 *
 * A tilted, glassy panel that plays out the exact moment this product
 * exists to create: a resume goes in, the agent thinks, a verdict comes
 * back. It cycles through three real candidate scenarios so the page
 * feels alive rather than static, and tilts toward the cursor for a real
 * (not gimmicky) sense of physical depth — a deliberate, single bold risk
 * the rest of the page stays quiet around.
 */

interface Scenario {
  name: string
  role: string
  initials: string
  accent: string
  score: number
  verdict: 'interview' | 'pass'
  note: string
}

const SCENARIOS: Scenario[] = [
  { name: 'Priya Nair', role: 'Senior Backend Engineer', initials: 'PN', accent: '#6D5BFF', score: 91, verdict: 'interview', note: '6 yrs distributed systems, strong infra match' },
  { name: 'Marcus Webb', role: 'Product Designer', initials: 'MW', accent: '#FF6B57', score: 58, verdict: 'pass', note: 'Strong portfolio, limited B2B SaaS experience' },
  { name: 'Aiko Tanaka', role: 'Data Scientist', initials: 'AT', accent: '#1FCB8C', score: 87, verdict: 'interview', note: 'ML pipeline experience exceeds requirements' },
]

type Phase = 'applied' | 'thinking' | 'verdict'

export default function VerdictCard() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('applied')
  const [displayScore, setDisplayScore] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const scenario = SCENARIOS[index]

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none), (pointer: coarse)').matches)
  }, [])

  // Cycle: applied (0.9s) -> thinking (1.6s) -> verdict held (3.2s) -> next
  useEffect(() => {
    let raf: number
    let cancelled = false

    async function run() {
      setPhase('applied')
      setDisplayScore(0)
      await wait(900)
      if (cancelled) return
      setPhase('thinking')
      await wait(1600)
      if (cancelled) return
      setPhase('verdict')

      const target = scenario.score
      const start = performance.now()
      const duration = 700
      function tick(now: number) {
        const t = Math.min(1, (now - start) / duration)
        setDisplayScore(Math.round(target * easeOutCubic(t)))
        if (t < 1 && !cancelled) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      await wait(3400)
      if (cancelled) return
      setIndex((i) => (i + 1) % SCENARIOS.length)
    }

    run()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isTouchDevice) return
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -10, y: px * 14 })
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 })
  }

  const isInterview = scenario.verdict === 'interview'
  const restX = isTouchDevice ? 0 : 6
  const restY = isTouchDevice ? 0 : -8

  return (
    <div
      style={{ perspective: '1400px' }}
      className="w-full max-w-[420px] mx-auto verdict-card-wrap"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${restX + tilt.x}deg) rotateY(${restY + tilt.y}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
          transformStyle: 'preserve-3d',
        }}
        className="relative"
      >
        {/* Drop shadow layer (separate from card so 3D tilt reads correctly) */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '12% 6% -8% 6%',
            background: 'radial-gradient(ellipse at center, rgba(20,19,31,0.28), transparent 70%)',
            filter: 'blur(24px)',
            transform: 'translateZ(-40px)',
            zIndex: 0,
          }}
        />

        <div
          className="glass-panel relative overflow-hidden verdict-card-inner"
          style={{ padding: '28px', minHeight: 380 }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 8, height: 8, borderRadius: 999, background: '#1FCB8C',
                  boxShadow: '0 0 0 0 rgba(31,203,140,0.6)',
                  animation: 'count-pulse 1.6s ease-in-out infinite',
                }}
              />
              <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-faint)' }}>
                Telivio Agent
              </span>
            </div>
            <span className="mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              #{(index + 1).toString().padStart(3, '0')}
            </span>
          </div>

          {/* Candidate row */}
          <div className="flex items-center gap-3 mb-7">
            <div
              className="flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0"
              style={{ width: 46, height: 46, background: scenario.accent, fontSize: 15 }}
            >
              {scenario.initials}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>{scenario.name}</div>
              <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>{scenario.role}</div>
            </div>
          </div>

          {/* Phase: applied */}
          <div style={{ minHeight: 168 }} className="flex flex-col items-center justify-center text-center">
            {phase === 'applied' && (
              <div style={{ animation: 'pop-in 0.4s ease-out' }}>
                <div className="text-[13px] font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
                  Application received
                </div>
                <div className="serif" style={{ fontSize: 22, color: 'var(--ink)' }}>
                  Reading the resume&hellip;
                </div>
              </div>
            )}

            {phase === 'thinking' && (
              <div style={{ animation: 'pop-in 0.4s ease-out' }} className="flex flex-col items-center">
                <ThinkingRing />
                <div className="text-[13px] font-medium mt-4" style={{ color: 'var(--ink-soft)' }}>
                  Scoring against the role&rsquo;s requirements
                </div>
              </div>
            )}

            {phase === 'verdict' && (
              <div style={{ animation: 'pop-in 0.5s cubic-bezier(0.16,1,0.3,1)' }} className="w-full">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="mono" style={{ fontSize: 56, fontWeight: 600, color: isInterview ? '#1FCB8C' : '#FF6B57', letterSpacing: '-0.03em' }}>
                    {displayScore}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--ink-faint)' }}>/ 100</span>
                </div>
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold"
                  style={{
                    background: isInterview ? 'var(--mint-pale)' : 'var(--coral-pale)',
                    color: isInterview ? '#0f8a5f' : '#c44a37',
                  }}
                >
                  {isInterview ? '✓ Interview recommended' : '○ Not a fit this time'}
                </div>
                <p className="text-[13px] mt-4 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                  {scenario.note}
                </p>
              </div>
            )}
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {SCENARIOS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === index ? 16 : 5,
                  height: 5,
                  borderRadius: 999,
                  background: i === index ? 'var(--violet)' : 'var(--line-strong)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 420px) {
          .verdict-card-inner { padding: 22px !important; min-height: 340px !important; }
        }
      `}</style>
    </div>
  )
}

function ThinkingRing() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ animation: 'count-pulse 2s ease-in-out infinite' }}>
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--line-strong)" strokeWidth="4" />
      <circle
        cx="32" cy="32" r="26" fill="none" stroke="var(--violet)" strokeWidth="4"
        strokeDasharray="40 123" strokeLinecap="round"
        style={{ transformOrigin: '32px 32px', animation: 'spin 1.1s linear infinite' }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}
