import Reveal from './Reveal'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Score with reasoning, not guesswork',
    body: 'Every candidate gets a 0\u2013100 score with the actual reasoning behind it \u2014 strengths, gaps, and why. Never a black box.',
  },
  {
    icon: '📅',
    title: 'Interviews book themselves',
    body: 'Strong matches get a real scheduling link on your team\u2019s own calendar, the moment they qualify. No back-and-forth emails.',
  },
  {
    icon: '✉️',
    title: 'Every reply sounds human',
    body: 'Rejection emails that read like a thoughtful person wrote them \u2014 because the intent did. Candidates write back to say thanks.',
  },
  {
    icon: '🗂️',
    title: 'One pipeline, fully visible',
    body: 'A live Kanban of every applicant, every score, every note your team has left. Drag a card, the agent stays in sync.',
  },
  {
    icon: '🔒',
    title: 'Your data stays yours',
    body: 'Each company gets a fully isolated workspace. Your candidates, your calendar connection, your hiring bar \u2014 never shared.',
  },
  {
    icon: '🎯',
    title: 'A bar you set, not we set',
    body: 'Tune the score threshold that decides who moves forward. The agent recommends \u2014 your team always makes the final call.',
  },
]

export default function Features() {
  return (
    <section id="features" style={{ background: 'var(--paper-warm)' }}>
      <div className="container">
        <Reveal>
          <div className="eyebrow" style={{ marginBottom: 18 }}>Everything underneath</div>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="serif display-2" style={{ color: 'var(--ink)', maxWidth: 600, marginBottom: 56 }}>
            Built to do one job exceptionally well.
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="features-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div
                className="flat-card"
                style={{ padding: '1.85rem', height: '100%' }}
              >
                <div style={{ fontSize: 26, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .features-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
