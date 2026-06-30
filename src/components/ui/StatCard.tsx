import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: {
    value: number
    label: string
  }
  className?: string
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-brand-400',
  iconBg = 'bg-brand-500/10',
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', iconBg)}>
        <Icon className={cn('w-4.5 h-4.5', iconColor)} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-surface-500 mt-0.5">{label}</p>
      {trend && (
        <div className={cn('flex items-center gap-1 text-xs mt-2', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
          <span className="text-surface-600">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
