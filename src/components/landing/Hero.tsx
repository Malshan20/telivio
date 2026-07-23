import VerdictCard from './VerdictCard'
import Reveal from './Reveal'

export default function Hero() {
  return (
    <section className="hero-section" style={{ paddingTop: '8.5rem', paddingBottom: '5rem' }}>
      <div className="ambient-mesh" />
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '3rem',
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Left: thesis */}
          <div>
            <Reveal>
              <div className="eyebrow" style={{ marginBottom: 22 }}>Now screening resumes autonomously</div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="serif display-1" style={{ color: 'var(--ink)', marginBottom: 24 }}>
                Every resume
                <br />
                gets read.
                <br />
                <span style={{ color: 'var(--violet)' }}>Every time.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="lede" style={{ maxWidth: 460, marginBottom: 36 }}>
                Telivio is the AI recruiter that never skips a CV, never loses a great
                candidate in a pile of 400 applications, and never leaves anyone
                wondering if they&rsquo;ll hear back.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40 }}>
                <a href="/login" className="btn btn-primary" style={{ fontSize: 16, padding: '1rem 1.7rem' }}>
                  Start hiring with AI
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a href="#how-it-works" className="btn btn-ghost" style={{ fontSize: 16, padding: '1rem 1.5rem' }}>
                  See how it thinks
                </a>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex' }}>
                  {[
                    ['#6D5BFF', 'JL'], ['#1FCB8C', 'AT'], ['#FF6B57', 'MW'], ['#F5A623', 'SK'],
                  ].map(([color, init], i) => (
                    <div
                      key={i}
                      style={{
                        width: 30, height: 30, borderRadius: 999,
                        background: color, border: '2px solid var(--paper)',
                        marginLeft: i === 0 ? 0 : -9,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: 'white',
                        flexShrink: 0,
                      }}
                    >
                      {init}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: 13.5, color: 'var(--ink-faint)' }}>
                  Trusted by hiring teams at <strong style={{ color: 'var(--ink-soft)' }}>1,200+</strong> companies
                </span>
              </div>
            </Reveal>
          </div>

          {/* Right: signature element */}
          <Reveal delay={120}>
            <VerdictCard />
          </Reveal>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
        }
        @media (max-width: 640px) {
          .hero-section { padding-top: 6.5rem !important; padding-bottom: 3.5rem !important; }
        }
        @media (max-width: 420px) {
          .hero-section { padding-top: 6rem !important; }
        }
      `}</style>
    </section>
  )
}
