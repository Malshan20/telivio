import Reveal from './Reveal'

export default function FinalCTA() {
  return (
    <section className="final-cta-section" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>
      <div className="container">
        <Reveal>
          <div
            className="final-cta-card"
            style={{
              position: 'relative',
              borderRadius: 32,
              overflow: 'hidden',
              padding: '5.5rem 2rem',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #2a1f6e 0%, #4b3dd1 45%, #6d5bff 75%, #8f7dff 100%)',
              boxShadow: '0 50px 100px -20px rgba(75, 61, 209, 0.45)',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(480px circle at 20% 20%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(420px circle at 85% 80%, rgba(31,203,140,0.25), transparent 60%)',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="serif" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)', color: 'white', lineHeight: 1.15, marginBottom: 20, maxWidth: 640, margin: '0 auto 20px' }}>
                Somewhere in your pile is the person you need to hire.{' '}
                <span style={{ whiteSpace: 'nowrap' }}>Let&rsquo;s go find them.</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, marginBottom: 36, maxWidth: 440, margin: '0 auto 36px' }}>
                Free to start. Live in minutes. No credit card needed.
              </p>
              <a
                href="/login"
                className="btn"
                style={{
                  background: 'white', color: 'var(--violet-deep)', fontSize: 16, padding: '1rem 2rem',
                  boxShadow: '0 20px 50px -10px rgba(0,0,0,0.35)',
                }}
              >
                Start hiring with AI →
              </a>
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .final-cta-card { padding: 3.25rem 1.5rem !important; border-radius: 24px !important; }
        }
        @media (max-width: 420px) {
          .final-cta-card span { white-space: normal !important; }
        }
      `}</style>
    </section>
  )
}
