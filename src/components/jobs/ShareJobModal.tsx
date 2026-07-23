'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, Copy, Check, ExternalLink, Share2 } from 'lucide-react'

interface ShareJobModalProps {
  jobId: string
  jobTitle: string
  onClose: () => void
}

export default function ShareJobModal({ jobId, jobTitle, onClose }: ShareJobModalProps) {
  const [copied, setCopied] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const applyLink = `${appUrl}/apply/${jobId}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(applyLink)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy — select and copy the link manually')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-900 border border-surface-700 rounded-2xl shadow-panel animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600/20 rounded-lg flex items-center justify-center">
              <Share2 className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Publish "{jobTitle}"</h2>
              <p className="text-xs text-surface-500">Share this link anywhere candidates can find it</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-800 flex items-center justify-center text-surface-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Public Application Link</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={applyLink}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="input font-mono text-xs"
              />
              <button
                onClick={handleCopy}
                className="btn-primary flex-shrink-0 flex items-center gap-1.5 px-3"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="bg-surface-800/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Where to share it</p>
            <ul className="text-sm text-surface-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-brand-400">•</span> Paste it into your company's careers page
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400">•</span> Post it to LinkedIn, job boards, or social media
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-400">•</span> Email it directly to candidates you're sourcing
              </li>
            </ul>
          </div>

          <a
            href={applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Preview Application Page
          </a>

          <p className="text-xs text-surface-600 text-center">
            Anyone with this link can apply. Pause or close the job in Settings to stop accepting applications.
          </p>
        </div>
      </div>
    </div>
  )
}
