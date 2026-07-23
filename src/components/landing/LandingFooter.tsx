import Link from 'next/link'

export default function LandingFooter() {
  return (
    <footer className="landing-footer" style={{ borderTop: '1px solid var(--line)', padding: '2.5rem 1.5rem', position: 'relative', zIndex: 1 }}>
      <div
        className="container footer-inner"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: 7,
              background: 'linear-gradient(160deg, #7d6cff, #4b3dd1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L4 8.5h3.5L6 14l6-7H8.5L8 2z" fill="white" />
            </svg>
          </div>
          <span className="serif" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>Telivio</span>
        </Link>

        <div className="footer-links" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['How it works', '#how-it-works'], ['Features', '#features'], ['FAQ', '#faq'], ['Sign in', '/login']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 13, color: 'var(--ink-faint)', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </div>

        <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>© 2026 Telivio</span>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .footer-inner { flex-direction: column !important; text-align: center; }
        }
      `}</style>
    </footer>
  )
}
