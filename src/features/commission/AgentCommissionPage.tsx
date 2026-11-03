import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  FileText,
  HandCoins,
  Info,
  ReceiptText,
  Wallet,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { visibleLedger } from '@/lib/permissions'
import { outstandingTotal } from '@/lib/insights'
import { formatCurrency, formatDate, formatDateTime, percent } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { LedgerBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, Progress } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'

type Tab = 'tagihan' | 'pembayaran' | 'perjanjian'

export function AgentCommissionPage() {
  const { state, account } = useSession()
  const [tab, setTab] = useState<Tab>('tagihan')
  const [agentFilter, setAgentFilter] = useState('all')

  if (!account) return null
  const isCoordinator = account.role === 'agent_coordinator'
  const network = state.agents.filter((a) => a.coordinatorId === account.agentId)
  const scopeAgents = isCoordinator
    ? state.agents.filter((a) => a.id === account.agentId || network.some((n) => n.id === a.id))
    : state.agents.filter((a) => a.id === account.agentId)
  const scopeIds = new Set(scopeAgents.map((a) => a.id))

  const ledger = useMemo(
    () =>
      visibleLedger(state, account)
        .filter((l) => agentFilter === 'all' || l.agentId === agentFilter)
        .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()),
    [state, account, agentFilter],
  )
  const payments = useMemo(
    () =>
      state.payments
        .filter((p) => p.orgId === account.orgId && scopeIds.has(p.agentId))
        .filter((p) => agentFilter === 'all' || p.agentId === agentFilter)
        .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()),
    [state.payments, account.orgId, agentFilter, scopeIds],
  )

  const totalEarned = ledger.reduce((sum, l) => sum + l.amount, 0)
  const paid = ledger.reduce((sum, l) => sum + l.paidAmount, 0)
  const outstanding = ledger
    .filter((l) => ['earned', 'approved', 'due', 'partially_paid'].includes(l.status))
    .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
  const awaitingApproval = ledger.filter((l) => l.status === 'earned').length
  const agreements = state.commissionAgreements.filter(
    (a) => a.orgId === account.orgId && scopeIds.has(a.agentId),
  )

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow={isCoordinator ? 'Jaringan komisi' : 'Hak komisi'}
        title="Komisi saya"
        description={
          isCoordinator
            ? 'Rekap hak tagih agen dalam jaringan koordinasi Anda. Keputusan dan pembayaran tetap dilakukan admin P3MI.'
            : 'Hak tagih muncul otomatis dari milestone pipeline yang disetujui P3MI. Komisi bukan janji pendapatan sebelum ada verifikasi.'
        }
        meta={
          <>
            <Badge tone="brand" icon={<ReceiptText className="h-3 w-3" />}>
              Skema milestone
            </Badge>
            <Badge tone="warning">Pembayaran diverifikasi P3MI</Badge>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={isCoordinator ? 'Outstanding jaringan' : 'Outstanding'}
          value={formatCurrency(isCoordinator ? outstandingTotal(state, account) : outstanding)}
          hint="Belum dibayar penuh"
          icon={<Wallet className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Sudah dibayar"
          value={formatCurrency(paid)}
          hint={`${payments.length} transaksi tercatat`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Total hak tagih"
          value={formatCurrency(totalEarned)}
          hint={`${ledger.length} entri milestone`}
          icon={<HandCoins className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Menunggu persetujuan"
          value={awaitingApproval}
          hint="Milestone perlu diverifikasi admin"
          icon={<CalendarClock className="h-5 w-5" />}
          tone={awaitingApproval ? 'warning' : 'slate'}
        />
      </div>

      {isCoordinator ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <p className="text-[11px] leading-5 text-slate-600">
                Menampilkan komisi untuk {scopeAgents.length} agen dalam jaringan Anda. Sebagian
                skema mungkin berbeda per agen.
              </p>
            </div>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="focus-ring h-9 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink"
              aria-label="Filter agen"
            >
              <option value="all">Semua agen jaringan</option>
              {scopeAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <Tabs
            tabs={[
              { id: 'tagihan', label: 'Hak tagih', count: ledger.length },
              { id: 'pembayaran', label: 'Pembayaran', count: payments.length },
              { id: 'perjanjian', label: 'Perjanjian', count: agreements.length },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'tagihan' ? (
            ledger.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-5 w-5" />}
                title="Belum ada hak tagih"
                description="Hak tagih dibuat otomatis ketika kandidat mencapai milestone yang disepakati, misalnya serah terima ke pemberi kerja."
              />
            ) : (
              <ul className="space-y-2.5">
                {ledger.map((entry) => {
                  const agent = state.agents.find((a) => a.id === entry.agentId)
                  const referral = state.referrals.find((r) => r.id === entry.referralId)
                  const candidate = referral
                    ? state.candidates.find((c) => c.id === referral.candidateId)
                    : undefined
                  return (
                    <li key={entry.id} className="rounded-xl border border-line p-3.5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold text-ink">{entry.label}</p>
                            <LedgerBadge status={entry.status} />
                          </div>
                          <p className="mt-1 text-[10px] text-muted">
                            {entry.code} · {agent?.name ?? 'Agen'}
                            {candidate ? ` · ${candidate.fullName}` : ''}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            Menjadi hak tagih {formatDate(entry.earnedAt)}
                            {entry.dueAt ? ` · jatuh tempo ${formatDate(entry.dueAt)}` : ''}
                          </p>
                          {entry.paidAmount > 0 && entry.paidAmount < entry.amount ? (
                            <div className="mt-2 max-w-xs">
                              <div className="mb-1 flex justify-between text-[9px] text-muted">
                                <span>Dibayar {formatCurrency(entry.paidAmount)}</span>
                                <span>{percent(entry.paidAmount, entry.amount)}%</span>
                              </div>
                              <Progress value={percent(entry.paidAmount, entry.amount)} tone="accent" />
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-sm font-extrabold text-ink">
                            {formatCurrency(entry.amount - entry.paidAmount)}
                          </p>
                          <p className="text-[9px] text-muted">sisa dari {formatCurrency(entry.amount)}</p>
                          {referral ? (
                            <Link
                              to={
                                account.role === 'cpmi'
                                  ? '/cpmi/perkembangan'
                                  : `/agen/kandidat/${referral.candidateId}`
                              }
                              className="mt-1 inline-flex text-[10px] font-bold text-brand hover:underline"
                            >
                              Lihat kandidat
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          ) : tab === 'pembayaran' ? (
            payments.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="h-5 w-5" />}
                title="Belum ada pembayaran"
                description="Pembayaran yang dicatat admin P3MI akan muncul di sini beserta referensi dan alokasi ke entri hak tagih."
              />
            ) : (
              <ul className="space-y-2.5">
                {payments.map((payment) => {
                  const agent = state.agents.find((a) => a.id === payment.agentId)
                  return (
                    <li key={payment.id} className="rounded-xl border border-line p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-ink">{payment.reference}</p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {agent?.name ?? 'Agen'} · {formatDateTime(payment.paidAt)}
                          </p>
                        </div>
                        <p className="text-sm font-extrabold text-emerald-700">
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {payment.allocations.map((allocation) => {
                          const entry = state.ledger.find((l) => l.id === allocation.ledgerId)
                          return (
                            <span
                              key={allocation.ledgerId}
                              className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600"
                            >
                              {entry?.code ?? allocation.ledgerId} · {formatCurrency(allocation.amount)}
                            </span>
                          )
                        })}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          ) : agreements.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="Perjanjian belum tersedia"
              description="Hubungi admin P3MI untuk informasi skema komisi dan dokumen perjanjian."
            />
          ) : (
            <div className="space-y-3">
              {agreements.map((agreement) => {
                const agent = state.agents.find((a) => a.id === agreement.agentId)
                return (
                  <div key={agreement.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-ink">{agreement.agreementNumber}</p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {agent?.name ?? 'Agen'} · berlaku {formatDate(agreement.validFrom)} —{' '}
                          {formatDate(agreement.validUntil)}
                        </p>
                      </div>
                      <Badge tone={agreement.status === 'active' ? 'success' : 'muted'} dot>
                        {agreement.status === 'active'
                          ? 'Aktif'
                          : agreement.status === 'draft'
                            ? 'Draft'
                            : 'Berakhir'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-slate-600">
                      {agreement.triggerDefinition}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {agreement.milestones.map((milestone) => (
                        <div
                          key={milestone.code}
                          className="rounded-lg border border-line bg-slate-50 px-2.5 py-2"
                        >
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
                            {milestone.code}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-ink">{milestone.label}</p>
                          <p className="mt-0.5 text-[11px] font-extrabold text-brand">
                            {formatCurrency(milestone.amount, milestone.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoNote tone="warning" title="Bukan jaminan penghasilan">
          Hak tagih hanya muncul dari milestone yang tercatat P3MI. Agen tidak boleh menjanjikan
          nominal komisi kepada calon CPMI sebelum perjanjian ditandatangani.
        </InfoNote>
        <InfoNote tone="info" title="Sengketa komisi" icon={<BadgeCheck className="h-4 w-4" />}>
          Bila ada ketidaksesuaian, buka pengaduan kategori komisi melalui Bantuan. Sertakan kode
          entri (contoh KMS-2026-00001) dan bukti milestone.
        </InfoNote>
      </div>
    </div>
  )
}
