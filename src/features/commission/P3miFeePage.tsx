import { useMemo, useState } from 'react'
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileSignature,
  HandCoins,
  ReceiptText,
  SearchX,
  Wallet,
} from 'lucide-react'
import { useSession } from '@/app/session'
import { isP3miRole } from '@/lib/permissions'
import { approveLedger, recordPayment } from '@/lib/store'
import { formatCurrency, formatDate, formatDateTime, percent } from '@/lib/format'
import { InfoNote, PageHeader } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/misc'
import { LedgerBadge } from '@/components/shared/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/form'
import { EmptyState, Progress } from '@/components/ui/misc'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'

type Tab = 'tagihan' | 'pembayaran' | 'perjanjian'
const PAYABLE = ['earned', 'approved', 'due', 'partially_paid']

export function P3miFeePage() {
  const { state, account } = useSession()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('tagihan')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [payOpen, setPayOpen] = useState(false)
  const [agentId, setAgentId] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!account || !isP3miRole(account.role)) return null
  const isAdmin = account.role === 'p3mi_admin'

  const orgLedger = useMemo(
    () =>
      state.ledger
        .filter((l) => l.orgId === account.orgId)
        .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()),
    [state.ledger, account.orgId],
  )
  const orgPayments = useMemo(
    () =>
      state.payments
        .filter((p) => p.orgId === account.orgId)
        .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()),
    [state.payments, account.orgId],
  )
  const agreements = state.commissionAgreements.filter((a) => a.orgId === account.orgId)
  const agents = state.agents.filter((a) => a.orgId === account.orgId)

  const outstanding = orgLedger
    .filter((l) => PAYABLE.includes(l.status))
    .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
  const earned = orgLedger.filter((l) => l.status === 'earned')
  const approved = orgLedger.filter((l) => l.status === 'approved')
  const paidTotal = orgLedger.reduce((sum, l) => sum + l.paidAmount, 0)
  const paidThisMonth = orgPayments
    .filter((p) => {
      const d = new Date(p.paidAt)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, p) => sum + p.amount, 0)

  const filteredLedger = orgLedger.filter((entry) => {
    if (statusFilter !== 'all' && entry.status !== statusFilter) return false
    const term = query.trim().toLowerCase()
    if (!term) return true
    const agent = agents.find((a) => a.id === entry.agentId)
    return `${entry.code} ${entry.label} ${agent?.name ?? ''} ${entry.status}`
      .toLowerCase()
      .includes(term)
  })

  const selectedAgent = agents.find((a) => a.id === agentId)
  const agentPayable = orgLedger
    .filter(
      (l) =>
        l.agentId === agentId &&
        PAYABLE.includes(l.status) &&
        l.amount - l.paidAmount > 0,
    )
    .sort((a, b) => new Date(a.dueAt ?? a.earnedAt).getTime() - new Date(b.dueAt ?? b.earnedAt).getTime())
  const agentOutstanding = agentPayable.reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
  const parsedAmount = Number(amount.replace(/[^\d]/g, '')) || 0
  let remainingPreview = parsedAmount
  const allocationPreview = agentPayable.map((entry) => {
    const take = Math.min(entry.amount - entry.paidAmount, Math.max(0, remainingPreview))
    remainingPreview -= take
    return { entry, take }
  })

  const openPayment = (presetAgent?: string) => {
    setAgentId(presetAgent ?? '')
    setAmount('')
    setReference('')
    setPaidDate(new Date().toISOString().slice(0, 10))
    setError(null)
    setPayOpen(true)
  }

  const submitPayment = () => {
    setError(null)
    if (!agentId) {
      setError('Pilih agen terlebih dahulu.')
      return
    }
    if (!parsedAmount) {
      setError('Nominal pembayaran wajib diisi.')
      return
    }
    if (parsedAmount > agentOutstanding) {
      setError(`Nominal melebihi outstanding ${formatCurrency(agentOutstanding)}.`)
      return
    }
    if (!paidDate) {
      setError('Tanggal pembayaran wajib diisi.')
      return
    }
    setBusy(true)
    const result = recordPayment(
      agentId,
      parsedAmount,
      reference,
      new Date(`${paidDate}T12:00:00`).toISOString(),
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(
      'Pembayaran dicatat',
      `${formatCurrency(parsedAmount)} dialokasikan ke ${allocationPreview.filter((a) => a.take > 0).length} entri hak tagih.`,
    )
    setPayOpen(false)
  }

  const approve = (entryId: string) => {
    const result = approveLedger(entryId)
    if (!result.ok) {
      toast.error('Gagal menyetujui', result.error)
      return
    }
    toast.success('Hak tagih disetujui', 'Fee kini menunggu pembayaran.')
  }

  return (
    <div className="page-pad">
      <PageHeader
        eyebrow="Komisi & perjanjian"
        title="Perjanjian fee"
        description="Kelola hak tagih agen, persetujuan milestone, dan pembayaran. Setiap perubahan masuk audit trail dan notifikasi agen."
        meta={
          <>
            <Badge tone="brand" icon={<FileSignature className="h-3 w-3" />}>
              {agreements.filter((a) => a.status === 'active').length} perjanjian aktif
            </Badge>
            {!isAdmin ? <Badge tone="warning">Mode baca — reviewer</Badge> : null}
          </>
        }
        actions={
          isAdmin ? (
            <Button
              variant="accent"
              icon={<Banknote className="h-4 w-4" />}
              onClick={() => openPayment()}
            >
              Catat pembayaran
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          hint="Hak tagih belum dibayar penuh"
          icon={<Wallet className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Perlu persetujuan"
          value={earned.length}
          hint={`${formatCurrency(earned.reduce((s, l) => s + l.amount, 0))} menunggu`}
          icon={<Clock3 className="h-5 w-5" />}
          tone={earned.length ? 'warning' : 'success'}
        />
        <StatCard
          label="Siap dibayar"
          value={approved.length}
          hint="Sudah disetujui admin"
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Dibayar bulan ini"
          value={formatCurrency(paidThisMonth)}
          hint={`Total tercatat ${formatCurrency(paidTotal)}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              tabs={[
                { id: 'tagihan', label: 'Hak tagih', count: orgLedger.length },
                { id: 'pembayaran', label: 'Pembayaran', count: orgPayments.length },
                { id: 'perjanjian', label: 'Perjanjian', count: agreements.length },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'tagihan' ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <SearchInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari kode, agen, milestone…"
                  className="sm:w-64"
                  aria-label="Cari hak tagih"
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter status hak tagih"
                  className="sm:w-44"
                >
                  <option value="all">Semua status</option>
                  <option value="earned">Menjadi hak tagih</option>
                  <option value="approved">Disetujui</option>
                  <option value="partially_paid">Dibayar sebagian</option>
                  <option value="paid">Dibayar</option>
                  <option value="due">Jatuh tempo</option>
                </Select>
              </div>
            ) : null}
          </div>

          {tab === 'tagihan' ? (
            filteredLedger.length === 0 ? (
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title="Tidak ada hak tagih"
                description="Hak tagih dibuat otomatis saat kandidat mencapai milestone (serah terima, berangkat, bekerja)."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-2.5">Entri</th>
                      <th className="px-4 py-2.5">Agen</th>
                      <th className="px-4 py-2.5">Nilai</th>
                      <th className="px-4 py-2.5">Jatuh tempo</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map((entry) => {
                      const agent = agents.find((a) => a.id === entry.agentId)
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/70">
                          <td className="table-cell">
                            <p className="font-semibold text-ink">{entry.code}</p>
                            <p className="mt-0.5 text-[10px] text-muted">{entry.label}</p>
                          </td>
                          <td className="table-cell">
                            <p className="font-semibold text-slate-700">{agent?.name ?? '—'}</p>
                            <p className="text-[10px] text-muted">{agent?.code}</p>
                          </td>
                          <td className="table-cell">
                            <p className="font-extrabold text-ink">{formatCurrency(entry.amount)}</p>
                            {entry.paidAmount > 0 ? (
                              <div className="mt-1 w-24">
                                <Progress
                                  value={percent(entry.paidAmount, entry.amount)}
                                  tone="accent"
                                />
                                <p className="mt-1 text-[9px] text-muted">
                                  {formatCurrency(entry.paidAmount)} dibayar
                                </p>
                              </div>
                            ) : null}
                          </td>
                          <td className="table-cell text-[10px] text-muted">
                            {formatDate(entry.dueAt)}
                          </td>
                          <td className="table-cell">
                            <LedgerBadge status={entry.status} />
                          </td>
                          <td className="table-cell">
                            <div className="flex justify-end gap-1.5">
                              {isAdmin && entry.status === 'earned' ? (
                                <Button size="sm" variant="success" onClick={() => approve(entry.id)}>
                                  Setujui
                                </Button>
                              ) : null}
                              {isAdmin &&
                              ['approved', 'due', 'partially_paid'].includes(entry.status) ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openPayment(entry.agentId)}
                                >
                                  Bayar
                                </Button>
                              ) : null}
                              {!isAdmin || entry.status === 'paid' ? (
                                <span className="text-[10px] text-muted">
                                  {entry.status === 'paid' ? 'Selesai' : 'Menunggu admin'}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === 'pembayaran' ? (
            orgPayments.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="h-5 w-5" />}
                title="Belum ada pembayaran"
                description="Catat pembayaran untuk mengalokasikan dana ke hak tagih agen secara FIFO."
              />
            ) : (
              <ul className="space-y-2.5">
                {orgPayments.map((payment) => {
                  const agent = agents.find((a) => a.id === payment.agentId)
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
              icon={<FileSignature className="h-5 w-5" />}
              title="Belum ada perjanjian"
              description="Buat perjanjian komisi sebelum merekrut agen. Skema harus jelas dan disetujui kedua pihak."
            />
          ) : (
            <div className="space-y-3">
              {agreements.map((agreement) => {
                const agent = agents.find((a) => a.id === agreement.agentId)
                return (
                  <div key={agreement.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-ink">{agreement.agreementNumber}</p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {agent?.name ?? 'Agen'} · {agreement.agreementType === 'tiered' ? 'Bertingkat' : 'Tetap'} ·{' '}
                          {formatDate(agreement.validFrom)} — {formatDate(agreement.validUntil)}
                        </p>
                      </div>
                      <Badge
                        tone={
                          agreement.status === 'active'
                            ? 'success'
                            : agreement.status === 'draft'
                              ? 'warning'
                              : 'muted'
                        }
                        dot
                      >
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

      <div className="mt-4">
        <InfoNote tone="warning" title="Kontrol empat mata">
          Reviewer P3MI dapat melihat data fee tetapi tidak dapat menyetujui atau mencatat
          pembayaran. Aksi admin selalu tercatat pada audit trail. Pada demo, bukti transfer tidak
          disimpan.
        </InfoNote>
      </div>

      <Dialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Catat pembayaran agen"
        description="Dana dialokasikan otomatis ke hak tagih paling lama (FIFO). Kelebihan nominal ditolak."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>
              Batal
            </Button>
            <Button loading={busy} icon={<HandCoins className="h-4 w-4" />} onClick={submitPayment}>
              Catat pembayaran
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Agen penerima" htmlFor="pay-agent" required>
              <Select id="pay-agent" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">Pilih agen…</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} — {agent.code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Nominal (IDR)"
              htmlFor="pay-amount"
              required
              hint={
                selectedAgent
                  ? `Outstanding ${formatCurrency(agentOutstanding)}`
                  : 'Pilih agen untuk melihat outstanding.'
              }
            >
              <Input
                id="pay-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Referensi pembayaran" htmlFor="pay-ref" hint="Opsional — dibuat otomatis bila kosong.">
              <Input
                id="pay-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Mis. TRF-2026-0012"
              />
            </Field>
            <Field label="Tanggal bayar" htmlFor="pay-date" required>
              <Input
                id="pay-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </Field>
          </div>

          {selectedAgent ? (
            <div className="rounded-xl border border-line">
              <div className="border-b border-line bg-slate-50 px-3.5 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Alokasi otomatis (FIFO)
                </p>
              </div>
              <ul className="divide-y divide-line">
                {allocationPreview.length === 0 ? (
                  <li className="px-3.5 py-4 text-center text-[11px] text-muted">
                    Tidak ada hak tagih yang dapat dibayar.
                  </li>
                ) : (
                  allocationPreview.map(({ entry, take }) => (
                    <li key={entry.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-ink">{entry.code}</p>
                        <p className="truncate text-[9px] text-muted">{entry.label}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-bold text-slate-700">{formatCurrency(take)}</p>
                        <p className="text-[9px] text-muted">
                          dari {formatCurrency(entry.amount - entry.paidAmount)}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              {remainingPreview > 0 && allocationPreview.length > 0 ? (
                <p className="border-t border-line bg-amber-50 px-3.5 py-2 text-[10px] font-semibold text-amber-800">
                  Sisa {formatCurrency(remainingPreview)} tidak teralokasi dan akan ditolak.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  )
}
