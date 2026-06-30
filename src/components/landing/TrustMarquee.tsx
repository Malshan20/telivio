/**
 * Each fictional company in this trust band gets its own small abstract
 * mark (a simple geometric glyph in a tinted rounded square) so the row
 * reads as a real logo bar rather than plain text — without using any
 * actual brand's trademark, since none of these companies are real.
 */
const COMPANIES: { name: string; color: string; bg: string; glyph: 'triangle' | 'ring' | 'bars' | 'hex' | 'wave' | 'dot-grid' | 'arrow' | 'anchor' }[] = [
  { name: 'Northwind', color: '#4B3DD1', bg: '#EEEBFF', glyph: 'triangle' },
  { name: 'Vantage Labs', color: '#0F8A5F', bg: '#E3F9EF', glyph: 'ring' },
  { name: 'Orbital', color: '#C44A37', bg: '#FFE9E4', glyph: 'dot-grid' },
  { name: 'Fernhill', color: '#B8780E', bg: '#FDF1E0', glyph: 'wave' },
  { name: 'Castor & Co.', color: '#4B3DD1', bg: '#EEEBFF', glyph: 'hex' },
  { name: 'Meridian', color: '#0F8A5F', bg: '#E3F9EF', glyph: 'bars' },
  { name: 'Hollow Peak', color: '#C44A37', bg: '#FFE9E4', glyph: 'triangle' },
  { name: 'Anchorpoint', color: '#B8780E', bg: '#FDF1E0', glyph: 'anchor' },
]

function Glyph({ type, color }: { type: typeof COMPANIES[number]['glyph']; color: string }) {
  const s = { width: 16, height: 16 } as const
  switch (type) {
    case 'triangle':
      return <svg {...s} viewBox="0 0 16 16" fill="none"><path d="M8 2.5L14 13H2L8 2.5z" fill={color} /></svg>
    case 'ring':
      return <svg {...s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth="2.4" /></svg>
    case 'bars':
      return (
        <svg {...s} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="8" width="3" height="6" rx="1" fill={color} />
          <rect x="6.5" y="4" width="3" height="10" rx="1" fill={color} />
          <rect x="11" y="1" width="3" height="13" rx="1" fill={color} />
        </svg>
      )
    case 'hex':
      return <svg {...s} viewBox="0 0 16 16" fill="none"><path d="M8 1l6 3.5v7L8 15l-6-3.5v-7L8 1z" fill={color} /></svg>
    case 'wave':
      return (
        <svg {...s} viewBox="0 0 16 16" fill="none">
          <path d="M1 9c1.5 0 1.5-3 3-3s1.5 3 3 3 1.5-3 3-3 1.5 3 3 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'dot-grid':
      return (
        <svg {...s} viewBox="0 0 16 16" fill="none">
          {[3, 8, 13].flatMap((cx) => [3, 8, 13].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill={color} />))}
        </svg>
      )
    case 'arrow':
      return <svg {...s} viewBox="0 0 16 16" fill="none"><path d="M3 13L13 3M13 3H6M13 3v7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'anchor':
      return (
        <svg {...s} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3" r="1.6" stroke={color} strokeWidth="1.6" />
          <path d="M8 4.5V14M4 14c0-2.5 2-3.5 4-3.5s4 1 4 3.5M2 9c0 2.8 2.5 5 6 5s6-2.2 6-5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
  }
}

function CompanyMark({ company }: { company: typeof COMPANIES[number] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <div
        style={{
          width: 30, height: 30, borderRadius: 9,
          background: company.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden
      >
        <Glyph type={company.glyph} color={company.color} />
      </div>
      <span
        className="serif marquee-name"
        style={{ fontSize: 20, color: 'var(--ink-faint)', whiteSpace: 'nowrap', fontWeight: 400 }}
      >
        {company.name}
      </span>
    </div>
  )
}

export default function TrustMarquee() {
  return (
    <div className="marquee-wrap" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '2.25rem 0', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <div
        className="marquee-track"
        style={{
          display: 'flex',
          gap: '3rem',
          width: 'max-content',
          animation: 'marquee-scroll 32s linear infinite',
        }}
      >
        {[...COMPANIES, ...COMPANIES].map((company, i) => (
          <CompanyMark key={i} company={company} />
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .marquee-wrap { padding: 1.65rem 0 !important; }
          .marquee-track { gap: 2rem !important; animation-duration: 22s !important; }
          .marquee-name { font-size: 16px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
