import Reveal from './Reveal'

const LETTERS = [
  {
    quote: "We had 412 applications for one design role. Telivio surfaced the seven worth our time by Tuesday morning, with the reasoning for each one. We hired by Friday.",
    name: 'Mia Tanaka',
    role: 'Head of People, Vantage Labs',
    initials: 'MT',
    color: '#6D5BFF',
    bg: 'var(--violet-pale)',
  },
  {
    quote: "The rejection emails are the real surprise. Candidates reply thanking us \u2014 that never happened before. Turns out being clear and kind costs nothing extra.",
    name: 'David Osei',
    role: 'VP Engineering, Northwind',
    initials: 'DO',
    color: '#1FCB8C',
    bg: 'var(--mint-pale)',
  },
  {
    quote: "I was the skeptic on our team. Three months in, the agent caught a backend candidate we\u2019d have filtered out by job title alone. Best hire of the year.",
    name: 'Rachel Kim',
    role: 'Talent Lead, Castor & Co.',
    initials: 'RK',
    color: '#FF6B57',
    bg: 'var(--coral-pale)',
  },
]

export default function Testimonials() {
  return (
    <section>
      <div className="container">
        <Reveal>
          <div className="eyebrow" style={{ marginBottom: 18 }}>From the people who use it</div>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="serif display-2" style={{ color: 'var(--ink)', maxWidth: 600, marginBottom: 56 }}>
            Hiring teams notice the difference fast.
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }} className="letters-grid">
          {LETTERS.map((l, i) => (
            <Reveal key={l.name} delay={i * 90}>
              <div
                className="flat-card"
                style={{
                  padding: '2rem',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none" style={{ marginBottom: 18, opacity: 0.18 }}>
                  <path d="M0 22V13.5C0 6 4.5 1 11 0L12.2 3.8C8 5 6.2 7.4 5.8 10.5H11V22H0ZM16 22V13.5C16 6 20.5 1 27 0L28.2 3.8C24 5 22.2 7.4 21.8 10.5H27V22H16Z" fill="var(--ink)" />
                </svg>

                <p className="serif" style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--ink)', flex: 1, marginBottom: 24 }}>
                  {l.quote}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 999, background: l.bg, color: l.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13, flexShrink: 0,
                    }}
                  >
                    {l.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{l.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{l.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .letters-grid { grid-template-columns: 1fr !important; max-width: 480px; margin: 0 auto; }
        }
      `}</style>
    </section>
  )
}
