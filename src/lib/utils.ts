import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CandidateStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export function getScoreBg(score: number): string {
  if (score >= 75) return 'bg-emerald-500/10 border-emerald-500/20'
  if (score >= 50) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Exceptional'
  if (score >= 75) return 'Strong Match'
  if (score >= 60) return 'Partial Match'
  if (score >= 40) return 'Weak Match'
  return 'Poor Match'
}

export function getStatusConfig(status: CandidateStatus) {
  const configs = {
    applied: {
      label: 'Applied',
      color: 'bg-surface-700 text-surface-300',
      dot: 'bg-surface-400',
    },
    screened: {
      label: 'Screened',
      color: 'bg-blue-500/10 text-blue-400',
      dot: 'bg-blue-400',
    },
    interview: {
      label: 'Interview',
      color: 'bg-brand-500/10 text-brand-400',
      dot: 'bg-brand-400',
    },
    offer: {
      label: 'Offer',
      color: 'bg-emerald-500/10 text-emerald-400',
      dot: 'bg-emerald-400',
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-500/10 text-red-400',
      dot: 'bg-red-400',
    },
  }
  return configs[status] || configs.applied
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h]
          const str = Array.isArray(val)
            ? val.join('; ')
            : String(val ?? '')
          return `"${str.replace(/"/g, '""')}"`
        })
        .join(',')
    ),
  ]

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
