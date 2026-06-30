import type { Metadata } from 'next'
import Link from 'next/link'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'
import '@/components/landing/landing.css'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'
import { CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing — Telivio',
  description: `Simple, transparent pricing for AI-powered recruiting. Plans from $${PLANS.starter.priceMonthly}/month, with a ${TRIAL_DAYS}-day free trial on every plan — no credit card required.`,
}

export default function PricingPage() {
  return (
    <div className="telivio-landing">
      <div className="grain" />
      <LandingNav />

      <section style={{ paddingTop: '8.5rem', paddingBottom: '2rem' }}>
        <div className="ambient-mesh" />
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 20 }}>
            {TRIAL_DAYS}-day free trial · no credit card required
          </div>
          <h1 className="serif display-1" style={{ color: 'var(--ink)', marginBottom: 20, fontSize: 'clamp(2.25rem, 5vw, 3.75rem)' }}>
            Simple pricing.<br />
            <span style={{ color: 'var(--violet)' }}>No surprises.</span>
          </h1>
          <p className="lede" style={{ maxWidth: 480, margin: '0 auto' }}>
            Every plan includes the full AI screening agent. Pick the one that matches how much hiring you're doing.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: '2rem' }}>
        <div className="container">
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {Object.values(PLANS).map((plan) => (
              <div
                key={plan.id}
                className="flat-card pricing-card"
                style={{
                  padding: '2.25rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  ...(plan.id === 'growth' ? { border: '2px solid var(--violet)', boxShadow: 'var(--shadow-card)' } : {}),
                }}
              >
                {plan.id === 'growth' && (
                  <span
                    style={{
                      position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--violet)', color: 'white', fontSize: 11, fontWeight: 700,
                      padding: '4px 14px', borderRadius: 100, letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}
                  >
                    Most Popular
                  </span>
                )}

                <h3 className="serif" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 6 }}>{plan.name}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--ink-faint)', marginBottom: 20, minHeight: 36 }}>{plan.tagline}</p>

                <div style={{ marginBottom: 24 }}>
                  <span className="serif" style={{ fontSize: 44, color: 'var(--ink)', fontWeight: 500 }}>${plan.priceMonthly}</span>
                  <span style={{ fontSize: 14, color: 'var(--ink-faint)' }}>/month</span>
                </div>

                <Link
                  href={`/login?plan=${plan.id}`}
                  className={plan.id === 'growth' ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 28 }}
                >
                  Start {TRIAL_DAYS}-day free trial
                </Link>

                <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  {plan.highlights.map((h, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 14, color: 'var(--ink-soft)' }}>
                      {h.startsWith('Everything in') ? (
                        <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', fontStyle: 'italic' }}>{h}</span>
                      ) : (
                        <>
                          <CheckCircle2 size={16} style={{ color: 'var(--mint)', flexShrink: 0, marginTop: 2 }} />
                          {h}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--ink-faint)', marginTop: 36 }}>
            All plans include the same AI agent, the same Cal.com scheduling, and the same tenant-isolated workspace. Higher tiers unlock more capacity and more workflow features — never a worse agent.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          <h2 className="serif display-2" style={{ textAlign: 'center', color: 'var(--ink)', marginBottom: 48 }}>
            Which plan is right for you?
          </h2>
          <div className="pricing-compare-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { plan: 'Starter', who: 'You\u2019re a founder or small team hiring for 1\u20133 roles at a time, doing your own screening.' },
              { plan: 'Growth', who: 'You\u2019re hiring across multiple roles simultaneously and need notes, analytics, and faster processing.' },
              { plan: 'Agency', who: 'You\u2019re a recruiting agency managing hiring for several client companies from one place.' },
            ].map((item) => (
              <div key={item.plan} className="flat-card" style={{ padding: '1.75rem' }}>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{item.plan}</p>
                <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{item.who}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />

      <style>{`
        @media (max-width: 900px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
          .pricing-compare-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
