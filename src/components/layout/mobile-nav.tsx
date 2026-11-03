import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import type { Role } from '@/lib/types'
import { currentAccount, useAppState } from '@/lib/store'
import { cn } from '@/lib/utils'
import { mobileNavForRole } from './nav'
import type { NavBadge } from './nav'

function useCounts() {
  const state = useAppState()
  const account = currentAccount(state)
  const isP3mi = account?.role === 'p3mi_admin' || account?.role === 'p3mi_reviewer'
  return {
    referrals: isP3mi
      ? state.referrals.filter((r) => r.orgId === account.orgId && r.status === 'submitted').length
      : 0,
    documents: isP3mi
      ? state.documents.filter((d) => d.orgId === account.orgId && d.status === 'pending_review').length
      : 0,
    visits: 0,
    complaints: 0,
  } as Record<NavBadge, number>
}

export function MobileNav({ onMore }: { onMore: () => void }) {
  const state = useAppState()
  const account = currentAccount(state)
  const counts = useCounts()
  if (!account) return null
  const { items, moreLabel } = mobileNavForRole(account.role)
  const columns = items.length + 1

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      aria-label="Navigasi utama"
      data-testid="mobile-bottom-nav"
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon
          const badge = item.badge ? counts[item.badge] : 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'focus-ring relative flex h-[60px] flex-col items-center justify-center gap-1 text-[9px] font-bold',
                  isActive ? 'text-brand' : 'text-slate-500',
                  item.cta && !isActive && 'text-brand-deep',
                )
              }
              data-testid={`mobile-nav-${item.to.replace('/', '-')}`}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'relative flex h-8 w-10 items-center justify-center rounded-xl transition-colors',
                      item.cta
                        ? 'bg-accent text-brand-deep shadow-sm'
                        : isActive
                          ? 'bg-brand-soft text-brand'
                          : 'text-slate-500',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {badge > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-extrabold text-white">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={onMore}
          data-testid="mobile-nav-more-btn"
          className="focus-ring flex h-[60px] flex-col items-center justify-center gap-1 text-[9px] font-bold text-slate-500"
        >
          <span className="flex h-8 w-10 items-center justify-center rounded-xl">
            <Menu className="h-[18px] w-[18px]" />
          </span>
          {moreLabel}
        </button>
      </div>
    </nav>
  )
}

export function roleLabelForBottom(role: Role) {
  return role === 'cpmi' ? 'CPMI' : 'ARBLOK'
}
