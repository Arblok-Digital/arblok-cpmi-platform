import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Info,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { markAllNotificationsRead, markNotificationRead, myNotifications, unreadCount } from '@/lib/store'
import { formatRelative } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'unread' | 'action'

const kindStyles = {
  info: { icon: <Info className="h-4 w-4 text-sky-600" />, tone: 'info' as const, label: 'Info' },
  action: { icon: <Bell className="h-4 w-4 text-amber-600" />, tone: 'warning' as const, label: 'Tindakan' },
  success: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, tone: 'success' as const, label: 'Selesai' },
  warning: { icon: <TriangleAlert className="h-4 w-4 text-red-600" />, tone: 'danger' as const, label: 'Penting' },
}

export function NotificationsPage() {
  const { state, account } = useSession()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')

  if (!account) return null
  const notifications = myNotifications(state, account.id)
  const unread = unreadCount(state, account.id)
  const actionCount = notifications.filter((n) => n.kind === 'action' && !n.readAt).length

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.readAt
    if (tab === 'action') return n.kind === 'action'
    return true
  })

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Kotak masuk"
        title="Notifikasi"
        description="Pembaruan referral, dokumen, jadwal, fee, dan pengaduan untuk akun Anda."
        meta={
          <>
            <Badge tone={unread ? 'warning' : 'success'} icon={<Bell className="h-3 w-3" />}>
              {unread} belum dibaca
            </Badge>
            {actionCount ? <Badge tone="accent">{actionCount} perlu tindakan</Badge> : null}
          </>
        }
        actions={
          <Button
            variant="secondary"
            icon={<CheckCheck className="h-4 w-4" />}
            disabled={unread === 0}
            onClick={() => markAllNotificationsRead()}
          >
            Tandai semua dibaca
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-3">
          <Tabs
            tabs={[
              { id: 'all', label: 'Semua', count: notifications.length },
              { id: 'unread', label: 'Belum dibaca', count: unread },
              { id: 'action', label: 'Perlu tindakan', count: actionCount },
            ]}
            value={tab}
            onChange={setTab}
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-5 w-5" />}
              title="Tidak ada notifikasi"
              description={
                tab === 'unread'
                  ? 'Semua notifikasi sudah dibaca.'
                  : 'Notifikasi baru akan muncul di sini.'
              }
            />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {filtered.map((notification) => {
                const style = kindStyles[notification.kind]
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => {
                        markNotificationRead(notification.id)
                        navigate(notification.linkPath)
                      }}
                      className={cn(
                        'focus-ring flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50',
                        !notification.readAt && 'bg-sky-50/40',
                      )}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-line">
                        {style.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'text-[11px] leading-4',
                              notification.readAt ? 'font-semibold text-slate-600' : 'font-bold text-ink',
                            )}
                          >
                            {notification.title}
                          </span>
                          <Badge tone={style.tone}>{style.label}</Badge>
                          {!notification.readAt ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-label="Belum dibaca" />
                          ) : null}
                        </span>
                        <span className="mt-1 block text-[10px] leading-4 text-muted">
                          {notification.body}
                        </span>
                        <span className="mt-1 block text-[9px] text-slate-400">
                          {formatRelative(notification.createdAt)}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoNote tone="info" title="Notifikasi dalam aplikasi" icon={<Wallet className="h-4 w-4" />}>
          Email dan WhatsApp belum terhubung pada demo. Jangan mengandalkan notifikasi aplikasi
          sebagai satu-satunya kanal untuk urusan mendesak.
        </InfoNote>
        <InfoNote tone="warning" title="Waspada tautan palsu">
          Demo tidak mengirim tautan keluar. Pada produksi, verifikasi domain sebelum membuka tautan
          yang mengaku dari P3MI.
        </InfoNote>
      </div>
    </div>
  )
}
