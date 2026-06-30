'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '#faq' },
]

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll while the mobile menu is open, and close it on resize
  // up to desktop width so it can't get stuck open behind the desktop nav.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 860) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleLinkClick() {
    setMenuOpen(false)
  }

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: scrolled ? 14 : 0,
          left: 0,
          right: 0,
          zIndex: 200,
          display: 'flex',
          justifyContent: 'center',
          transition: 'top 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div
          className="nav-shell"
          style={{
            width: scrolled ? 'min(900px, calc(100% - 32px))' : '100%',
            maxWidth: scrolled ? 900 : 'none',
            background: scrolled || menuOpen ? 'rgba(255,255,255,0.82)' : 'transparent',
            backdropFilter: scrolled || menuOpen ? 'blur(20px) saturate(1.4)' : 'none',
            border: scrolled || menuOpen ? '1px solid rgba(255,255,255,0.9)' : '1px solid transparent',
            borderRadius: scrolled ? 18 : menuOpen ? '18px 18px 0 0' : 0,
            boxShadow: scrolled || menuOpen ? '0 8px 32px rgba(20,19,31,0.1)' : 'none',
            padding: scrolled ? '10px 16px' : '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <Link href="/" onClick={handleLinkClick} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(160deg, #7d6cff, #4b3dd1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(109,91,255,0.35)',
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L4 8.5h3.5L6 14l6-7H8.5L8 2z" fill="white" />
              </svg>
            </div>
            <span className="serif" style={{ fontSize: 19, fontWeight: 500, color: 'var(--ink)' }}>Telivio</span>
          </Link>

          {/* Desktop links */}
          <div style={{ display: 'none', alignItems: 'center', gap: 28 }} className="nav-links-desktop">
            {LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-soft)', textDecoration: 'none' }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div style={{ display: 'none', alignItems: 'center', gap: 10 }} className="nav-cta-desktop">
            <Link href="/login" className="btn btn-ghost" style={{ padding: '0.6rem 1.1rem', fontSize: 14 }}>
              Sign in
            </Link>
            <Link href="/login" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: 14 }}>
              Get started
            </Link>
          </div>

          {/* Mobile hamburger — animates into an X when open */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="nav-burger"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 11,
              border: '1px solid var(--line-strong)',
              background: 'var(--glass-fill)',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ position: 'relative', width: 18, height: 13, display: 'block' }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 2,
                    borderRadius: 2,
                    background: 'var(--ink)',
                    top: i === 0 ? 0 : i === 1 ? 5.5 : 11,
                    opacity: menuOpen && i === 1 ? 0 : 1,
                    transform: menuOpen
                      ? i === 0
                        ? 'translateY(5.5px) rotate(45deg)'
                        : i === 2
                          ? 'translateY(-5.5px) rotate(-45deg)'
                          : 'none'
                      : 'none',
                    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              ))}
            </span>
          </button>
        </div>

        {/* Mobile slide-down panel */}
        <div
          className="nav-mobile-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: scrolled ? 'calc(50% - min(450px, calc(50% - 16px)))' : 0,
            right: scrolled ? 'calc(50% - min(450px, calc(50% - 16px)))' : 0,
            width: scrolled ? 'min(900px, calc(100% - 32px))' : '100%',
            maxHeight: menuOpen ? 420 : 0,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px) saturate(1.4)',
            border: menuOpen ? '1px solid rgba(255,255,255,0.9)' : '1px solid transparent',
            borderTop: 'none',
            borderRadius: scrolled ? '0 0 18px 18px' : '0 0 20px 20px',
            boxShadow: menuOpen ? '0 16px 40px rgba(20,19,31,0.14)' : 'none',
            transition: 'max-height 0.38s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease',
          }}
        >
          <div style={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {LINKS.map(({ label, href }, i) => (
              <a
                key={label}
                href={href}
                onClick={handleLinkClick}
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  padding: '14px 4px',
                  borderBottom: i < LINKS.length - 1 ? '1px solid var(--line)' : 'none',
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? 'translateY(0)' : 'translateY(-6px)',
                  transition: `opacity 0.3s ease ${menuOpen ? 0.08 * i + 0.05 : 0}s, transform 0.3s ease ${menuOpen ? 0.08 * i + 0.05 : 0}s`,
                }}
              >
                {label}
              </a>
            ))}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 14,
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(-6px)',
                transition: `opacity 0.3s ease ${menuOpen ? 0.3 : 0}s, transform 0.3s ease ${menuOpen ? 0.3 : 0}s`,
              }}
            >
              <Link
                href="/login"
                onClick={handleLinkClick}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '0.85rem 1rem' }}
              >
                Sign in
              </Link>
              <Link
                href="/login"
                onClick={handleLinkClick}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '0.85rem 1rem' }}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Backdrop scrim behind the mobile panel */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          background: 'rgba(20,19,31,0.25)',
          backdropFilter: 'blur(2px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      <style>{`
        @media (min-width: 860px) {
          .nav-links-desktop { display: flex !important; }
          .nav-cta-desktop { display: flex !important; }
          .nav-burger { display: none !important; }
          .nav-mobile-panel { display: none !important; }
        }
        @media (max-width: 859px) {
          .nav-shell { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>
    </>
  )
}
