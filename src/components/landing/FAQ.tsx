'use client'

import { useState } from 'react'
import Reveal from './Reveal'

const FAQS = [
  {
    q: 'Does the AI reject candidates on its own?',
    a: 'No. The agent screens and recommends \u2014 it scores every resume and flags who clears your bar. But sending a rejection is always a deliberate action your team takes, with one click, never something that happens silently in the background.',
  },
  {
    q: 'Whose calendar do interviews actually book on?',
    a: 'Yours. Each company connects its own calendar during setup, so every interview Telivio schedules lands on your team\u2019s calendar \u2014 never Telivio\u2019s, never anyone else\u2019s.',
  },
  {
    q: 'Can we change how strict the scoring is?',
    a: 'Yes. There\u2019s a single threshold you control in Settings \u2014 raise it to only see exceptional matches, or lower it to see a wider net. The agent always respects whatever bar you set.',
  },
  {
    q: 'What happens to a candidate\u2019s resume and data?',
    a: 'It lives in your company\u2019s own private workspace, isolated from every other company on Telivio at the database level. Nobody outside your team can see it, and you can export or delete it at any time.',
  },
  {
    q: 'How long does it take to get a job posted and live?',
    a: 'A few minutes. Write the role, the agent gives you a link, and you share it however you already do \u2014 your careers page, LinkedIn, a job board. Applications start flowing the moment it\u2019s live.',
  },
  {
    q: 'Do candidates know an AI is involved?',
    a: 'Yes, transparently. The application page is clear that Telivio\u2019s agent is part of the process, and the language stays straightforward and respectful at every step \u2014 never a mystery, never a maze.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" style={{ background: 'var(--paper-warm)' }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <Reveal>
          <div className="eyebrow" style={{ marginBottom: 18, justifyContent: 'center', display: 'flex' }}>
            Questions, answered plainly
          </div>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="serif display-2" style={{ color: 'var(--ink)', textAlign: 'center', marginBottom: 48 }}>
            Things people ask before they say yes.
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="glass-panel" style={{ padding: '0.5rem', overflow: 'hidden' }}>
            {FAQS.map((item, i) => {
              const isOpen = open === i
              return (
                <div key={item.q} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="faq-trigger"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '1.4rem 1.25rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-question" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                      {item.q}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 28, height: 28, borderRadius: 999,
                        background: isOpen ? 'var(--violet)' : 'var(--line-strong)',
                        color: isOpen ? 'white' : 'var(--ink-faint)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s ease',
                        transform: isOpen ? 'rotate(45deg)' : 'none',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                  <div
                    style={{
                      maxHeight: isOpen ? 240 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.35s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    <p style={{ padding: '0 1.25rem 1.5rem', fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-soft)' }}>
                      {item.a}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .faq-trigger { padding: 1.1rem 1rem !important; }
          .faq-question { font-size: 14.5px !important; }
        }
      `}</style>
    </section>
  )
}
