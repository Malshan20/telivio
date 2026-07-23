import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 bg-surface-800 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-surface-500" />
      </div>
      <h3 className="text-base font-semibold text-surface-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-surface-500 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary mt-5"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
