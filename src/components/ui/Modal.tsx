'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-surface-900 border border-surface-700 rounded-2xl shadow-panel animate-slide-up flex flex-col max-h-[90vh]',
          sizeMap[size]
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-6 py-5 border-b border-surface-800 flex-shrink-0">
            <div>
              {title && <h2 className="font-semibold text-white">{title}</h2>}
              {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-800 flex items-center justify-center text-surface-400 hover:text-white transition-colors flex-shrink-0 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {footer && (
          <div className="border-t border-surface-800 px-6 py-4 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
