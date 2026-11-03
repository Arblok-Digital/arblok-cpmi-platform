import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Handshake,
  Inbox,
  ReceiptText,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole, visibleCandidates } from '@/lib/permissions'
import { activeCandidates, groupCounts, p3miActions } from '@/lib/insights'
import {
  formatCurrency,
  formatDate,
  formatRelative,
  formatTime,
  isToday,
  percent,
} from '@/lib/format'
import { PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { MiniBar } from '@/components/shared/misc'
import { EmptyState } from '@/components/ui/misc'
import { ReferralBadge, VisitBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'

function medianResponseHours(referrals: { submittedAt?: string; acceptedAt?: string }[]) {
  const values = referrals
    .filter((r) => r.submittedAt && r.acceptedAt)
    .map((r) => (new Date(r.acceptedAt!).getTime() - new Date(r.submittedAt!).getTime()) / 3600000)
    .filter((v) => v >= 0)
    .sort((a, b) => a - b)
  if (values.length === 0) return null
  const mid = Math.floor(values.length / 2)
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]
}

export function P3miDashboard() {
  const { state, account } = useSession()
  if (!account || !isP3miRole(account.role)) return null
  const orgId = account.orgId
  const candidates = visibleCandidates(state, account)
  const active = activeCandidates(candidates)
  const referrals = state.referrals.filter((r) => r.orgId === orgId)
  const newReferrals = referrals.filter((r) => r.status === 'submitted')
  const pendingDocs = state.documents.filter(
    (d) => d.orgId === orgId && d.status === 'pending_review',
  )
  const proposedVisits = state.visits.filter((v) => v.status === 'proposed')
  const handoverRequests = state.handovers.filter((h) => h.status === 'requested')
  const openComplaints = state.complaints.filter((c) => c.orgId === orgId && c.status === 'open')
  const actions = p3miActions(state, account)
  const isAdmin = account.role === 'p3mi_admin'
  const outstanding = state.ledger
    .filter(
      (l) => l.orgId === orgId && ['earned', 'approved', 'due', 'partially_paid'].includes(l.status),
    )
    .reduce((s, l) => s + (l.amount - l.paidAmount), 0)
  const approvalQueue = state.ledger.filter((l) => l.orgId === orgId && l.status === 'earned')
  const monthNow = new Date().getMonth()
  const referralsThisMonth = referrals.filter(
    (r) => r.submittedAt && new Date(r.submittedAt).getMonth() === monthNow,
  )
  const median = medianResponseHours(referrals)
  const recentReferrals = [...referrals]
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())
    .slice(0, 5)
  const todayVisits = state.visits
    .filter((v) => (v.status === 'confirmed' || v.status === 'proposed') && isToday(v.scheduledAt))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  const pipeline = groupCounts(active)
  const audited = [...state.auditEvents]
    .filter((e) => e.orgId === orgId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const queue = [
    {
      to: '/p3mi/referral',
      label: 'Referral baru',
      value: newReferrals.length,
      hint: 'menunggu respons',
      icon: <Inbox className="h-4 w-4" />,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      to: '/p3mi/dokumen',
      label: 'Dokumen review',
      value: pendingDocs.length,
      hint: 'menunggu pemeriksaan',
      icon: <FileCheck2 className="h-4 w-4" />,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      to: '/p3mi/kunjungan',
      label: 'Kunjungan',
      value: proposedVisits.length,
      hint: 'perlu konfirmasi',
      icon: <CalendarDays className="h-4 w-4" />,
      tone: 'bg-brand-soft text-brand',
    },
    {
      to: '/p3mi/kunjungan',
      label: 'Serah terima',
      value: handoverRequests.length,
      hint: 'menunggu diterima',
      icon: <Handshake className="h-4 w-4" />,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    ...(isAdmin
      ? [
          {
            to: '/p3mi/fee',
            label: 'Fee earned',
            value: approvalQueue.length,
            hint: 'perlu persetujuan',
            icon: <ReceiptText className="h-4 w-4" />,
            tone: 'bg-violet-50 text-violet-700',
          },
        ]
      : []),
    {
      to: '/p3mi/pengaduan',
      label: 'Pengaduan',
      value: openComplaints.length,
      hint: 'belum ditindaklanjuti',
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: 'bg-red-50 text-red-700',
    },
  ]

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow={`${formatDate(new Date().toISOString())} · ${account.role === 'p3mi_admin' ? 'Admin P3MI' : 'Reviewer P3MI'}`}
        title={`Ringkasan operasional`}
        description="Antrian tindakan, pipeline, dan aktivitas tenant. Status di sini adalah catatan operasional P3MI — bukan data resmi sistem pemerintah."
        actions={
          <>
            <LinkButton to="/p3mi/referral" variant="secondary" icon={<Inbox className="h-4 w-4" />}>
              Referral masuk
            </LinkButton>
            <LinkButton to="/p3mi/dokumen" variant="accent" icon={<FileCheck2 className="h-4 w-4" />}>
              Periksa dokumen
            </LinkButton>
          </>
        }
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
            <ShieldCheck className="h-3 w-3" /> Tenant isolation aktif · {active.length} kandidat aktif
          </span>
        }
      />

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {queue.map((tile) => (
          <Link
            key={tile.label}
            to={tile.to}
            className="card card-hover focus-ring flex items-start gap-2.5 p-3.5"
          >
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tile.tone)}>
              {tile.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-extrabold leading-6 text-ink">{tile.value}</span>
              <span className="block truncate text-[10px] font-bold text-slate-700">{tile.label}</span>
              <span className="block truncate text-[9px] text-muted">{tile.hint}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Kandidat aktif"
          value={active.length}
          hint={`${candidates.length} total kandidat di tenant`}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
          to="/p3mi/kandidat"
        />
        <StatCard
          label="Referral bulan ini"
          value={referralsThisMonth.length}
          hint={`${percent(referrals.filter((r) => r.status === 'accepted').length, referrals.length)}% referral diterima`}
          icon={<Inbox className="h-5 w-5" />}
          tone="accent"
          to="/p3mi/referral"
        />
        <StatCard
          label="Median respons"
          value={median ? `${median.toFixed(1)} jam` : '—'}
          hint="Dari submitted ke accepted (data demo)"
          icon={<Clock3 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={isAdmin ? 'Fee outstanding' : 'Kunjungan hari ini'}
          value={isAdmin ? formatCurrency(outstanding) : todayVisits.length}
          hint={
            isAdmin
              ? `${approvalQueue.length} menunggu persetujuan`
              : `${proposedVisits.length} jadwal perlu konfirmasi`
          }
          icon={isAdmin ? <ReceiptText className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
          tone={isAdmin ? 'warning' : 'slate'}
          to={isAdmin ? '/p3mi/fee' : '/p3mi/kunjungan'}
        />
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Antrian tindakan"
              description="Diurutkan dari yang paling baru. Setiap aksi sensitif meminta alasan."
              icon={<Inbox className="h-4 w-4" />}
              action={
                <Link to="/p3mi/laporan" className="text-[10px] font-bold text-brand hover:underline">
                  Lihat KPI
                </Link>
              }
            />
            <CardContent className="pt-1">
              {actions.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  title="Antrian bersih"
                  description="Semua referral, dokumen, dan permintaan sudah ditindaklanjuti."
                  compact
                />
              ) : (
                <ul className="divide-y divide-line">
                  {actions.slice(0, 6).map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.href}
                        className="focus-ring group flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-slate-50"
                      >
                        <span
                          className={cn(
                            'flex h-2 w-2 shrink-0 rounded-full',
                            item.tone === 'danger'
                              ? 'bg-red-500'
                              : item.tone === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-sky-500',
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-bold text-ink group-hover:text-brand">
                            {item.title}
                          </span>
                          <span className="block truncate text-[10px] text-muted">{item.detail}</span>
                        </span>
                        <span className="shrink-0 text-[9px] text-muted">{formatRelative(item.at)}</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Referral terbaru"
              description="Kode referral, agen sumber, dan status keputusan."
              action={
                <Link to="/p3mi/referral" className="text-[10px] font-bold text-brand hover:underline">
                  Semua referral
                </Link>
              }
              icon={<Inbox className="h-4 w-4" />}
            />
            <CardContent className="px-0 pb-2 pt-2 sm:px-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-2 font-bold sm:px-5">Kandidat</th>
                      <th className="px-3 py-2 font-bold">Agen</th>
                      <th className="px-3 py-2 font-bold">Kode</th>
                      <th className="px-3 py-2 font-bold">Status</th>
                      <th className="px-3 py-2 font-bold">Masuk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReferrals.map((referral) => {
                      const candidate = state.candidates.find((c) => c.id === referral.candidateId)
                      const agent = state.agents.find((a) => a.id === referral.agentId)
                      return (
                        <tr key={referral.id} className="hover:bg-slate-50/70">
                          <td className="table-cell px-4 sm:px-5">
                            <Link
                              to={`/p3mi/referral/${referral.id}`}
                              className="text-xs font-bold text-ink hover:text-brand"
                            >
                              {candidate?.fullName}
                            </Link>
                            {referral.duplicateWarning ? (
                              <span className="ml-1.5 inline-flex rounded bg-red-50 px-1.5 py-0.5 text-[8px] font-bold text-red-700">
                                DUPLIKAT
                              </span>
                            ) : null}
                            <p className="text-[10px] text-muted">{candidate?.candidateCode}</p>
                          </td>
                          <td className="table-cell px-3 text-[11px] text-slate-600">{agent?.name}</td>
                          <td className="table-cell px-3 font-mono text-[10px] text-muted">{referral.code}</td>
                          <td className="table-cell px-3">
                            <ReferralBadge status={referral.status} />
                          </td>
                          <td className="table-cell px-3 text-[10px] text-muted">
                            {formatRelative(referral.submittedAt)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Pipeline penempatan"
              description="Kandidat aktif per kelompok status."
              icon={<Users className="h-4 w-4" />}
              action={
                <Link to="/p3mi/pipeline" className="text-[10px] font-bold text-brand hover:underline">
                  Buka board
                </Link>
              }
            />
            <CardContent className="pt-3">
              <MiniBar data={pipeline.map((p) => ({ label: p.label, value: p.value }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Hari ini"
              description="Kunjungan terjadwal di kantor P3MI."
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <CardContent className="space-y-2 pt-2">
              {todayVisits.length === 0 ? (
                <p className="py-5 text-center text-xs text-muted">Tidak ada kunjungan hari ini.</p>
              ) : (
                todayVisits.map((visit) => {
                  const candidate = state.candidates.find((c) => c.id === visit.candidateId)
                  return (
                    <Link
                      key={visit.id}
                      to={`/p3mi/kandidat/${visit.candidateId}`}
                      className="flex items-start justify-between gap-2 rounded-xl border border-line p-2.5 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-ink">{candidate?.fullName}</p>
                        <p className="text-[10px] text-muted">
                          {formatTime(visit.scheduledAt)} · {visit.locationLabel}
                        </p>
                      </div>
                      <VisitBadge status={visit.status} />
                    </Link>
                  )
                })
              )}
              <Link
                to="/p3mi/kunjungan"
                className="inline-flex items-center gap-1 pt-1 text-[10px] font-bold text-brand hover:underline"
              >
                Kelola jadwal <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Audit terbaru"
              description="Aksi kritis tercatat otomatis."
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <CardContent className="space-y-2.5 pt-2">
              {audited.map((event) => (
                <div key={event.id} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/40" />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold text-slate-700">
                      {event.action.replace(/\./g, ' · ')}
                    </p>
                    <p className="truncate text-[9px] text-muted">
                      {event.actorName} · {formatRelative(event.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <Link
                to="/p3mi/pengaturan"
                className="inline-flex items-center gap-1 pt-1 text-[10px] font-bold text-brand hover:underline"
              >
                Kebijakan & keamanan <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
