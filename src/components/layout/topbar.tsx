import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  ShieldAlert,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { currentAccount, logout, markAllNotificationsRead, markNotificationRead, unreadCount, useAppState } from '@/lib/store'
import { formatRelative } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/misc'
import { pageTitle } from './nav'

const kindDot: Record<string, string> = {
  info: 'bg-sky-500',
  action: 'bg-amber-500',
  success: 'bg-emerald-500',
  warning: 'bg-red-500',
}

export function Topbar() {
  const state = useAppState()
  const account = currentAccount(state)
  const location = useLocation()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNotifOpen(false)
    setUserOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!account) return null
  const notifications = state.notifications
    .filter((n) => n.userId === account.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const unread = unreadCount(state, account.id)
  const org = state.organizations.find((o) => o.id === account.orgId)
  const title = pageTitle(location.pathname, account.role)
  const accountPath =
    account.role === 'agent' || account.role === 'agent_coordinator'
      ? '/agen/akun'
      : account.role === 'cpmi'
        ? '/cpmi/data'
        : account.role === 'arblok_admin'
          ? '/platform/konfigurasi'
          : '/p3mi/pengaturan'

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 lg:hidden" aria-label="ARBLOK CPMI">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-accent">
            A
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="hidden text-[10px] font-medium text-muted lg:block">
            {org?.shortName ?? 'Workspace'} <span className="mx-1 text-slate-300">/</span> {title}
          </p>
          <h2 className="truncate text-sm font-bold text-ink lg:hidden">{title}</h2>
          <p className="hidden truncate text-sm font-bold text-ink lg:block">{title}</p>
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-amber-800 sm:flex">
          <Sparkles className="h-3 w-3" />
          Mode demo · data sintetis
        </div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v)
              setUserOpen(false)
            }}
            aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}
            aria-expanded={notifOpen}
            data-testid="topbar-notif-btn"
            className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-slate-600 hover:border-slate-300 hover:text-brand"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-canvas bg-red-600 px-1 text-[9px] font-extrabold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>

          {notifOpen ? (
            <div className="fixed inset-x-3 top-[60px] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-float animate-fade-up sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[368px]">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-ink">Notifikasi</p>
                  <p className="text-[10px] text-muted">{unread} belum dibaca</p>
                </div>
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead()}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-brand hover:bg-brand-soft disabled:text-slate-400"
                  disabled={unread === 0}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tandai semua
                </button>
              </div>
              <div className="max-h-[340px] overflow-y-auto">
                {notifications.slice(0, 6).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id)
                      setNotifOpen(false)
                      navigate(n.linkPath)
                    }}
                    className={cn(
                      'flex w-full items-start gap-2.5 border-b border-line/70 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50',
                      !n.readAt && 'bg-sky-50/40',
                    )}
                  >
                    <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', kindDot[n.kind])} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn('text-[11px] leading-4', n.readAt ? 'font-semibold text-slate-600' : 'font-bold text-ink')}>
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[9px] text-muted">{formatRelative(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-muted">{n.body}</span>
                    </span>
                  </button>
                ))}
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-muted">Belum ada notifikasi.</p>
                ) : null}
              </div>
              <Link
                to="/notifikasi"
                onClick={() => setNotifOpen(false)}
                className="flex items-center justify-center gap-1 border-t border-line bg-slate-50 px-4 py-2.5 text-[10px] font-bold text-brand hover:bg-slate-100"
              >
                Lihat semua notifikasi <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : null}
        </div>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => {
              setUserOpen((v) => !v)
              setNotifOpen(false)
            }}
            aria-label="Menu akun"
            aria-expanded={userOpen}
            data-testid="topbar-user-btn"
            className="focus-ring flex items-center gap-1.5 rounded-xl p-0.5 hover:bg-white"
          >
            <Avatar name={account.name} size="sm" />
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted sm:block" />
          </button>
          {userOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-float animate-fade-up">
              <div className="border-b border-line px-4 py-3">
                <p className="text-xs font-bold text-ink">{account.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted">{account.email}</p>
                <span className="mt-2 inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-bold text-brand">
                  {ROLE_LABELS[account.role]}
                </span>
              </div>
              <div className="p-1.5">
                <Link
                  to={accountPath}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <UserRound className="h-4 w-4 text-muted" /> Profil & pengaturan
                </Link>
                <Link
                  to="/notifikasi"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Bell className="h-4 w-4 text-muted" /> Notifikasi
                </Link>
                <Link
                  to={account.role === 'arblok_admin' ? '/platform/audit' : '/p3mi/pengaturan'}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4 text-muted" /> Keamanan & audit
                </Link>
              </div>
              <div className="border-t border-line p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                  data-testid="topbar-logout-btn"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </div>
              <div className="flex items-start gap-1.5 border-t border-line bg-amber-50/70 px-4 py-2.5">
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-700" />
                <p className="text-[9px] leading-3.5 text-amber-800">
                  Demo memakai data sintetis. Jangan gunakan data CPMI asli sebelum telaah privasi selesai.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
