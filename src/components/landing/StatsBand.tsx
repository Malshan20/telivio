import Reveal from './Reveal'

const STATS = [
  { value: '2.4M+', label: 'Resumes read in full' },
  { value: '47 sec', label: 'Average time to a verdict' },
  { value: '94%', label: 'Reasoning agreement with senior recruiters' },
  { value: '0', label: 'Applications left unanswered' },
]

export default function StatsBand() {
  return (
    <section style={{ paddingTop: '1rem', paddingBottom: '5rem' }}>
      <div className="container">
        <Reveal>
          <div
            className="glass-panel"
            style={{
              padding: '2.75rem 2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
            }}
            id="stats-grid"
          >
            {STATS.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', borderRight: i < 3 ? '1px solid var(--line)' : 'none' }} className="stat-cell">
                <div className="serif" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: 'var(--ink)', marginBottom: 6, fontWeight: 500 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 760px) {
          #stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 2rem 1rem !important; }
          .stat-cell:nth-child(2) { border-right: none !important; }
          .stat-cell { border-right: none !important; }
        }
        @media (max-width: 420px) {
          #stats-grid { padding: 1.75rem 1.25rem !important; }
        }
      `}</style>
    </section>
  )
}
