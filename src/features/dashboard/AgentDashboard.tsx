import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileWarning,
  Handshake,
  MapPin,
  Plus,
  Users,
  Wallet,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { visibleCandidates, visibleLedger, visibleReferrals } from '@/lib/permissions'
import { activeCandidates, agentActions, groupCounts, outstandingTotal } from '@/lib/insights'
import { formatCurrency, formatDateLong, formatRelative, formatTime, isToday } from '@/lib/format'
import { STATUS_META } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { MiniBar } from '@/components/shared/misc'
import { VisitBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import type { ActionKind } from '@/lib/insights'

const actionIcon: Record<ActionKind, React.ReactNode> = {
  referral: <ClipboardList className="h-4 w-4" />,
  document: <FileWarning className="h-4 w-4" />,
  visit: <CalendarDays className="h-4 w-4" />,
  handover: <Handshake className="h-4 w-4" />,
  fee: <Wallet className="h-4 w-4" />,
  complaint: <ClipboardList className="h-4 w-4" />,
  schedule: <CalendarDays className="h-4 w-4" />,
  consent: <FileWarning className="h-4 w-4" />,
}

const actionTone = {
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-sky-50 text-sky-700',
  danger: 'bg-red-50 text-red-700',
  success: 'bg-emerald-50 text-emerald-700',
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('id-ID', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(
      new Date(),
    ),
  )
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}

export function AgentDashboard() {
  const { state, account } = useSession()
  if (!account) return null
  const candidates = visibleCandidates(state, account)
  const referrals = visibleReferrals(state, account)
  const ledger = visibleLedger(state, account)
  const actions = agentActions(state, account)
  const active = activeCandidates(candidates)
  const outstanding = outstandingTotal(state, account)
  const paid = ledger.filter((l) => l.status === 'paid').reduce((s, l) => s + l.amount, 0)
  const isCoordinator = account.role === 'agent_coordinator'

  const myCandidateIds = new Set(candidates.map((c) => c.id))
  const recent = state.statusEvents
    .filter((e) => myCandidateIds.has(e.candidateId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const upcoming = state.visits
    .filter(
      (v) =>
        myCandidateIds.has(v.candidateId) &&
        (v.status === 'proposed' || v.status === 'confirmed') &&
        new Date(v.scheduledAt).getTime() > Date.now() - 3600000,
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3)

  const pipeline = groupCounts(active)
  const networkAgents = state.agents.filter((a) => a.coordinatorId === account.agentId)
  const accepted = referrals.filter((r) => r.status === 'accepted').length
  const waiting = referrals.filter((r) => r.status === 'submitted').length

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow={formatDateLong(new Date().toISOString())}
        title={`${greeting()}, ${account.name.split(' ')[0]}`}
        description={
          isCoordinator
            ? `Ringkasan jaringan ${account.name} — ${networkAgents.length} agen aktif di bawah koordinasi Anda.`
            : 'Fokus hari ini: tindak lanjuti kandidat, lengkapi jadwal, dan pantau hak komisi Anda.'
        }
        actions={
          <LinkButton
            to="/agen/referral/baru"
            size="md"
            variant="accent"
            className="w-full sm:w-auto"
            icon={<Plus className="h-4 w-4" />}
          >
            Daftarkan kandidat
          </LinkButton>
        }
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted">
            <MapPin className="h-3 w-3" /> {account.title}
            <span className="text-slate-300">·</span> Kode agen{' '}
            {state.agents.find((a) => a.id === account.agentId)?.code ?? '—'}
          </span>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Kandidat aktif"
          value={active.length}
          hint={`${accepted} referral diterima P3MI`}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
          to="/agen/kandidat"
        />
        <StatCard
          label="Perlu tindakan"
          value={actions.length}
          hint={actions.length ? actions[0]?.title : 'Tidak ada tugas mendesak'}
          icon={<ClipboardList className="h-5 w-5" />}
          tone={actions.length ? 'warning' : 'success'}
        />
        <StatCard
          label="Komisi menunggu"
          value={formatCurrency(outstanding)}
          hint={`${formatCurrency(paid)} sudah dibayar`}
          icon={<Wallet className="h-5 w-5" />}
          tone="accent"
          to="/agen/komisi"
        />
        <StatCard
          label={isCoordinator ? 'Jaringan agen' : 'Menunggu P3MI'}
          value={isCoordinator ? networkAgents.length + 1 : waiting}
          hint={
            isCoordinator
              ? `${networkAgents.filter((a) => a.status === 'active').length} aktif · ${
                  state.agents.filter((a) => a.coordinatorId === account.agentId && a.status === 'pending').length
                } pending`
              : 'Referral belum diputuskan'
          }
          icon={isCoordinator ? <Users className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
          tone="slate"
          to={isCoordinator ? '/agen/jaringan' : '/agen/kandidat'}
        />
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Perlu tindakan"
              description="Langkah berikutnya untuk kandidat Anda. Tidak ada tombol yang mengubah status P3MI."
              icon={<ClipboardList className="h-4 w-4" />}
              action={
                actions.length > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                    {actions.length} tugas
                  </span>
                ) : null
              }
            />
            <CardContent className="pt-2">
              {actions.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  title="Semua beres"
                  description="Tidak ada tindakan mendesak. Anda bisa memantau status kandidat yang sedang diproses P3MI."
                  compact
                />
              ) : (
                <ul className="divide-y divide-line">
                  {actions.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.href}
                        className="focus-ring group flex items-start gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-slate-50"
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            actionTone[item.tone],
                          )}
                        >
                          {actionIcon[item.kind]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-ink group-hover:text-brand">
                            {item.title}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-5 text-muted">
                            {item.detail}
                          </span>
                        </span>
                        <span className="mt-1 flex shrink-0 items-center gap-1 text-[9px] text-muted">
                          {formatRelative(item.at)}
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader
                title="Jadwal terdekat"
                description="Kunjungan kandidat ke kantor P3MI."
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <CardContent className="space-y-3 pt-2">
                {upcoming.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Belum ada jadwal mendatang.</p>
                ) : (
                  upcoming.map((visit) => {
                    const candidate = state.candidates.find((c) => c.id === visit.candidateId)
                    return (
                      <Link
                        key={visit.id}
                        to={`/agen/kandidat/${visit.candidateId}`}
                        className="block rounded-xl border border-line p-3 hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-ink">{candidate?.fullName}</p>
                            <p className="mt-0.5 text-[10px] text-muted">
                              {formatTime(visit.scheduledAt)} · {visit.locationLabel}
                            </p>
                          </div>
                          <VisitBadge status={visit.status} />
                        </div>
                        {isToday(visit.scheduledAt) ? (
                          <p className="mt-2 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-bold text-amber-800">
                            Hari ini
                          </p>
                        ) : null}
                      </Link>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title="Pipeline kandidat"
                description="Sebaran status yang sedang berjalan."
                icon={<ClipboardList className="h-4 w-4" />}
              />
              <CardContent className="pt-3">
                <MiniBar data={pipeline.map((p) => ({ label: p.label, value: p.value }))} />
                <Link
                  to="/agen/kandidat"
                  className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline"
                >
                  Lihat semua kandidat <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Aktivitas terbaru"
              description="Status terbaru yang dicatat P3MI."
              icon={<Clock3 className="h-4 w-4" />}
            />
            <CardContent className="pt-2">
              {recent.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">Belum ada aktivitas.</p>
              ) : (
                <ol className="relative">
                  {recent.map((event, index) => {
                    const candidate = state.candidates.find((c) => c.id === event.candidateId)
                    return (
                      <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {index < recent.length - 1 ? (
                          <span className="absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px bg-line" />
                        ) : null}
                        <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold leading-4 text-ink">
                            {candidate?.fullName}{' '}
                            <span className="font-medium text-muted">→</span>{' '}
                            {STATUS_META[candidate?.status ?? 'lead_registered'].label}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {formatRelative(event.createdAt)} · {event.actorName}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-radial-brand text-white">
            <CardContent className="relative p-5">
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                  Pengingat kepatuhan
                </p>
                <p className="mt-2 text-sm font-bold leading-5">
                  Anda mencatat referral — P3MI memutuskan proses penempatan.
                </p>
                <p className="mt-2 text-[10px] leading-5 text-white/60">
                  Jangan menjanjikan lowongan, visa, atau komisi sebelum ada konfirmasi tertulis.
                  Status di aplikasi adalah catatan operasional P3MI, bukan data resmi pemerintah.
                </p>
                <Link
                  to="/agen/bantuan"
                  className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-accent hover:underline"
                >
                  Baca panduan agen <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
