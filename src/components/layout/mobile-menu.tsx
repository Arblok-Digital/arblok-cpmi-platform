import { useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { currentAccount, logout, resetDemo, useAppState } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/misc'
import { navForRole } from './nav'
import { Brand } from './sidebar'

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState()
  const account = currentAccount(state)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open || !account) return null
  const sections = navForRole(account.role)
  const org = state.organizations.find((o) => o.id === account.orgId)

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button
        type="button"
        aria-label="Tutup menu"
        onClick={onClose}
        className="absolute inset-0 bg-brand-deep/60 backdrop-blur-[2px] animate-fade-in"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-radial-brand text-white shadow-float animate-fade-up">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-brand px-5 py-4">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <Avatar name={account.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{account.name}</p>
              <p className="truncate text-[10px] text-white/50">
                {ROLE_LABELS[account.role]} · {org?.shortName}
              </p>
            </div>
            <Link
              to="/notifikasi"
              onClick={onClose}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white"
            >
              Notifikasi
            </Link>
          </div>

          {sections.map((section, index) => (
            <div key={section.label ?? index} className="mt-5">
              {section.label ? (
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                  {section.label}
                </p>
              ) : null}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold',
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-white/65 hover:bg-white/5 hover:text-white',
                          item.cta && 'bg-accent text-brand-deep hover:bg-accent',
                        )
                      }
                      data-testid={`mobile-menu-nav-${item.to.replace('/', '-')}`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <p className="text-[9px] leading-4 text-white/50">
              <span className="font-bold text-white/70">MODE DEMO</span> — data sintetis, bukan data CPMI asli.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                resetDemo()
                onClose()
                navigate('/login')
              }}
              data-testid="mobile-menu-reset-btn"
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/15 text-[10px] font-bold text-white/70 hover:bg-white/5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset demo
            </button>
            <button
              type="button"
              onClick={() => {
                logout()
                onClose()
                navigate('/login')
              }}
              data-testid="mobile-menu-logout-btn"
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-[10px] font-bold text-white hover:bg-white/15"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 pb-3 text-[9px] text-white/30">
            <ShieldCheck className="h-3 w-3" /> RLS-ready · private storage · audit trail
          </p>
        </div>
      </div>
    </div>
  )
}
