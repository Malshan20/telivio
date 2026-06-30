'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Attaches an IntersectionObserver to the returned ref and flips `visible`
 * to true the first time the element enters the viewport. Used to drive
 * the `.reveal` / `.is-visible` CSS classes for scroll-triggered fade-ups.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}
