import Reveal from './Reveal'

const ACTS = [
  {
    num: '01',
    word: 'Apply',
    color: '#6D5BFF',
    bg: 'var(--violet-pale)',
    title: 'A candidate hits submit.',
    body: 'They upload a resume, answer a few questions, and that\u2019s it for them. No portal to check obsessively. No wondering if a human will ever open the file.',
  },
  {
    num: '02',
    word: 'Think',
    color: '#F5A623',
    bg: '#FDF1E0',
    title: 'The agent reads everything.',
    body: 'Every line of experience gets weighed against what the role actually needs \u2014 not keyword matching, real reasoning about fit, gaps, and potential.',
  },
  {
    num: '03',
    word: 'Know',
    color: '#1FCB8C',
    bg: 'var(--mint-pale)',
    title: 'An answer arrives \u2014 fast.',
    body: 'Strong match? An interview link lands in their inbox in minutes. Not quite right? A clear, kind answer instead of permanent silence.',
  },
]

export default function HowItFeels() {
  return (
    <section id="how-it-works">
      <div className="container">
        <Reveal>
          <div className="eyebrow" style={{ marginBottom: 18 }}>The experience, end to end</div>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="serif display-2" style={{ color: 'var(--ink)', maxWidth: 640, marginBottom: 64 }}>
            What it actually feels like to apply somewhere that uses Telivio.
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="acts-grid">
          {ACTS.map((act, i) => (
            <Reveal key={act.num} delay={i * 110}>
              <div
                className="flat-card"
                style={{ padding: '2.25rem 1.75rem', height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <div
                  style={{
                    width: 52, height: 52, borderRadius: 16, background: act.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 24,
                  }}
                >
                  <span className="mono" style={{ fontWeight: 700, fontSize: 15, color: act.color }}>{act.num}</span>
                </div>
                <div className="eyebrow" style={{ color: act.color, marginBottom: 10 }}>{act.word}</div>
                <h3 className="serif" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.25 }}>
                  {act.title}
                </h3>
                <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.65 }}>
                  {act.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .acts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
