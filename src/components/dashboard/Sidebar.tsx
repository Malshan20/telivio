'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { cn, initials } from '@/lib/utils'
import {
  Zap, LayoutDashboard, Briefcase, Users, KanbanSquare,
  Settings, LogOut, ChevronDown, BarChart3, CreditCard, Lock, Building2,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { usePlanStatus } from '@/lib/usePlanStatus'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, requiresFeature: 'analyticsDashboard' as const },
  { href: '/dashboard/agency', label: 'Workspaces', icon: Building2, requiresFeature: 'multipleWorkspaces' as const },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [signingOut, setSigningOut] = useState(false)
  const { status: planStatus } = usePlanStatus()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 flex-shrink-0 border-r border-surface-800 bg-surface-900 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-5 border-b border-surface-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">Telivio</span>
          <span className="ml-auto text-[10px] font-medium bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full">AI</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-surface-600 uppercase tracking-widest px-3 mb-2 mt-1">Menu</p>
        {navItems.map((item) => {
          // Feature-gated nav items still navigate (the destination page
          // shows its own UpgradePrompt) — the lock icon is just a heads-up
          // so HR isn't surprised when they click through and hit a paywall.
          const isLocked = item.requiresFeature && planStatus && !planStatus.features[item.requiresFeature]
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                isActive(item.href, item.exact) ? 'nav-item-active' : 'nav-item',
                'justify-between'
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </span>
              {isLocked && <Lock className="w-3 h-3 text-surface-600 flex-shrink-0" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-surface-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-800 transition-colors">
          <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-brand-400">
              {initials(user.full_name || user.email)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.full_name || 'HR User'}
            </p>
            <p className="text-xs text-surface-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="nav-item w-full mt-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
