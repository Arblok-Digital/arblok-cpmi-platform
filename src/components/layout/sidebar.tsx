import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Building2, LogOut, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { currentAccount, logout, resetDemo, useAppState } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/misc'
import { navForRole } from './nav'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-black text-brand-deep shadow-sm">
        A
      </span>
      {!compact ? (
        <span className="leading-none">
          <span className="block text-sm font-extrabold tracking-[0.08em] text-white">ARBLOK</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-white/50">
            CPMI Partner
          </span>
        </span>
      ) : null}
    </span>
  )
}

function useBadgeCounts() {
  const state = useAppState()
  const account = currentAccount(state)
  if (!account) {
    return { referrals: 0, documents: 0, visits: 0, complaints: 0 }
  }
  const isP3mi = account.role === 'p3mi_admin' || account.role === 'p3mi_reviewer'
  return {
    referrals: isP3mi
      ? state.referrals.filter((r) => r.orgId === account.orgId && r.status === 'submitted').length
      : 0,
    documents: isP3mi
      ? state.documents.filter((d) => d.orgId === account.orgId && d.status === 'pending_review').length
      : 0,
    visits: isP3mi
      ? state.visits.filter((v) => v.status === 'proposed' || v.status === 'confirmed').length
      : 0,
    complaints: isP3mi
      ? state.complaints.filter((c) => c.orgId === account.orgId && c.status === 'open').length
      : 0,
  }
}

export function Sidebar() {
  const state = useAppState()
  const account = currentAccount(state)
  const navigate = useNavigate()
  const counts = useBadgeCounts()
  if (!account) return null
  const sections = navForRole(account.role)
  const org = state.organizations.find((o) => o.id === account.orgId)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col bg-radial-brand text-white lg:flex" data-testid="sidebar">
      <div className="px-5 pt-6">
        <Link to="/" className="focus-ring inline-flex rounded-xl">
          <Brand />
        </Link>
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Building2 className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-white">{org?.shortName ?? 'Workspace'}</p>
              <p className="truncate text-[10px] text-white/50">
                {org?.city ?? '—'} · {org?.plan ?? 'Pilot'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="no-scrollbar mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section, sIndex) => (
          <div key={section.label ?? sIndex} className="mb-4">
            {section.label ? (
              <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                {section.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const badge = item.badge ? counts[item.badge] : 0
                if (item.cta) {
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="focus-ring mb-2 flex h-10 items-center gap-2 rounded-xl bg-accent px-3 text-xs font-extrabold text-brand-deep transition-colors hover:bg-[#f0b45c]"
                      data-testid={`sidebar-nav-${item.to.replace('/', '-')}`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  )
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'focus-ring group relative flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-semibold transition-colors',
                        isActive
                          ? 'bg-white/[0.09] text-white'
                          : 'text-white/60 hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
                        ) : null}
                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent' : 'text-white/50')} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {badge > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-extrabold text-brand-deep">
                            {badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
          <p className="text-[9px] leading-3 text-white/50">
            <span className="font-bold text-white/70">MODE DEMO</span> · data sintetis, bukan data CPMI asli
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
          <Avatar name={account.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-white">{account.name}</p>
            <p className="truncate text-[10px] text-white/45">{ROLE_LABELS[account.role]}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            data-testid="sidebar-logout-btn"
            aria-label="Keluar"
            title="Keluar"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            resetDemo()
            navigate('/login')
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] text-white/40 hover:bg-white/5 hover:text-white/70"
        >
          <RefreshCw className="h-3 w-3" />
          Reset data demo
        </button>
        <div className="mt-2 flex items-center gap-1.5 px-2.5 text-[9px] text-white/30">
          <ShieldCheck className="h-3 w-3" />
          RLS-ready · bucket privat · audit trail
        </div>
      </div>
    </aside>
  )
}
